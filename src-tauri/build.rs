fn main() {
    // Cargo-only builds must never embed an older bridge than the checked-out sources.
    let root = std::path::PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap())
        .parent()
        .unwrap()
        .to_path_buf();
    let inputs = [
        "bridge/Companion.Bridge.csproj",
        "bridge/StartupHook.cs",
        "bridge/Runtime.cs",
        "bridge/Protocol.cs",
        "bridge/FarmTransfer.cs",
        "bridge/GoalText.cs",
        "src/locales/bridge-goals.json",
        "scripts/build-bridge.mjs",
        "scripts/build-bridge-text.mjs",
    ];
    for input in inputs {
        println!("cargo:rerun-if-changed=../{input}");
    }
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        let output = root.join("bridge/dist/Companion.Bridge.dll");
        let built = output.metadata().and_then(|m| m.modified()).ok();
        let stale = built.is_none()
            || inputs
                .iter()
                .any(|s| root.join(s).metadata().and_then(|m| m.modified()).ok() > built)
            || !root.join("bridge/dist/0Harmony.dll").is_file();
        if stale {
            let result = std::process::Command::new("node")
                .arg("scripts/build-bridge.mjs")
                .current_dir(&root)
                .status()
                .expect("Node.js is required to build the bundled connection");
            assert!(result.success(), "Bundled connection build failed");
        }
    }
    tauri_build::build()
}
