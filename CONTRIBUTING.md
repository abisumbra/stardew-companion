# Contributing

Start with `ARCHITECTURE.md`, `DATA_SOURCES.md` and `DEVELOPMENT_STATUS.md`.

1. Install Node 24.7+, Rust stable and your platform's Tauri prerequisites.
2. Run `npm ci` and `npm run tauri dev` in this project. Do not initialize a second application.
3. Keep game save access read-only. Never commit private saves, app databases, diagnostics or screenshots containing player data. Create synthetic fixtures for regressions.
4. Preserve unknown evidence rather than coercing absent data to zero. Never infer a Steam account unlock from a farm save. Add version-specific tests for gameplay changes.
5. Cite primary gameplay sources, record verification dates and supported versions, respect access restrictions and retain applicable content licensing. Follow `docs/KNOWLEDGE_IMPORT.md`.
6. Run `npm run check`, `npm run test:e2e`, `cargo test --manifest-path src-tauri/Cargo.toml`, `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, and `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`.
7. Update the changelog/status and describe concrete behavior, validation and remaining limitations in your PR.

Windows browser tests use installed Edge. CI installs Chromium. Verify native behavior on the relevant OS before claiming platform support. Installer builds are previews until all acceptance criteria pass. Never publish a stable release to conceal missing coverage.
