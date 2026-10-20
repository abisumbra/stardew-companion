pub mod artwork;
pub mod connection;
pub mod journal;
pub mod save;
pub mod steam;
mod storage;
use notify::RecommendedWatcher;
use save::{ScanResult, discovery, parser};
use std::{
    path::PathBuf,
    sync::Mutex,
    time::{Duration, Instant},
};
use storage::Store;
use tauri::{Emitter, Manager, State};
struct AppState {
    store: Store,
    watcher: Mutex<Option<(Vec<PathBuf>, RecommendedWatcher)>>,
    artwork: Mutex<Option<artwork::Artwork>>,
}
#[tauri::command]
async fn get_artwork(
    app: tauri::AppHandle,
    refresh: Option<bool>,
) -> Result<artwork::Artwork, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let s = app.state::<AppState>();
        let mut cache = s.artwork.lock().map_err(|e| e.to_string())?;
        if refresh.unwrap_or(false) {
            *cache = None;
        }
        if cache.is_none() {
            let custom = s
                .store
                .get("artwork")?
                .and_then(|v| v["root"].as_str().map(PathBuf::from));
            let root = custom
                .as_deref()
                .and_then(|p| artwork::validate_root(p).ok())
                .or_else(artwork::discover);
            *cache = Some(artwork::load(root));
        }
        Ok(cache.as_ref().unwrap().clone())
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn get_location_map(
    app: tauri::AppHandle,
    location: String,
    season: String,
) -> Result<artwork::tilemap::TileMap, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let s = app.state::<AppState>();
        let custom = s
            .store
            .get("artwork")?
            .and_then(|v| v["root"].as_str().map(PathBuf::from));
        let root = custom
            .as_deref()
            .and_then(|p| artwork::validate_root(p).ok())
            .or_else(artwork::discover)
            .ok_or("Connect the installed game first")?;
        artwork::tilemap::load(&root, &location, &season)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn get_game_translations(
    app: tauri::AppHandle,
    language: String,
) -> Result<std::collections::BTreeMap<String, String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let cache = state.artwork.lock().map_err(|e| e.to_string())?;
        let art = cache.as_ref().ok_or("Load installed game data first")?;
        let root = art
            .root
            .as_ref()
            .ok_or("Connect the installed game first")?;
        art.language_dictionary(std::path::Path::new(root), &language)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
