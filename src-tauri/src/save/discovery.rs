use super::{ScanIssue, ScanResult, parser::read_stable};
use std::{
    collections::BTreeSet,
    fs,
    path::{Path, PathBuf},
};
pub fn default_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    #[cfg(target_os = "windows")]
    if let Some(appdata) = std::env::var_os("APPDATA") {
        roots.push(PathBuf::from(appdata).join("StardewValley/Saves"));
    }
    #[cfg(not(target_os = "windows"))]
    if let Some(home) = dirs::home_dir() {
        roots.push(home.join(".config/StardewValley/Saves"));
        #[cfg(target_os = "linux")]
        for steam in [home.join(".steam/steam"), home.join(".local/share/Steam")] {
            roots.push(steam.join("steamapps/compatdata/413150/pfx/drive_c/users/steamuser/AppData/Roaming/StardewValley/Saves"));
        }
    }
    roots
}
pub fn authorized_path(path: &Path, roots: &[PathBuf]) -> Result<PathBuf, String> {
    let full = path.canonicalize().map_err(|e| e.to_string())?;
    if roots
        .iter()
        .filter_map(|p| p.canonicalize().ok())
        .any(|root| full.starts_with(root))
    {
        Ok(full)
    } else {
        Err("This path is outside the authorized save directories".into())
    }
}
pub fn scan(roots: &[PathBuf]) -> ScanResult {
    let mut result = ScanResult {
        saves: Vec::new(),
        issues: Vec::new(),
        directories: roots.iter().map(|p| p.to_string_lossy().into()).collect(),
        custom_directories: Vec::new(),
    };
    let mut paths = BTreeSet::new();
    for root in roots {
        let entries = match fs::read_dir(root) {
            Ok(e) => e,
            Err(e) => {
                if root.exists() {
                    result.issues.push(ScanIssue {
                        path: root.to_string_lossy().into(),
                        message: e.to_string(),
                    });
                }
                continue;
            }
        };
        for entry in entries.flatten().take(2000) {
            let p = entry.path();
            if p.is_dir() {
                if let Some(name) = p.file_name() {
                    let save = p.join(name);
                    if save.is_file() {
                        paths.insert(save);
                    }
                }
            } else if p.is_file() {
                let name = p.file_name().unwrap_or_default().to_string_lossy();
                if !name.ends_with("_old")
                    && name != "SaveGameInfo"
                    && !name.starts_with('.')
                    && name
                        .rsplit_once('_')
                        .is_some_and(|(_, id)| id.parse::<u64>().is_ok())
                {
                    paths.insert(p);
                }
            }
        }
    }
    for path in paths {
        match authorized_path(&path, roots).and_then(|p| read_stable(&p)) {
            Ok(save) => {
                merge_profile(&mut result.saves, save);
            }
            Err(e) => result.issues.push(ScanIssue {
                path: path.to_string_lossy().into(),
                message: e,
            }),
        }
    }
    result.saves.sort_by_key(|a| std::cmp::Reverse(a.saved_at));
    result
}
pub fn merge_profile(saves: &mut Vec<super::SaveProfile>, save: super::SaveProfile) {
    if let Some(existing) = saves.iter_mut().find(|s| s.id == save.id) {
        if save.saved_at > existing.saved_at {
            *existing = save;
        }
    } else {
        saves.push(save);
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn multiple_saves_and_no_backups() {
        let temp = tempfile::tempdir().unwrap();
        for (name, id) in [("A_100", "100"), ("B_200", "200")] {
            let dir = temp.path().join(name);
            fs::create_dir(&dir).unwrap();
            let xml = include_str!("../../tests/fixtures/minimal.xml").replace("unique-game", id);
            fs::write(dir.join(name), &xml).unwrap();
            fs::write(dir.join("SaveGameInfo"), "broken").unwrap();
            fs::write(dir.join(format!("{name}_old")), "broken").unwrap();
        }
        let result = scan(&[temp.path().to_owned()]);
        assert_eq!(result.saves.len(), 2);
        assert!(result.issues.is_empty());
    }
    #[test]
    fn cannot_escape_authorized_root() {
        let a = tempfile::tempdir().unwrap();
        let b = tempfile::tempdir().unwrap();
        assert!(authorized_path(b.path(), &[a.path().to_owned()]).is_err());
    }
    #[test]
    fn absent_directory_is_normal() {
        assert!(
            scan(&[PathBuf::from("/does-not-exist/stardew-synthetic")])
                .saves
                .is_empty()
        );
    }
    #[test]
    fn newest_same_identity_profile_wins_across_discovered_and_imported_paths() {
        let xml = include_str!("../../tests/fixtures/minimal.xml");
        let old = super::super::parser::parse_xml(xml, Path::new("old"), 1).unwrap();
        let newer = super::super::parser::parse_xml(xml, Path::new("new"), 2).unwrap();
        let mut saves = vec![old.clone()];
        merge_profile(&mut saves, newer);
        merge_profile(&mut saves, old);
        assert_eq!(saves.len(), 1);
        assert_eq!(saves[0].path, "new");
    }
}
