//! Optional local serializer QA. Only synthetic XML is written in ignored artifacts.
use stardew_companion_lib::journal::{self, JournalTask, Tracking};
fn main() -> Result<(), String> {
    let task = JournalTask {
        id: "cooking:236".into(),
        title: "Balkabağı Çorbası pişir".into(),
        description: "Bir kez pişir. Ödül yoktur.".into(),
        objective: "Balkabağı Çorbası pişir".into(),
        tracking: Some(Tracking::RecipeCrafted {
            item_id: "(O)236".into(),
        }),
    };
    let updated = journal::patch(
        include_str!("../tests/fixtures/minimal.xml"),
        "123",
        &[task],
    )?;
    let document = roxmltree::Document::parse(&updated).map_err(|e| e.to_string())?;
    let quest = document
        .descendants()
        .find(|n| n.has_tag_name("Quest"))
        .ok_or("No quest")?;
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../artifacts/native-recipe-quest.local.xml");
    std::fs::write(path, &updated[quest.range()]).map_err(|e| e.to_string())?;
    println!("Synthetic vanilla recipe quest written; no game saves accessed.");
    Ok(())
}
