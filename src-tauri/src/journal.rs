//! Explicit, backed-up journal sync. Ordinary save scanning remains read-only.
use crate::save::parser::{MAX_SAVE_BYTES, parse_xml};
use roxmltree::{Document, Node, ParsingOptions};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeSet,
    fs,
    io::{Read, Write},
    path::Path,
    process::Command,
};
const PREFIX: &str = "StardewCompanion:";
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JournalTask {
    pub id: String,
    pub title: String,
    pub description: String,
    pub objective: String,
    #[serde(default)]
    pub tracking: Option<Tracking>,
}
#[derive(Clone, Deserialize)]
#[serde(tag = "mode", rename_all = "camelCase", deny_unknown_fields)]
pub enum Tracking {
    RecipeCrafted {
        #[serde(rename = "itemId")]
        item_id: String,
    },
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Receipt {
    pub backup_id: String,
    pub applied_fingerprint: String,
    pub original_fingerprint: String,
    pub save_id: String,
    pub farmer_id: String,
    pub count: usize,
}
pub fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
fn text<'a>(node: Node<'a, '_>, tag: &str) -> Option<&'a str> {
    node.children()
        .find(|n| n.has_tag_name(tag))
        .and_then(|n| n.text())
}
fn escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
fn valid(s: &str, max: usize) -> bool {
    s.chars().count() <= max && s.chars().all(|c| !c.is_control() || c == '\n' || c == '\t')
}
pub fn patch(xml: &str, farmer_id: &str, tasks: &[JournalTask]) -> Result<String, String> {
    if tasks.len() > 80 {
        return Err("Choose at most 80 journal tasks per transfer".into());
    }
    let mut ids = BTreeSet::new();
    for t in tasks {
        if let Some(Tracking::RecipeCrafted { item_id }) = &t.tracking {
            let key = item_id
                .strip_prefix("(O)")
                .or_else(|| item_id.strip_prefix("(BC)"));
            if !key.is_some_and(|s| {
                !s.is_empty()
                    && s.len() <= 128
                    && s.chars()
                        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '.')
            }) {
                return Err("Invalid recipe tracking item".into());
            }
        }
        if t.id.is_empty()
            || t.title.trim().is_empty()
            || !valid(&t.id, 512)
            || !valid(&t.title, 180)
            || !valid(&t.description, 4000)
            || !valid(&t.objective, 800)
            || !ids.insert(&t.id)
        {
            return Err("Invalid or duplicate journal task".into());
        }
    }
    let profile = parse_xml(xml, Path::new("journal-validation"), 0)?;
    if tasks.iter().any(|t| t.tracking.is_some())
        && !profile
            .game_version
            .as_deref()
            .and_then(|v| v.split('.').nth(2))
            .and_then(|p| p.parse::<u32>().ok())
            .is_some_and(|n| n >= 9)
    {
        return Err("Native recipe tracking requires a 1.6.9 or newer save".into());
    }
    if !profile
        .game_version
        .as_deref()
        .is_some_and(|v| v.starts_with("1.6."))
    {
        return Err("Journal transfer supports Stardew Valley 1.6 saves".into());
    }
    let doc = Document::parse_with_options(
        xml,
        ParsingOptions {
            allow_dtd: false,
            nodes_limit: 2_000_000,
            ..Default::default()
        },
    )
    .map_err(|e| e.to_string())?;
    let root = doc.root_element();
    let farmers: Vec<_> = root
        .descendants()
        .filter(|n| {
            (n.has_tag_name("player") && n.parent() == Some(root))
                || n.has_tag_name("farmhand")
                || (n.has_tag_name("Farmer")
                    && n.parent().is_some_and(|p| p.has_tag_name("farmhands")))
        })
        .filter(|n| text(*n, "UniqueMultiplayerID") == Some(farmer_id))
        .collect();
    if farmers.len() != 1 {
        return Err("The selected farmer could not be identified unambiguously".into());
    }
    let farmer = farmers[0];
    let logs: Vec<_> = farmer
        .children()
        .filter(|n| n.has_tag_name("questLog"))
        .collect();
    if logs.len() > 1 {
        return Err("Ambiguous quest journal".into());
    }
    let mut content = String::new();
    if let Some(log) = logs.first() {
        for child in log.children().filter(|n| n.is_element()) {
            if !text(child, "id").is_some_and(|id| id.starts_with(PREFIX)) {
                content.push_str(&xml[child.range()]);
            }
        }
    }
    for t in tasks {
        let id = format!(
            "{PREFIX}{}",
            &hash(format!("{farmer_id}:{}", t.id).as_bytes())[..32]
        );
        let title = escape(&format!("Companion: {}", t.title));
        let (opening, kind, fields) = match &t.tracking {
            Some(Tracking::RecipeCrafted { item_id }) => (
                "<Quest xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:type=\"CraftingQuest\">",
                2,
                format!("<indexToCraft>{}</indexToCraft>", escape(item_id)),
            ),
            None => ("<Quest>", 1, String::new()),
        };
        content.push_str(&format!("{opening}<_currentObjective>{}</_currentObjective><_questDescription>{}</_questDescription><_questTitle>{title}</_questTitle><accepted>true</accepted><completed>false</completed><dailyQuest>false</dailyQuest><showNew>true</showNew><canBeCancelled>true</canBeCancelled><destroy>false</destroy><id>{id}</id><moneyReward>0</moneyReward><questType>{kind}</questType><daysLeft>0</daysLeft><dayQuestAccepted>-1</dayQuestAccepted><nextQuests/><modData/><questTitle>{title}</questTitle>{fields}</Quest>",escape(&t.objective),escape(&t.description)));
    }
    let replacement = format!("<questLog>{content}</questLog>");
    let mut result = xml.to_owned();
    if let Some(log) = logs.first() {
        result.replace_range(log.range(), &replacement);
    } else {
        let end = xml[farmer.range()]
            .rfind("</")
            .ok_or("Farmer section is incomplete")?
            + farmer.range().start;
        result.insert_str(end, &replacement);
    }
    parse_xml(&result, Path::new("journal-validation"), 0)?;
    Ok(result)
}
pub fn ensure_game_closed() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let output = {
        use std::os::windows::process::CommandExt;
        Command::new("tasklist.exe")
            .args(["/FO", "CSV", "/NH"])
            .creation_flags(0x08000000)
            .output()
    };
    #[cfg(not(target_os = "windows"))]
    let output = Command::new("ps").args(["-A", "-o", "comm="]).output();
    let output = output.map_err(|_| "Could not verify that Stardew Valley is closed")?;
    if !output.status.success() {
        return Err("Could not verify that Stardew Valley is closed".into());
    }
    let listing = String::from_utf8_lossy(&output.stdout).to_lowercase();
    if ["stardew valley", "stardewvalley", "stardewmoddingapi"]
        .iter()
        .any(|name| listing.contains(name))
    {
        return Err("Close Stardew Valley before transferring journal tasks".into());
    }
    Ok(())
}
pub fn read(path: &Path) -> Result<Vec<u8>, String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    if file.metadata().map_err(|e| e.to_string())?.len() > MAX_SAVE_BYTES {
        return Err("Save exceeds the 64 MiB limit".into());
    }
    let mut bytes = Vec::new();
    file.take(MAX_SAVE_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() as u64 > MAX_SAVE_BYTES {
        return Err("Save exceeds the 64 MiB limit".into());
    }
    Ok(bytes)
}
fn replace(
    path: &Path,
    bytes: &[u8],
    expected: &str,
    guard: &dyn Fn() -> Result<(), String>,
) -> Result<(), String> {
    if hash(&read(path)?) != expected {
        return Err("The save changed. Rescan before transferring tasks".into());
    }
    let mut temp = tempfile::NamedTempFile::new_in(path.parent().ok_or("Save directory missing")?)
        .map_err(|e| e.to_string())?;
    temp.write_all(bytes).map_err(|e| e.to_string())?;
    temp.as_file().sync_all().map_err(|e| e.to_string())?;
    guard()?;
    if hash(&read(path)?) != expected {
        return Err("The save changed. Rescan before transferring tasks".into());
    }
    temp.persist(path).map_err(|e| e.to_string())?;
    Ok(())
}
pub fn apply(
    path: &Path,
    expected: &str,
    farmer_id: &str,
    tasks: &[JournalTask],
    backups: &Path,
) -> Result<Receipt, String> {
    apply_checked(
        path,
        expected,
        farmer_id,
        tasks,
        backups,
        &ensure_game_closed,
    )
}
fn apply_checked(
    path: &Path,
    expected: &str,
    farmer_id: &str,
    tasks: &[JournalTask],
    backups: &Path,
    guard: &dyn Fn() -> Result<(), String>,
) -> Result<Receipt, String> {
    guard()?;
    let original = read(path)?;
    if hash(&original) != expected {
        return Err("The save changed. Rescan before transferring tasks".into());
    }
    let xml = std::str::from_utf8(&original).map_err(|_| "Save encoding is not UTF-8")?;
    let profile = parse_xml(xml, path, 0)?;
    let updated = patch(xml, farmer_id, tasks)?;
    fs::create_dir_all(backups).map_err(|e| e.to_string())?;
    let mut backup = tempfile::Builder::new()
        .prefix("journal-")
        .suffix(".xml")
        .tempfile_in(backups)
        .map_err(|e| e.to_string())?;
    backup.write_all(&original).map_err(|e| e.to_string())?;
    backup.as_file().sync_all().map_err(|e| e.to_string())?;
    let (_, backup_path) = backup.keep().map_err(|e| e.to_string())?;
    let receipt = Receipt {
        backup_id: backup_path
            .file_name()
            .ok_or("Backup file missing")?
            .to_string_lossy()
            .into(),
        applied_fingerprint: hash(updated.as_bytes()),
        original_fingerprint: hash(&original),
        save_id: profile.id,
        farmer_id: farmer_id.into(),
        count: tasks.len(),
    };
    fs::write(
        backup_path.with_extension("json"),
        serde_json::to_vec(&receipt).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    replace(path, updated.as_bytes(), expected, guard)?;
    Ok(receipt)
}
pub fn last_receipt(backups: &Path, save_id: &str, current: &str) -> Option<Receipt> {
    let mut files: Vec<_> = fs::read_dir(backups)
        .ok()?
        .flatten()
        .filter(|e| {
            e.file_name().to_string_lossy().starts_with("journal-")
                && e.path().extension().is_some_and(|x| x == "json")
        })
        .take(10000)
        .collect();
    files.sort_by_key(|e| std::cmp::Reverse(e.metadata().and_then(|m| m.modified()).ok()));
    files
        .into_iter()
        .filter_map(|e| {
            let file = fs::File::open(e.path()).ok()?;
            if file.metadata().ok()?.len() > 4096 {
                return None;
            }
            let mut bytes = Vec::new();
            file.take(4097).read_to_end(&mut bytes).ok()?;
            if bytes.len() > 4096 {
                return None;
            }
            serde_json::from_slice::<Receipt>(&bytes).ok()
        })
        .find(|r| r.save_id == save_id && r.applied_fingerprint == current)
}
pub fn undo(path: &Path, receipt: &Receipt, backups: &Path) -> Result<(), String> {
    undo_checked(path, receipt, backups, &ensure_game_closed)
}
fn undo_checked(
    path: &Path,
    receipt: &Receipt,
    backups: &Path,
    guard: &dyn Fn() -> Result<(), String>,
) -> Result<(), String> {
    guard()?;
    if !receipt.backup_id.starts_with("journal-")
        || !receipt.backup_id.ends_with(".xml")
        || receipt.backup_id.contains(['/', '\\'])
    {
        return Err("Invalid journal backup identity".into());
    }
    let base = backups.canonicalize().map_err(|e| e.to_string())?;
    let backup = base
        .join(&receipt.backup_id)
        .canonicalize()
        .map_err(|e| e.to_string())?;
    if !backup.starts_with(&base) {
        return Err("Backup is outside the application backup folder".into());
    }
    let bytes = read(&backup)?;
    if hash(&bytes) != receipt.original_fingerprint {
        return Err("Journal backup failed its integrity check".into());
    }
    let p = parse_xml(
        std::str::from_utf8(&bytes).map_err(|_| "Backup encoding is invalid")?,
        path,
        0,
    )?;
    if p.id != receipt.save_id {
        return Err("This backup belongs to another farm".into());
    }
    replace(path, &bytes, &receipt.applied_fingerprint, guard)
}
#[cfg(test)]
mod tests {
    use super::*;
    const XML: &str = include_str!("../tests/fixtures/minimal.xml");
    fn task() -> JournalTask {
        JournalTask {
            id: "manual:one".into(),
            title: "Balık & <tarif>".into(),
            description: "Ödülsüz kişisel hedef".into(),
            objective: "Bir kez pişir".into(),
            tracking: None,
        }
    }
    #[test]
    fn recipe_actions_use_vanilla_tracking_without_any_reward_or_followup() {
        let mut note = task();
        note.tracking = Some(Tracking::RecipeCrafted {
            item_id: "(O)236".into(),
        });
        let updated = patch(XML, "123", &[note.clone()]).unwrap();
        assert!(updated.contains("xsi:type=\"CraftingQuest\""));
        assert!(updated.contains("<indexToCraft>(O)236</indexToCraft>"));
        assert!(updated.contains("<questType>2</questType>"));
        assert!(updated.contains("<dailyQuest>false</dailyQuest>"));
        assert!(updated.contains("<moneyReward>0</moneyReward>"));
        assert!(updated.contains("<nextQuests/>"));
        let older = XML.replace("1.6.15", "1.6.8");
        assert!(patch(&older, "123", &[note.clone()]).is_err());
        assert!(patch(&older, "123", &[task()]).is_ok());
        let parsed = parse_xml(&updated, Path::new("test"), 0).unwrap();
        assert_eq!(
            parsed.players[0].quests.as_ref().unwrap()[0].kind,
            "CraftingQuest"
        );
        note.tracking = Some(Tracking::RecipeCrafted {
            item_id: "(X)wrong".into(),
        });
        assert!(patch(XML, "123", &[note]).is_err());
    }
    #[test]
    fn inserts_zero_reward_notes_without_changing_other_bytes() {
        let updated = patch(XML, "123", &[task()]).unwrap();
        let p = parse_xml(&updated, Path::new("test"), 0).unwrap();
        let q = &p.players[0].quests.as_ref().unwrap()[0];
        assert_eq!(q.title.as_deref(), Some("Companion: Balık & <tarif>"));
        assert!(updated.contains("<moneyReward>0</moneyReward>"));
        let begin = updated.find("<questLog>").unwrap();
        let end = updated.find("</questLog>").unwrap() + 11;
        assert_eq!(format!("{}{}", &updated[..begin], &updated[end..]), XML);
    }
    #[test]
    fn sync_replaces_only_own_notes_and_preserves_story_quests() {
        let xml=XML.replace("</player>","<questLog><Quest><id>14</id><_questTitle>Story</_questTitle></Quest></questLog></player>");
        let first = patch(&xml, "123", &[task()]).unwrap();
        let second = patch(&first, "123", &[task()]).unwrap();
        assert_eq!(first, second);
        let clean = patch(&second, "123", &[]).unwrap();
        assert!(clean.contains("<id>14</id>"));
        assert!(!clean.contains(PREFIX));
    }
    #[test]
    fn validates_xml_text_and_farmer_scope() {
        let mut bad = task();
        bad.title = "bad\0text".into();
        assert!(patch(XML, "123", &[bad]).is_err());
        assert!(patch(XML, "other", &[task()]).is_err());
        assert!(patch(XML, "123", &[task(), task()]).is_err());
    }
    #[test]
    fn supports_self_closing_journal() {
        let xml = XML.replace("</player>", "<questLog /></player>");
        assert!(patch(&xml, "123", &[task()]).unwrap().contains(PREFIX));
    }
    #[test]
    fn another_farmhand_stays_byte_identical() {
        let guest = "<farmhands><Farmer><name>Other</name><UniqueMultiplayerID>456</UniqueMultiplayerID><questLog><Quest><id>14</id></Quest></questLog></Farmer></farmhands>";
        let xml = XML.replace("</SaveGame>", &format!("{guest}</SaveGame>"));
        assert!(patch(&xml, "123", &[task()]).unwrap().contains(guest));
        let other = patch(&xml, "456", &[task()]).unwrap();
        assert!(other.contains("<id>14</id>"));
        assert!(
            parse_xml(&other, Path::new("test"), 0).unwrap().players[0]
                .quests
                .is_none()
        );
    }
    #[test]
    fn backed_up_transfer_and_undo_restore_exact_original() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("Synthetic_123");
        let backups = dir.path().join("backups");
        fs::write(&path, XML).unwrap();
        let receipt = apply_checked(
            &path,
            &hash(XML.as_bytes()),
            "123",
            &[task()],
            &backups,
            &|| Ok(()),
        )
        .unwrap();
        assert_eq!(
            fs::read(backups.join(&receipt.backup_id)).unwrap(),
            XML.as_bytes()
        );
        assert_eq!(
            last_receipt(&backups, &receipt.save_id, &hash(&read(&path).unwrap()))
                .unwrap()
                .backup_id,
            receipt.backup_id
        );
        undo_checked(&path, &receipt, &backups, &|| Ok(())).unwrap();
        assert_eq!(read(&path).unwrap(), XML.as_bytes());
        assert!(last_receipt(&backups, &receipt.save_id, &hash(XML.as_bytes())).is_none());
    }
    #[test]
    fn real_scan_fingerprints_allow_transfer_and_undo_with_or_without_utf8_bom() {
        for prefix in ["", "\u{feff}"] {
            let dir = tempfile::tempdir().unwrap();
            let path = dir.path().join("Synthetic_123");
            let backups = dir.path().join("backups");
            let original = format!("{prefix}{XML}");
            fs::write(&path, original.as_bytes()).unwrap();
            let scanned = crate::save::parser::read_stable(&path).unwrap();
            assert_eq!(scanned.fingerprint, hash(original.as_bytes()));
            let receipt = apply_checked(
                &path,
                &scanned.fingerprint,
                "123",
                &[task()],
                &backups,
                &|| Ok(()),
            )
            .unwrap();
            let after = crate::save::parser::read_stable(&path).unwrap();
            assert_eq!(after.fingerprint, receipt.applied_fingerprint);
            assert!(
                std::str::from_utf8(&read(&path).unwrap())
                    .unwrap()
                    .starts_with(prefix)
            );
            assert!(last_receipt(&backups, &scanned.id, &after.fingerprint).is_some());
            undo_checked(&path, &receipt, &backups, &|| Ok(())).unwrap();
            assert_eq!(read(&path).unwrap(), original.as_bytes());
            assert_eq!(
                crate::save::parser::read_stable(&path).unwrap().fingerprint,
                scanned.fingerprint
            );
        }
    }
    #[test]
    fn stale_or_open_game_never_overwrites_a_save() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("Synthetic_123");
        let backups = dir.path().join("backups");
        fs::write(&path, XML).unwrap();
        assert!(apply_checked(&path, "old", "123", &[task()], &backups, &|| Ok(())).is_err());
        assert!(!backups.exists());
        assert!(
            apply_checked(
                &path,
                &hash(XML.as_bytes()),
                "123",
                &[task()],
                &backups,
                &|| Err("Game is open".into())
            )
            .is_err()
        );
        assert!(!backups.exists());
        let calls = std::cell::Cell::new(0);
        let guard = || {
            calls.set(calls.get() + 1);
            if calls.get() > 1 {
                Err("Game started during transfer".into())
            } else {
                Ok(())
            }
        };
        assert!(
            apply_checked(
                &path,
                &hash(XML.as_bytes()),
                "123",
                &[task()],
                &backups,
                &guard
            )
            .is_err()
        );
        assert_eq!(read(&path).unwrap(), XML.as_bytes());
        assert!(last_receipt(&backups, "synthetic:123", &hash(XML.as_bytes())).is_none());
    }
    #[test]
    fn undo_rejects_new_progress_and_tampered_or_escaped_backups() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("Synthetic_123");
        let backups = dir.path().join("backups");
        fs::write(&path, XML).unwrap();
        let mut receipt = apply_checked(
            &path,
            &hash(XML.as_bytes()),
            "123",
            &[task()],
            &backups,
            &|| Ok(()),
        )
        .unwrap();
        let updated = read(&path).unwrap();
        fs::write(
            &path,
            XML.replace("</SaveGame>", "<!-- new day --></SaveGame>"),
        )
        .unwrap();
        let newer = read(&path).unwrap();
        assert!(last_receipt(&backups, &receipt.save_id, &hash(&newer)).is_none());
        assert!(undo_checked(&path, &receipt, &backups, &|| Ok(())).is_err());
        assert_eq!(read(&path).unwrap(), newer);
        fs::write(&path, &updated).unwrap();
        fs::write(backups.join(&receipt.backup_id), "tampered").unwrap();
        assert!(
            undo_checked(&path, &receipt, &backups, &|| Ok(()))
                .unwrap_err()
                .contains("integrity")
        );
        receipt.backup_id = "journal-../other.xml".into();
        assert!(undo_checked(&path, &receipt, &backups, &|| Ok(())).is_err());
        assert_eq!(read(&path).unwrap(), updated);
    }
}