fn set_artwork_directory(s: State<AppState>, path: String) -> Result<(), String> {
    let root = artwork::validate_root(&PathBuf::from(path))?;
    s.store.set(
        "artwork",
        &serde_json::json!({"root":root.to_string_lossy()}),
    )?;
    *s.artwork.lock().map_err(|e| e.to_string())? = None;
    Ok(())
}
fn roots(s: &AppState) -> Result<Vec<PathBuf>, String> {
    let mut r = discovery::default_roots();
    r.extend(s.store.directories()?);
    r.sort();
    r.dedup();
    Ok(r)
}
#[tauri::command]
async fn read_steam_profile(profile: String) -> Result<steam::Profile, String> {
    tauri::async_runtime::spawn_blocking(move || steam::read_profile(&profile))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn steam_icons(
    app: tauri::AppHandle,
    download: bool,
) -> Result<std::collections::BTreeMap<String, String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        steam::icons(
            &app.path()
                .app_data_dir()
                .map_err(|e| e.to_string())?
                .join("steam-icons"),
            download,
        )
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn set_connection_plan(
    app: tauri::AppHandle,
    path: String,
    fingerprint: String,
    farmer_id: String,
    goals: Vec<connection::Goal>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let path = discovery::authorized_path(PathBuf::from(path).as_path(), &roots(&state)?)?;
        connection::write_plan(
            &path,
            &fingerprint,
            &farmer_id,
            goals,
            &app.path()
                .app_data_dir()
                .map_err(|e| e.to_string())?
                .join("connection"),
        )
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
fn connection_status(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    connection::status(
        &app.path()
            .app_data_dir()
            .map_err(|e| e.to_string())?
            .join("connection"),
    )
}
#[tauri::command]
async fn request_farm_layout(
    app: tauri::AppHandle,
    path: String,
    fingerprint: String,
    farmer_id: String,
    design: serde_json::Value,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let path = discovery::authorized_path(PathBuf::from(path).as_path(), &roots(&state)?)?;
        connection::request_layout(
            &path,
            &fingerprint,
            &farmer_id,
            design,
            &app.path()
                .app_data_dir()
                .map_err(|e| e.to_string())?
                .join("connection"),
        )
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
fn farm_layout_result(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    connection::layout_result(
        &app.path()
            .app_data_dir()
            .map_err(|e| e.to_string())?
            .join("connection"),
    )
}
#[tauri::command]
async fn launch_connected_game(app: tauri::AppHandle) -> Result<u32, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let custom = state
            .store
            .get("artwork")?
            .and_then(|v| v["root"].as_str().map(PathBuf::from));
        let game = custom
            .as_deref()
            .and_then(|p| artwork::validate_root(p).ok())
            .or_else(artwork::discover)
            .ok_or("Connect the installed game in Settings first")?;
        connection::launch(
            &game,
            &app.path()
                .app_data_dir()
                .map_err(|e| e.to_string())?
                .join("connection"),
        )
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn sync_journal(
    app: tauri::AppHandle,
    path: String,
    fingerprint: String,
    farmer_id: String,
    tasks: Vec<journal::JournalTask>,
) -> Result<journal::Receipt, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let path = discovery::authorized_path(PathBuf::from(path).as_path(), &roots(&state)?)?;
        let backups = app
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?
            .join("journal-backups");
        let receipt = journal::apply(&path, &fingerprint, &farmer_id, &tasks, &backups)?;
        Ok(receipt)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn journal_receipt(
    app: tauri::AppHandle,
    path: String,
    save_id: String,
) -> Result<Option<journal::Receipt>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let path = discovery::authorized_path(PathBuf::from(path).as_path(), &roots(&state)?)?;
        Ok(journal::last_receipt(
            &app.path()
                .app_data_dir()
                .map_err(|e| e.to_string())?
                .join("journal-backups"),
            &save_id,
            &journal::hash(&journal::read(&path)?),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn undo_journal(app: tauri::AppHandle, path: String, save_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let path = discovery::authorized_path(PathBuf::from(path).as_path(), &roots(&state)?)?;
        let backups = app
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?
            .join("journal-backups");
        let receipt =
            journal::last_receipt(&backups, &save_id, &journal::hash(&journal::read(&path)?))
                .ok_or("No unchanged journal transfer is available to undo")?;
        if receipt.save_id != save_id {
            return Err("This backup belongs to another farm".into());
        }
        journal::undo(
            &path,
            &receipt,
            &app.path()
                .app_data_dir()
                .map_err(|e| e.to_string())?
                .join("journal-backups"),
        )?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn scan_saves(app: tauri::AppHandle) -> Result<ScanResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let s = app.state::<AppState>();
        let allowed = roots(&s)?;
        let mut result = discovery::scan(&allowed);
        result.custom_directories = s.store.directories()?.iter().map(|p|p.to_string_lossy().into()).collect();
        if s.watcher.lock().map_err(|e|e.to_string())?.is_none() {
            result.issues.push(save::ScanIssue{path:"Automatic refresh".into(),message:"The native file watcher is unavailable. Use Rescan until the application is restarted.".into()});
        }
        let hidden = s.store.get("hidden-saves")?.and_then(|v| serde_json::from_value::<Vec<String>>(v).ok()).unwrap_or_default();
        for path in s.store.imports()? {
            if hidden.iter().any(|p| std::path::Path::new(p) == path) { continue; }
            if result
                .saves
                .iter()
                .any(|p| std::path::Path::new(&p.path) == path)
            {
                continue;
            }
            match discovery::authorized_path(&path, &allowed).and_then(|p| parser::read_stable(&p))
            {
                Ok(profile) => {
                    discovery::merge_profile(&mut result.saves, profile);
                }
                Err(e) => result.issues.push(save::ScanIssue {
                    path: path.to_string_lossy().into(),
                    message: e,
                }),
            }
        }
        result.saves.retain(|save| !hidden.contains(&save.path));
        result.issues.retain(|issue| !hidden.contains(&issue.path));
        result.saves.sort_by_key(|save| std::cmp::Reverse(save.saved_at));
        for save in &result.saves {
            s.store.snapshot(save)?;
        }
        if let Err(e) = watch(&app) {
            result.issues.push(save::ScanIssue{path:"Automatic refresh".into(),message:e});
        }
        Ok(result)
    })
    .await
    .map_err(|e| e.to_string())?
}
fn watch(app: &tauri::AppHandle) -> Result<(), String> {
    let s = app.state::<AppState>();
    let allowed = roots(&s)?;
    let mut signature = allowed.clone();
    for root in &allowed {
        let mut target = root.clone();
        while !target.exists() {
            if !target.pop() {
                break;
            }
        }
        signature.push(target);
    }
    let mut slot = s.watcher.lock().map_err(|e| e.to_string())?;
    if slot
        .as_ref()
        .is_some_and(|(previous, _)| *previous == signature)
    {
        return Ok(());
    }
    let (watcher, rx) = save::watcher::watch_roots(allowed)?;
    let handle = app.clone();
    std::thread::spawn(move || {
        while rx.recv().is_ok() {
            let mut last = Instant::now();
            let start = last;
            while start.elapsed() < Duration::from_secs(8) {
                match rx.recv_timeout(Duration::from_millis(900)) {
                    Ok(_) => last = Instant::now(),
                    Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                        if last.elapsed() >= Duration::from_millis(850) {
                            break;
                        }
                    }
                    Err(_) => return,
                }
            }
            let _ = handle.emit("saves-changed", ());
        }
    });
    *slot = Some((signature, watcher));
    Ok(())
}
#[tauri::command]
fn add_directory(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let p = PathBuf::from(path)
        .canonicalize()
        .map_err(|e| e.to_string())?;
    if !p.is_dir() {
        return Err("Choose a directory".into());
    }
    app.state::<AppState>().store.add_directory(&p)?;
    watch(&app)
}
#[tauri::command]
fn remove_directory(app: tauri::AppHandle, path: String) -> Result<(), String> {
    app.state::<AppState>().store.remove_directory(&path)?;
    watch(&app)
}
#[tauri::command]
async fn import_save(app: tauri::AppHandle, path: String) -> Result<save::SaveProfile, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let p = PathBuf::from(path)
            .canonicalize()
            .map_err(|e| e.to_string())?;
        let profile = parser::read_stable(&p)?;
        let state = app.state::<AppState>();
        let store = &state.store;
        let mut hidden = store
            .get("hidden-saves")?
            .and_then(|v| serde_json::from_value::<Vec<String>>(v).ok())
            .unwrap_or_default();
        hidden.retain(|path| std::path::Path::new(path) != p);
        store.set("hidden-saves", &serde_json::json!(hidden))?;
        let parent = p.parent().ok_or("File has no parent")?;
        app.state::<AppState>().store.add_directory(parent)?;
        app.state::<AppState>().store.add_import(&p)?;
        app.state::<AppState>().store.snapshot(&profile)?;
        watch(&app)?;
        Ok(profile)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
fn hide_save(s: State<AppState>, path: String) -> Result<(), String> {
    let mut hidden = s
        .store
        .get("hidden-saves")?
        .and_then(|v| serde_json::from_value::<Vec<String>>(v).ok())
        .unwrap_or_default();
    if !hidden.contains(&path) {
        hidden.push(path.clone());
    }
    s.store.set("hidden-saves", &serde_json::json!(hidden))
}
#[tauri::command]
fn restore_hidden_saves(s: State<AppState>) -> Result<(), String> {
    s.store.set("hidden-saves", &serde_json::json!([]))
}
#[tauri::command]
fn get_state(s: State<AppState>, scope: String) -> Result<Option<serde_json::Value>, String> {
    s.store.get(&scope)
}
#[tauri::command]
fn set_state(s: State<AppState>, scope: String, value: serde_json::Value) -> Result<(), String> {
    s.store.set(&scope, &value)
}
#[tauri::command]
fn progress_history(s: State<AppState>, id: String) -> Result<Vec<serde_json::Value>, String> {
    s.store.history(&id)
}
#[tauri::command]
fn record_progress(
    s: State<AppState>,
    id: String,
    fingerprint: String,
    summary: serde_json::Value,
) -> Result<(), String> {
    s.store.update_summary(&id, &fingerprint, &summary)
}
#[tauri::command]
fn export_backup(s: State<AppState>) -> Result<serde_json::Value, String> {
    s.store.export_backup()
}
#[tauri::command]
fn restore_backup(s: State<AppState>, backup: serde_json::Value) -> Result<(), String> {
    s.store.restore_backup(&backup)
}
#[tauri::command]
fn undo_restore(s: State<AppState>) -> Result<(), String> {
    s.store.undo_restore()
}
#[tauri::command]
fn read_backup(path: String) -> Result<serde_json::Value, String> {
    use std::io::Read;
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let mut bytes = Vec::new();
    file.take(16 * 1024 * 1024 + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() > 16 * 1024 * 1024 {
        return Err("Backup file exceeds limit".into());
    }
    let backup = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    storage::backup_states(&backup)?;
    Ok(backup)
}
#[tauri::command]
fn write_backup(path: String, backup: serde_json::Value) -> Result<(), String> {
    use std::io::Write;
    storage::backup_states(&backup)?;
    let path = PathBuf::from(path);
    if path
        .extension()
        .and_then(|s| s.to_str())
        .is_none_or(|s| !s.eq_ignore_ascii_case("json"))
    {
        return Err("Choose a .json backup file".into());
    }
    let mut file =
        tempfile::NamedTempFile::new_in(path.parent().ok_or("Choose a backup directory")?)
            .map_err(|e| e.to_string())?;
    file.write_all(&serde_json::to_vec_pretty(&backup).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    file.as_file().sync_all().map_err(|e| e.to_string())?;
    file.persist(path).map_err(|e| e.to_string())?;
    Ok(())
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if std::env::args().any(|a| a == "--diagnose-artwork") {
        let art = artwork::load(artwork::discover());
        let catalog: serde_json::Value =
            serde_json::from_str(include_str!("../../data/catalog.json")).unwrap();
        let missing: Vec<_> = catalog["entries"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(|e| {
                let id = e["id"].as_str()?;
                (!art.sprites.contains_key(id)).then_some(id)
            })
            .collect();
        if std::env::args().any(|a| a == "--knowledge") {
            println!(
                "{}",
                serde_json::json!({"gameData":art.game_data,"schedules":art.schedules,"recipes":art.recipes,"items":art.items,"characters":art.characters,"monsters":art.monsters,"maps":art.maps,"translations":art.translations,"warnings":art.warnings})
            );
            return;
        }
        println!(
            "{}",
            serde_json::json!({"found":art.root.is_some(),"sheets":art.sheets.len(),"sprites":art.sprites.len(),"items":art.items.len(),"characters":art.characters.len(),"monsters":art.monsters.len(),"world":art.world.len(),"recipes":art.recipes.len(),"gifts":art.gifts.len(),"maps":art.maps,"warnings":art.warnings,"missingCatalog":missing})
        );
        return;
    }
    if std::env::args().any(|a| a == "--diagnose") {
        println!(
            "{}",
            serde_json::to_string(&discovery::scan(&discovery::default_roots())).unwrap()
        );
        return;
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            let store = Store::new(&dir).map_err(std::io::Error::other)?;
            app.manage(AppState {
                store,
                watcher: Mutex::new(None),
                artwork: Mutex::new(None),
            });
            if let Err(e) = watch(app.handle()) {
                eprintln!("Save watcher unavailable: {e}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_saves,
            sync_journal,
            set_connection_plan,
            connection_status,
            launch_connected_game,
            request_farm_layout,
            farm_layout_result,
            journal_receipt,
            undo_journal,
            add_directory,
            remove_directory,
            import_save,
            hide_save,
            restore_hidden_saves,
            get_state,
            set_state,
            progress_history,
            record_progress,
            export_backup,
            restore_backup,
            undo_restore,
            read_backup,
            write_backup,
            get_artwork,
            read_steam_profile,
            steam_icons,
            get_game_translations,
            get_location_map,
            set_artwork_directory
        ])
        .run(tauri::generate_context!())
        .expect("Unable to start Stardew Companion");
}
