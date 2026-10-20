use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use std::{
    collections::BTreeSet,
    path::PathBuf,
    sync::mpsc::{self, Receiver},
};

// The bounded queue coalesces bursts without accumulating unbounded filesystem events.
// For a missing Saves folder, watch its closest existing ancestor until discovery refreshes it.
pub fn watch_roots(roots: Vec<PathBuf>) -> Result<(RecommendedWatcher, Receiver<()>), String> {
    let (tx, rx) = mpsc::sync_channel(1);
    let allowed = roots.clone();
    let mut watcher =
        notify::recommended_watcher(move |event: Result<notify::Event, notify::Error>| {
            if let Ok(event) = event
                && matches!(
                    event.kind,
                    notify::EventKind::Create(_)
                        | notify::EventKind::Modify(_)
                        | notify::EventKind::Remove(_)
                )
                && event
                    .paths
                    .iter()
                    .any(|p| allowed.iter().any(|r| p.starts_with(r) || r.starts_with(p)))
            {
                let _ = tx.try_send(());
            }
        })
        .map_err(|e| e.to_string())?;
    let mut watched = BTreeSet::new();
    for root in roots {
        let mut target = root.clone();
        while !target.exists() {
            if !target.pop() {
                break;
            }
        }
        if target.exists() && watched.insert(target.clone()) {
            watcher
                .watch(
                    &target,
                    if target == root {
                        RecursiveMode::Recursive
                    } else {
                        RecursiveMode::NonRecursive
                    },
                )
                .map_err(|e| e.to_string())?;
        }
    }
    Ok((watcher, rx))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn detects_synthetic_completed_save_write() {
        let temp = tempfile::tempdir().unwrap();
        let (_watcher, rx) = watch_roots(vec![temp.path().to_owned()]).unwrap();
        let path = temp.path().join("Test_123");
        std::fs::write(&path, include_str!("../../tests/fixtures/minimal.xml")).unwrap();
        rx.recv_timeout(std::time::Duration::from_secs(4))
            .expect("native watcher event");
        assert!(crate::save::parser::read_stable(&path).is_ok());
    }
    #[test]
    fn detects_creation_of_a_missing_save_directory() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("Saves");
        let (_watcher, rx) = watch_roots(vec![path.clone()]).unwrap();
        std::fs::create_dir(&path).unwrap();
        rx.recv_timeout(std::time::Duration::from_secs(4))
            .expect("save directory creation event");
    }
}
