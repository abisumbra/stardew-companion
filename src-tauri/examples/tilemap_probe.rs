//! Local, ignored inspection of real installed maps; no saves are read or written.
use stardew_companion_lib::artwork::{self, tilemap};
fn main() -> Result<(), String> {
    let root = artwork::discover().ok_or("Installed game not found")?;
    let output = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../artifacts");
    for name in std::env::args().skip(1) {
        let map = tilemap::load(&root, &name, "spring")?;
        println!(
            "{name}: {}×{} tiles, {} layers, {} sheets",
            map.width,
            map.height,
            map.layers.len(),
            map.sheets.len()
        );
        std::fs::write(
            output.join(format!("tilemap-{}.local.json", name.replace('/', "_"))),
            serde_json::to_vec(&map).unwrap(),
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
