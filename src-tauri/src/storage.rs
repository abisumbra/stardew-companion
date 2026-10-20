use crate::save::{SaveProfile, parser::now};
use rusqlite::{Connection, params};
use std::path::{Path, PathBuf};
pub struct Store {
    pub db: PathBuf,
}
impl Store {
    pub fn export_backup(&self) -> Result<serde_json::Value, String> {
        let c = self.connect()?;
        let mut query = c.prepare("SELECT scope,value FROM state WHERE scope LIKE 'farm:%' OR scope IN ('steam-account','preferences','farm-designs','home-designs','appearance')").map_err(|e| e.to_string())?;
        let rows = query
            .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
            .map_err(|e| e.to_string())?;
        let mut states = serde_json::Map::new();
        for row in rows {
            let (key, value) = row.map_err(|e| e.to_string())?;
            states.insert(
                key,
                serde_json::from_str::<serde_json::Value>(&value).map_err(|e| e.to_string())?,
            );
        }
        Ok(serde_json::json!({"format":"stardew-companion-backup","version":1,"states":states}))
    }
    pub fn restore_backup(&self, backup: &serde_json::Value) -> Result<(), String> {
        let states = backup_states(backup)?;
        let mut c = self.connect()?;
        let tx = c.transaction().map_err(|e| e.to_string())?;
        let mut previous = serde_json::Map::new();
        for scope in states.keys() {
            use rusqlite::OptionalExtension;
            let value: Option<String> = tx
                .query_row("SELECT value FROM state WHERE scope=?1", [scope], |r| {
                    r.get(0)
                })
                .optional()
                .map_err(|e| e.to_string())?;
            previous.insert(
                scope.clone(),
                value
                    .map(serde_json::Value::String)
                    .unwrap_or(serde_json::Value::Null),
            );
        }
        tx.execute("INSERT INTO state(scope,value) VALUES('restore-recovery',?1) ON CONFLICT(scope) DO UPDATE SET value=excluded.value", [serde_json::Value::Object(previous).to_string()]).map_err(|e|e.to_string())?;
        for (scope, value) in states {
            tx.execute("INSERT INTO state(scope,value) VALUES(?1,?2) ON CONFLICT(scope) DO UPDATE SET value=excluded.value", params![scope, value.to_string()]).map_err(|e| e.to_string())?;
        }
        tx.commit().map_err(|e| e.to_string())
    }
    pub fn undo_restore(&self) -> Result<(), String> {
        let mut c = self.connect()?;
        let tx = c.transaction().map_err(|e| e.to_string())?;
        let raw: String = tx
            .query_row(
                "SELECT value FROM state WHERE scope='restore-recovery'",
                [],
                |r| r.get(0),
            )
            .map_err(|_| "No restore recovery is available".to_string())?;
        let previous: serde_json::Map<String, serde_json::Value> =
            serde_json::from_str(&raw).map_err(|e| e.to_string())?;
        for (scope, value) in previous {
            if let Some(json) = value.as_str() {
                tx.execute("INSERT INTO state(scope,value) VALUES(?1,?2) ON CONFLICT(scope) DO UPDATE SET value=excluded.value", params![scope,json]).map_err(|e|e.to_string())?;
            } else {
                tx.execute("DELETE FROM state WHERE scope=?1", [scope])
                    .map_err(|e| e.to_string())?;
            }
        }
        tx.execute("DELETE FROM state WHERE scope='restore-recovery'", [])
            .map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())
    }
    pub fn new(dir: &Path) -> Result<Self, String> {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
        let store = Self {
            db: dir.join("companion.sqlite3"),
        };
        store.connect()?;
        store.connect()?.execute_batch("CREATE TABLE IF NOT EXISTS imported_saves(path TEXT PRIMARY KEY); INSERT OR IGNORE INTO migrations VALUES(2);").map_err(|e|e.to_string())?;
        Ok(store)
    }
    fn connect(&self) -> Result<Connection, String> {
        let c = Connection::open(&self.db).map_err(|e| e.to_string())?;
        c.busy_timeout(std::time::Duration::from_secs(5))
            .map_err(|e| e.to_string())?;
        c.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY); CREATE TABLE IF NOT EXISTS directories(path TEXT PRIMARY KEY); CREATE TABLE IF NOT EXISTS state(scope TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS snapshots(save_id TEXT NOT NULL, fingerprint TEXT NOT NULL, observed_at INTEGER NOT NULL, summary TEXT NOT NULL, PRIMARY KEY(save_id,fingerprint)); INSERT OR IGNORE INTO migrations VALUES(1);").map_err(|e| e.to_string())?;
        Ok(c)
    }
    pub fn directories(&self) -> Result<Vec<PathBuf>, String> {
        let c = self.connect()?;
        let mut s = c
            .prepare("SELECT path FROM directories ORDER BY path")
            .map_err(|e| e.to_string())?;
        s.query_map([], |r| r.get::<_, String>(0).map(PathBuf::from))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }
    pub fn add_directory(&self, path: &Path) -> Result<(), String> {
        self.connect()?
            .execute(
                "INSERT OR IGNORE INTO directories(path) VALUES(?1)",
                [path.to_string_lossy().as_ref()],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    pub fn remove_directory(&self, path: &str) -> Result<(), String> {
        let imports = self.imports()?;
        let mut c = self.connect()?;
        let tx = c.transaction().map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM directories WHERE path=?1", [path])
            .map_err(|e| e.to_string())?;
        for imported in imports.into_iter().filter(|p| p.starts_with(path)) {
            tx.execute(
                "DELETE FROM imported_saves WHERE path=?1",
                [imported.to_string_lossy().as_ref()],
            )
            .map_err(|e| e.to_string())?;
        }
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }
    pub fn add_import(&self, path: &Path) -> Result<(), String> {
        self.connect()?
            .execute(
                "INSERT OR IGNORE INTO imported_saves(path) VALUES(?1)",
                [path.to_string_lossy().as_ref()],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    pub fn imports(&self) -> Result<Vec<PathBuf>, String> {
        let c = self.connect()?;
        let mut s = c
            .prepare("SELECT path FROM imported_saves")
            .map_err(|e| e.to_string())?;
        s.query_map([], |r| r.get::<_, String>(0).map(PathBuf::from))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }
    pub fn get(&self, scope: &str) -> Result<Option<serde_json::Value>, String> {
        let c = self.connect()?;
        let mut s = c
            .prepare("SELECT value FROM state WHERE scope=?1")
            .map_err(|e| e.to_string())?;
        let mut rows = s.query([scope]).map_err(|e| e.to_string())?;
        rows.next()
            .map_err(|e| e.to_string())?
            .map(|r| {
                let v: String = r.get(0).map_err(|e| e.to_string())?;
                serde_json::from_str(&v).map_err(|e| e.to_string())
            })
            .transpose()
    }
    pub fn set(&self, scope: &str, value: &serde_json::Value) -> Result<(), String> {
        let json = value.to_string();
        if json.len() > 1024 * 1024 || scope.len() > 256 {
            return Err("State exceeds limit".into());
        };
        self.connect()?.execute("INSERT INTO state(scope,value) VALUES(?1,?2) ON CONFLICT(scope) DO UPDATE SET value=excluded.value",params![scope,json]).map_err(|e|e.to_string())?;
        Ok(())
    }
    pub fn snapshot(&self, save: &SaveProfile) -> Result<(), String> {
        let summary = serde_json::json!({"version":save.game_version,"season":save.season,"day":save.day,"year":save.year,"cooked":save.players[0].cooked.as_ref().map(|m|m.values().filter(|n|**n>0).count()),"fish":save.players[0].fish.as_ref().map(|m|m.values().filter(|n|**n>0).count())});
        self.connect()?
            .execute(
                "INSERT OR IGNORE INTO snapshots VALUES(?1,?2,?3,?4)",
                params![save.id, save.fingerprint, now() as i64, summary.to_string()],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    pub fn history(&self, id: &str) -> Result<Vec<serde_json::Value>, String> {
        let c = self.connect()?;
        let mut s=c.prepare("SELECT observed_at,summary FROM snapshots WHERE save_id=?1 ORDER BY observed_at DESC LIMIT 30").map_err(|e|e.to_string())?;
        s.query_map([id],|r|Ok((r.get::<_,i64>(0)?,r.get::<_,String>(1)?))).map_err(|e|e.to_string())?.map(|r|r.map_err(|e|e.to_string()).and_then(|(at,json)|Ok(serde_json::json!({"at":at,"summary":serde_json::from_str::<serde_json::Value>(&json).map_err(|e|e.to_string())?})))).collect()
    }
    pub fn update_summary(
        &self,
        id: &str,
        fingerprint: &str,
        summary: &serde_json::Value,
    ) -> Result<(), String> {
        let json = summary.to_string();
        if json.len() > 65536
            || id.len() > 256
            || fingerprint.len() != 64
            || !fingerprint.chars().all(|c| c.is_ascii_hexdigit())
        {
            return Err("Invalid progress summary".into());
        }
        self.connect()?
            .execute(
                "UPDATE snapshots SET summary=?3 WHERE save_id=?1 AND fingerprint=?2",
                params![id, fingerprint, json],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
pub fn backup_states(
    backup: &serde_json::Value,
) -> Result<&serde_json::Map<String, serde_json::Value>, String> {
    if backup["format"] != "stardew-companion-backup"
        || backup["version"] != 1
        || backup.to_string().len() > 16 * 1024 * 1024
    {
        return Err("Unsupported backup file".into());
    }
    let states = backup["states"]
        .as_object()
        .ok_or("Invalid backup sections")?;
    for (scope, value) in states {
        if scope.len() > 256
            || !(scope.starts_with("farm:") && scope.len() > 5
                || scope == "steam-account"
                || scope == "preferences"
                || scope == "appearance"
                || scope == "farm-designs"
                || scope == "home-designs")
            || !value.is_object()
            || value.to_string().len() > 1024 * 1024
        {
            return Err("Invalid backup section".into());
        }
    }
    Ok(states)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn restore_recovery_is_persistent_and_preserves_unselected_sections() {
        let dir = tempfile::tempdir().unwrap();
        let store = Store::new(dir.path()).unwrap();
        store
            .set(
                "farm:one",
                &serde_json::json!({"version":1,"goals":["old"]}),
            )
            .unwrap();
        store
            .set(
                "farm:other",
                &serde_json::json!({"version":1,"goals":["untouched"]}),
            )
            .unwrap();
        store.restore_backup(&serde_json::json!({"format":"stardew-companion-backup","version":1,"states":{
            "farm:one":{"version":1,"goals":["new"]},"home-designs":{"version":1,"designs":[]}
        }})).unwrap();
        let reopened = Store::new(dir.path()).unwrap();
        reopened.undo_restore().unwrap();
        assert_eq!(
            reopened.get("farm:one").unwrap().unwrap()["goals"][0],
            "old"
        );
        assert_eq!(
            reopened.get("farm:other").unwrap().unwrap()["goals"][0],
            "untouched"
        );
        assert!(reopened.get("home-designs").unwrap().is_none());
        assert!(reopened.undo_restore().is_err());
    }
    #[test]
    fn backup_roundtrip_preserves_unrelated_state_and_rejects_invalid_sections() {
        let t = tempfile::tempdir().unwrap();
        let store = Store::new(t.path()).unwrap();
        store
            .set(
                "farm:one",
                &serde_json::json!({"version":1,"goals":["first"]}),
            )
            .unwrap();
        store
            .set("artwork", &serde_json::json!({"root":"local-only"}))
            .unwrap();
        let backup = store.export_backup().unwrap();
        assert!(backup["states"].get("artwork").is_none());
        store
            .set("farm:one", &serde_json::json!({"version":1,"goals":[]}))
            .unwrap();
        store
            .set(
                "farm:two",
                &serde_json::json!({"version":1,"goals":["other"]}),
            )
            .unwrap();
        store.restore_backup(&backup).unwrap();
        assert_eq!(store.get("farm:one").unwrap().unwrap()["goals"][0], "first");
        assert_eq!(store.get("farm:two").unwrap().unwrap()["goals"][0], "other");
        let mut invalid = backup.clone();
        invalid["states"]["artwork"] = serde_json::json!({"root":"invalid"});
        assert!(store.restore_backup(&invalid).is_err());
        assert_eq!(store.get("artwork").unwrap().unwrap()["root"], "local-only");
    }
    #[test]
    fn persistence_is_scoped_and_migrates() {
        let t = tempfile::tempdir().unwrap();
        let s = Store::new(t.path()).unwrap();
        s.set("farm:1", &serde_json::json!({"task":true})).unwrap();
        s.set("account", &serde_json::json!(["Cook"])).unwrap();
        let s = Store::new(t.path()).unwrap();
        assert!(s.get("farm:2").unwrap().is_none());
        assert_eq!(s.get("farm:1").unwrap().unwrap()["task"], true);
        assert_eq!(s.get("account").unwrap().unwrap()[0], "Cook");
    }
    #[test]
    fn removing_directory_forgets_only_imports_inside_that_directory() {
        let temp = tempfile::tempdir().unwrap();
        let s = Store::new(temp.path()).unwrap();
        let inside = temp.path().join("saves").join("A_1");
        let outside = temp.path().join("saves-other").join("B_2");
        s.add_directory(&temp.path().join("saves")).unwrap();
        s.add_import(&inside).unwrap();
        s.add_import(&outside).unwrap();
        s.remove_directory(temp.path().join("saves").to_str().unwrap())
            .unwrap();
        assert_eq!(s.imports().unwrap(), vec![outside]);
        assert!(s.directories().unwrap().is_empty());
    }
    #[test]
    fn progress_summary_updates_an_existing_snapshot_without_adding_duplicates() {
        let temp = tempfile::tempdir().unwrap();
        let s = Store::new(temp.path()).unwrap();
        let save = crate::save::parser::parse_xml(
            include_str!("../tests/fixtures/minimal.xml"),
            Path::new("synthetic"),
            1,
        )
        .unwrap();
        s.snapshot(&save).unwrap();
        let summary =
            serde_json::json!({"perfection":12.5,"criteria":[{"id":"cooking","ratio":0.1}]});
        s.update_summary(&save.id, &save.fingerprint, &summary)
            .unwrap();
        s.snapshot(&save).unwrap();
        let history = s.history(&save.id).unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0]["summary"]["perfection"], 12.5);
        assert!(s.update_summary(&save.id, "bad", &summary).is_err());
    }
}
