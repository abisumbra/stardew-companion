//! Explicit public-data network QA. No account credentials or game saves are used.
fn main() {
    let root =
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../artifacts/steam-icon-qa");
    let icons =
        stardew_companion_lib::steam::icons(&root, true).expect("official achievement icon fetch");
    println!("Official achievement icons cached: {}", icons.len());
    assert_eq!(icons.len(), 49);
    assert_eq!(
        stardew_companion_lib::steam::icons(&root, false)
            .unwrap()
            .len(),
        49
    );
    let profile = stardew_companion_lib::steam::read_profile("ConcernedApe")
        .expect("public developer profile read");
    println!(
        "Public profile catalog validated: {} achievements; no account state persisted",
        profile.observed_total
    );
}
