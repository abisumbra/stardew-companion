//! Explicit local inspection; game content stays in ignored artifacts/.
#[path = "../src/artwork/xnb.rs"]
#[allow(dead_code)]
mod xnb;
fn main() -> Result<(), String> {
    let mut args = std::env::args().skip(1);
    let root = args.next().ok_or("Pass the game directory")?;
    let output = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../artifacts");
    for asset in args {
        let path = std::path::Path::new(&root)
            .join("Content")
            .join(&asset)
            .with_extension("xnb");
        let name = asset.replace(['/', '\\'], "-");
        let mut reader = xnb::Xnb::open(&path)?;
        if asset.starts_with("LooseSprites/") {
            std::fs::write(
                output.join(format!("{name}.local.png")),
                reader.texture()?.png()?,
            )
            .map_err(|e| e.to_string())?;
        } else {
            let data = reader.data()?;
            std::fs::write(
                output.join(format!("{name}.local.json")),
                serde_json::to_vec_pretty(&data).unwrap(),
            )
            .map_err(|e| e.to_string())?;
            println!(
                "{asset}: {} entries",
                data.as_object().map_or(0, |d| d.len())
            );
        }
    }
    Ok(())
}
