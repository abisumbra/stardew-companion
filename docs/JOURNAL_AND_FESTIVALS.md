# Journal and festival update — 0.7.0

Windows verification, 2026-10-18. This extends the existing project and retains earlier state-loading, progress and artwork repairs.

## 0.7.1 follow-up: false rescan warning

The 0.7.0 scanner removed a UTF-8 byte-order mark before calculating its fingerprint, while the journal writer compared the original bytes. BOM-prefixed saves therefore falsely triggered “The save changed” even after rescanning. Version 0.7.1 keeps the BOM when parsing and fingerprinting; roxmltree accepts it and the writer preserves it. Existing protections remain unchanged. A genuine stale-file refusal now explains that nothing was written and offers a rescan button, without retrying the transfer automatically.

Use the updated application, rescan once, review the selected farm and notes, then transfer with the game closed. Original save headers were inspected read-only to confirm the issue; all transfer/undo verification used temporary synthetic files. The new regression goes through the real stable scanner, writer, receipt lookup and byte-exact undo for files both with and without BOM.

The 0.7.1 follow-up passed **176 tests**: 98 frontend/domain/localization, 51 native Rust and 27 browser UI tests, plus TypeScript, production frontend compilation, Rust formatting and Clippy.

Windows x64 application and NSIS installer rebuilt successfully for 0.7.1. A standalone ZIP and SHA-256 checksums accompany the fix. Package checks compare the archived executable to the release build and allow only fourteen application, license and documentation files. Existing installed copies were not replaced.

## Send Planner notes to the game

For Stardew Valley 1.6, close the game, open **Smart Planner → In-game quest journal**, select up to 80 pending goals/personal tasks, acknowledge that the game is closed and choose **Transfer selected notes**. Reload that save in the game. Entries use the `Companion:` title prefix and grant no money, items, friendship or achievement credit. They are personal reminders; cancel them in the game when finished or replace/remove them with the next transfer. The app does not inject live tasks into an open game.

Only this explicit action writes a save. Normal discovery, import, refresh and progress analysis remain read-only. The user's latest request explicitly authorizes journal writing, superseding the original read-only specification for this feature alone. No original saves were changed during development verification.

The writer identifies the selected farmer by multiplayer ID, keeps unrelated quests byte-for-byte, and changes only `StardewCompanion:` quest IDs in that farmer's journal. It validates the XML, version, limits and task text before writing. A full original file and transfer receipt are stored in the application's `journal-backups` directory. The save fingerprint and closed-game process check are repeated immediately before atomic replacement. Failure leaves the original file unchanged. Existing game `_old` files and `SaveGameInfo` are untouched.

**Undo last transfer** restores the exact backup only while the save still matches the post-transfer fingerprint. After the game writes a newer save, automatic undo is unavailable to avoid discarding new progress. Backup identity, canonical path, SHA-256 integrity and farm identity are checked before restoration. Backups remain on disk; no automatic deletion is performed.

Quest serialization was checked using the installed **vanilla Stardew Valley 1.6.15 Quest serializer and display getters**, with XML produced by the Rust writer. Custom Turkish title, description and objective survived serialization and reload. Tests used synthetic XML and temporary directories only. The original game window was not used to load a farm during this verification; this is not a full gameplay-session test.

## Festivals, locations and artwork

The sidebar has twelve festival/seasonal event guides. Each includes the date and entry window, travel location, illustrated priorities, relevant purchases/contest targets, limitations and an individual Wiki reference. Preparation steps become personal Planner tasks once per festival/year. New 1.6 events are excluded for 1.5 saves; year parity selects the appropriate original festival layout in 1.6.

All eighteen fixed festival map assets decoded successfully from the installed game. Trout Derby and SquidFest use their ordinary original Forest/Beach maps. Event actors, stalls and other runtime additions are not reconstructed. The maze advice and map-year selector distinguish odd/even Spirit's Eve layouts.

Leo's canonical NPC identity now resolves the `ParrotBoy` portrait texture; seasonal portrait names follow the same identity. The Animals gallery contains only animals; buildings retain their separate category. Main/category headings match their selection. Raw localization tokens in farm names are replaced with meaningful names, and location guides open the corresponding original map or an explicitly described fixed entrance for generated areas. Individual Wiki links use canonical English identities, documented aliases and appropriate island sections. Unverified derived page URLs remain visibly labeled.

Wiki images could not be downloaded: the image server returned a robots-policy denial. No alternate fetch route was used. All displayed pixels continue to come from the user's installed copy, and packages contain no proprietary artwork or private saves.

## Verification

**174 cases passed:** 98 domain/localization, 50 native Rust and 26 browser UI cases, with affected selectors rerun after the journal preview was added. TypeScript, production frontend compilation, Rust formatting and Clippy passed. The frontend's initial chunk remains about 685 kB before gzip and produces a nonfatal size warning.

Domain checks cover festival dates/versions/layouts, bilingual content and source references, journal export filtering/limits, readable names and direct Wiki aliases. Native tests cover exact unrelated bytes, story quests, another farmhand, idempotent transfer, backup/undo, stale saves, a game starting during transfer, tampered backups and path escape. Browser tests cover acknowledgement, transfer/undo, native refusal, category headings, festival filtering, preparation deduplication and preserving guide/year through a language change.

Optional real-art UI checks: `node scripts/verify-catalog-ui.mjs`, after local artwork/map probes. Ignored screenshots cover Leo, Animals, Pelican Town, Forest Farm, both Egg Festival layouts, Turkish festival text, 130% text at 1000px and the journal preview. All eighteen festival and eight farm assets decoded; the loader reports 7,532 sprites, 6,017 Turkish strings and no warnings. No farm progress is invented in the shipped app; these QA farms are synthetic fixtures only.

The Windows x64 application and NSIS installer built successfully for 0.7.0. A standalone ZIP contains fourteen explicitly allowed application, notice and documentation files, with SHA-256 checksums alongside both packages. The release is an unsigned preview. Installation, upgrade and removal are not exercised; existing installed applications are not replaced.
