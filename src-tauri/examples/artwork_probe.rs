//! Writes local-only QA artwork to the ignored artifacts directory. No save access.
use stardew_companion_lib::artwork;
fn main() -> Result<(), String> {
    let art = artwork::load(artwork::discover());
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../artifacts/artwork-current.local.json");
    std::fs::write(path, serde_json::to_vec(&art).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    println!(
        "Artwork QA: {} sprites, {} Turkish strings, {} warnings",
        art.sprites.len(),
        art.translations.len(),
        art.warnings.len()
    );
    Ok(())
}
