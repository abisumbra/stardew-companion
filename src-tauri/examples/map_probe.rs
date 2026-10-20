//! Local, opt-in inspection of installed map assets. Outputs stay in ignored artifacts/.
#[path = "../src/artwork/xnb.rs"]
#[allow(dead_code)]
mod xnb;

fn main() -> Result<(), String> {
    let root = std::env::args()
        .nth(1)
        .ok_or("Pass the installed game folder")?;
    let content = std::path::Path::new(&root).join("Content");
    let output = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../artifacts");
    let data = xnb::Xnb::open(&content.join("Data/WorldMap.xnb"))?.data()?;
    std::fs::write(
        output.join("map-data.local.json"),
        serde_json::to_vec_pretty(&data).unwrap(),
    )
    .map_err(|e| e.to_string())?;
    for name in ["map", "map_summer", "map_fall", "map_winter", "map_island"] {
        let texture =
            xnb::Xnb::open(&content.join(format!("LooseSprites/{name}.xnb")))?.texture()?;
        std::fs::write(output.join(format!("{name}.local.png")), texture.png()?)
            .map_err(|e| e.to_string())?;
        println!("{name}: {} × {}", texture.width, texture.height);
    }
    Ok(())
}
