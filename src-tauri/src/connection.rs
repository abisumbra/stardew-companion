//! Bundled, opt-in .NET startup hook. Never edits the installed game or live save files.
use crate::{journal, save::parser};
use serde::{Deserialize, Serialize};
#[cfg(target_os = "windows")]
use std::process::Command;
use std::{fs, io::Write, path::Path};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Condition {
    pub source: String,
    pub key: String,
    pub minimum: u64,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Goal {
    pub id: String,
    #[serde(default)]
    pub quest_id: String,
    pub title: String,
    pub description: String,
    pub objective: String,
    pub conditions: Vec<Condition>,
}
pub fn write_plan(
    path: &Path,
    fingerprint: &str,
    farmer_id: &str,
    mut goals: Vec<Goal>,
    root: &Path,
) -> Result<(), String> {
    let profile = parser::read_stable(path)?;
    if profile.fingerprint != fingerprint {
        return Err("The save changed. Rescan before transferring tasks".into());
    }
    if profile.game_version.as_deref() != Some("1.6.15") {
        return Err("Live connection currently supports Stardew Valley 1.6.15 only".into());
    }
    if !profile.players.iter().any(|f| f.id == farmer_id) {
        return Err("Selected farmer is not in this save".into());
    }
    validate_goals(&goals)?;
    for goal in &mut goals {
        goal.quest_id = format!(
            "StardewCompanion:{}",
            &journal::hash(format!("{farmer_id}:{}", goal.id).as_bytes())[..32]
        );
    }
    let directory = root.join("plans");
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let name = journal::hash(format!("{}:{farmer_id}", profile.id).as_bytes());
    let revision = journal::hash(&serde_json::to_vec(&goals).map_err(|e| e.to_string())?);
    let value = serde_json::json!({"version":1,"saveId":profile.id,"farmerId":farmer_id,"revision":revision,"goals":goals});
    atomic_write(
        &directory.join(format!("{name}.json")),
        &serde_json::to_vec(&value).map_err(|e| e.to_string())?,
    )
}
pub fn validate_goals(goals: &[Goal]) -> Result<(), String> {
    if goals.len() > 80 {
        return Err("Choose at most 80 live goals".into());
    }
    let mut ids = std::collections::BTreeSet::new();
    for g in goals {
        if g.id.is_empty()
            || g.id.len() > 512
            || !ids.insert(&g.id)
            || g.title.trim().is_empty()
            || g.title.chars().count() > 180
            || g.description.len() > 12000
            || g.objective.len() > 2400
            || g.conditions.is_empty()
            || g.conditions.len() > 256
        {
            return Err("Invalid live goal".into());
        }
        for c in &g.conditions {
            if ![
                "cooked",
                "crafting",
                "fish",
                "shipped",
                "friendship",
                "skill",
                "mail",
                "events",
                "achievements",
                "stats",
            ]
            .contains(&c.source.as_str())
                || c.key.len() > 160
                || c.minimum == 0
                || c.minimum > 1_000_000_000
            {
                return Err("Unsupported live condition".into());
            }
        }
    }
    Ok(())
}
fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let mut temporary =
        tempfile::NamedTempFile::new_in(path.parent().ok_or("Connection directory missing")?)
            .map_err(|e| e.to_string())?;
    temporary.write_all(bytes).map_err(|e| e.to_string())?;
    temporary.as_file().sync_all().map_err(|e| e.to_string())?;
    temporary.persist(path).map_err(|e| e.to_string())?;
    Ok(())
}
pub fn status(root: &Path) -> Result<serde_json::Value, String> {
    let path = root.join("status.json");
    if !path.is_file() {
        return Ok(serde_json::json!({"state":"disconnected"}));
    }
    if fs::metadata(&path).map_err(|e| e.to_string())?.len() > 1_048_576 {
        return Err("Connection status exceeds limit".into());
    }
    let mut value: serde_json::Value =
        serde_json::from_slice(&fs::read(path).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
    if !value.is_object() || value["state"].as_str().is_none() {
        return Err("Invalid connection status".into());
    }
    let stamp = value["updatedAt"].as_u64().unwrap_or(0);
    if parser::now().abs_diff(stamp) > 15 {
        value["state"] = "disconnected".into();
    }
    Ok(value)
}
pub fn request_layout(
    path: &Path,
    fingerprint: &str,
    farmer_id: &str,
    design: serde_json::Value,
    root: &Path,
) -> Result<String, String> {
    let profile = parser::read_stable(path)?;
    if profile.fingerprint != fingerprint {
        return Err("The save changed. Rescan before transferring tasks".into());
    }
    if profile.game_version.as_deref() != Some("1.6.15") || profile.players[0].id != farmer_id {
        return Err("Layout transfer requires the supported host farmer".into());
    }
    if design["layout"] != profile.farm_type {
        return Err("The selected farm type does not match this save".into());
    }
    let current = status(root)?;
    if current["state"] != "active" || current["saveId"] != format!("{}:{farmer_id}", profile.id) {
        return Err(
            "Start the game with Companion and load this farm before transferring a design".into(),
        );
    }
    let raw = design["items"].as_array().ok_or("Invalid farm design")?;
    if raw.len() > 1500 {
        return Err("Design exceeds placement limit".into());
    }
    let mut cells = std::collections::BTreeSet::new();
    let mut identities = std::collections::BTreeSet::new();
    let mut origins = std::collections::BTreeSet::new();
    let mut items = vec![];
    for item in raw {
        if item["kind"] != "object" {
            continue;
        }
        if item["width"] != 1 || item["height"] != 1 {
            return Err("Only one-tile objects support live transfer".into());
        }
        let id = item["itemId"].as_str().ok_or("Missing item identity")?;
        if ["(O)286", "(O)287", "(O)288"].contains(&id) {
            return Err("Explosive items are not supported by farm design transfer".into());
        }
        if id.len() > 160
            || !(id.starts_with("(O)") || id.starts_with("(BC)"))
            || !id
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || "()_.".contains(c))
        {
            return Err("Invalid placement item".into());
        }
        let x = item["x"]
            .as_u64()
            .filter(|n| *n < 256)
            .ok_or("Invalid placement coordinate")?;
        let y = item["y"]
            .as_u64()
            .filter(|n| *n < 256)
            .ok_or("Invalid placement coordinate")?;
        if !cells.insert((x, y)) {
            return Err("Planned placements overlap".into());
        }
        let key = item["id"]
            .as_str()
            .filter(|s| !s.is_empty() && s.len() <= 100)
            .ok_or("Invalid placement identity")?;
        if !identities.insert(key) {
            return Err("Duplicate placement identity".into());
        }
        let recipe = item["recipe"]
            .as_str()
            .map(|s| s.strip_prefix("crafting:").unwrap_or(s));
        if recipe.is_some_and(|s| s.len() > 160) {
            return Err("Invalid recipe identity".into());
        }
        let source = item
            .get("sourceTile")
            .cloned()
            .unwrap_or(serde_json::Value::Null);
        if !source.is_null()
            && !source.as_array().is_some_and(|a| {
                a.len() == 2 && a.iter().all(|v| v.as_u64().is_some_and(|n| n < 256))
            })
        {
            return Err("Invalid original object position".into());
        }
        if source
            .as_array()
            .is_some_and(|a| a[0].as_u64() == Some(x) && a[1].as_u64() == Some(y))
        {
            continue;
        }
        if !source.is_null() && !origins.insert(source.to_string()) {
            return Err("An existing object can only be moved once per transfer".into());
        }
        items.push(serde_json::json!({"id":key,"itemId":id,"recipe":recipe,"x":x,"y":y,"sourceTile":source}));
    }
    if items.is_empty() || items.len() > 500 {
        return Err("Choose between 1 and 500 supported object placements".into());
    }
    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let request_id = journal::hash(
        format!(
            "{}:{nonce}:{}",
            profile.id,
            journal::hash(&serde_json::to_vec(&design).map_err(|e| e.to_string())?)
        )
        .as_bytes(),
    );
    let value = serde_json::json!({"version":1,"requestId":request_id,"saveId":profile.id,"farmerId":farmer_id,"farmType":profile.farm_type,"requestedAt":parser::now(),"sessionId":current["pid"],"items":items});
    atomic_write(
        &root.join("layout-request.json"),
        &serde_json::to_vec(&value).map_err(|e| e.to_string())?,
    )?;
    Ok(request_id)
}
pub fn layout_result(root: &Path) -> Result<serde_json::Value, String> {
    let path = root.join("layout-result.json");
    if !path.exists() {
        return Ok(serde_json::Value::Null);
    }
    if fs::metadata(&path).map_err(|e| e.to_string())?.len() > 1048576 {
        return Err("Layout result exceeds limit".into());
    }
    serde_json::from_slice(&fs::read(path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}
pub fn launch(game: &Path, root: &Path) -> Result<u32, String> {
    journal::ensure_game_closed()?;
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (game, root);
        Err("The bundled live connection is currently Windows-only".into())
    }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let game = crate::artwork::validate_root(game)?;
        let directory = root.join("runtime-v1");
        fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
        for (name, bytes) in [
            (
                "Companion.Bridge.dll",
                &include_bytes!("../../bridge/dist/Companion.Bridge.dll")[..],
            ),
            (
                "0Harmony.dll",
                &include_bytes!("../../bridge/dist/0Harmony.dll")[..],
            ),
        ] {
            let path = directory.join(name);
            if fs::read(&path).ok().as_deref() != Some(bytes) {
                atomic_write(&path, bytes)?;
            }
        }
        // This environment belongs only to the child; neither Windows nor Steam settings change.
        atomic_write(
            &root.join("status.json"),
            &serde_json::to_vec(
                &serde_json::json!({"state":"starting","pid":0,"updatedAt":parser::now()}),
            )
            .map_err(|e| e.to_string())?,
        )?;
        let child = Command::new(game.join("Stardew Valley.exe"))
            .current_dir(&game)
            .env(
                "DOTNET_STARTUP_HOOKS",
                directory.join("Companion.Bridge.dll"),
            )
            .env("STARDEW_COMPANION_DATA", root)
            .env("HARMONY_NO_LOG", "1")
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| format!("Could not start Stardew Valley: {e}"))?;
        Ok(child.id())
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_unmeasurable_or_duplicate_goals() {
        let mut g = Goal {
            id: "shipping:390".into(),
            quest_id: String::new(),
            title: "Ship Stone".into(),
            description: String::new(),
            objective: "Ship Stone".into(),
            conditions: vec![Condition {
                source: "shipped".into(),
                key: "390".into(),
                minimum: 1,
            }],
        };
        assert!(validate_goals(&[g.clone()]).is_ok());
        assert!(validate_goals(&[g.clone(), g.clone()]).is_err());
        g.conditions[0].source = "arbitraryCode".into();
        assert!(validate_goals(&[g]).is_err());
    }
    #[test]
    fn writes_scoped_manifest_without_modifying_save() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("Synthetic");
        let xml = include_bytes!("../tests/fixtures/minimal.xml");
        fs::write(&path, xml).unwrap();
        write_plan(&path, &journal::hash(xml), "123", vec![], dir.path()).unwrap();
        assert_eq!(fs::read(path).unwrap(), xml);
        assert_eq!(fs::read_dir(dir.path().join("plans")).unwrap().count(), 1);
    }
}
