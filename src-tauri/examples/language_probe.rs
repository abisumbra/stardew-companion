//! Counts installed dictionaries. Does not export copyrighted game strings.
use stardew_companion_lib::artwork;
fn main() -> Result<(), String> {
    let root = artwork::discover().ok_or("Installed game not found")?;
    let art = artwork::load(Some(root.clone()));
    for code in [
        "en", "de", "es", "fr", "hu", "it", "ja", "ko", "pt", "ru", "tr", "zh",
    ] {
        let count = art.language_dictionary(&root, code)?.len();
        println!("{code}: {count} installed display translations");
        if code != "en" && count < 1000 {
            return Err(format!("Incomplete installed dictionary: {code}"));
        }
    }
    Ok(())
}
