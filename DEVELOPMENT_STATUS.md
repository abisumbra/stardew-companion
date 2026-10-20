# Development status

## 1.0.0 — local Windows output — 2026-10-20

Current sources packaged as 1.0.0 with synchronized application, installer and bridge versions. Windows x64 NSIS build succeeded. Output: `artifacts/Stardew-Companion-1.0.0-x64-setup.exe`; uninstalled ZIP: `artifacts/Stardew-Companion-1.0.0-windows-x64.zip`; hashes: `artifacts/SHA256SUMS-1.0.0.txt`.

TypeScript/production build, 136 frontend/domain tests, 41 native unit tests and 25 parser tests passed. Native tests initially encountered access-denied errors using the default temporary directory; all passed with TEMP/TMP inside the workspace. Application and bridge file versions verified as 1.0.0. The initial sandboxed packaging attempt could not download NSIS; the network-enabled retry completed. NuGet vulnerability data was unavailable (NU1900); bridge compilation succeeded. Packages remain unsigned development previews with existing feature limits. No installation/upgrade or real-game session was tested, and the installed application was not replaced.

## 0.12.0 — reliability and daily workflows — 2026-10-20

Five reviewed regressions fixed; persistent design recovery, selective backup restore/undo, shared connection status, transfer history, grouped editing, portable designs, game-date agenda and item-oriented storage added. See the [implementation and validation report](docs/0.12-WORKLOG.md), including remaining limitations. Source changes only; no replacement of the user's installed application.

## 0.11.0 — farm/home workspace and storage maps — 2026-10-20

[Controls and limits](docs/DESIGN_WORKSPACE.md). Farm and home design share continuous paint, drag, erase, cursor-centered wheel zoom, auto-fit and expanded workspaces. Home Designer has six original base templates, native furniture footprints/type filters, layered rugs and a separate backed-up library. Home furniture transfer, rotation, renovation reconstruction and wallpaper/floor editing remain unimplemented. Existing guarded farm-object transfer limits are unchanged.

Location, fishing, festival and NPC maps gain wheel zoom and expanded viewing. Storage uses a top strip, readable building addresses, original chest identity and original interior maps resolved from actual building links. Four original saves were read without modification: all 48 container maps resolved, no out-of-base-map coordinates or scan issues. Stock still updates after saving.

Steam completion tabs distinguish completed, incomplete and unknown while keeping the source of evidence on each card. New Turkish UI copy is centralized; the twelve-language authored guide coverage remains partial.

128 domain tests, 65 Rust tests and 42 browser cases passed. Six home/eight farm/two interior maps were visually inspected with original local pixels; compact Turkish had no horizontal overflow or runtime errors. This remains a development preview; home design is saved in Companion rather than applied to the game. The Windows 0.11.0 installer was built, checksum/embedded-assets verified and installed over 0.10.0. The app database was preserved byte-for-byte during installation; the updated window opened normally. Setup and a fourteen-file portable ZIP are in the ignored artifacts directory.

## 0.10.0 — bundled connection, designs and storage — 2026-10-19

Implemented in the existing project. [Current usage and limits](docs/CONNECTION_DESIGN_STORAGE.md) supersede older behavior below. This remains an unsigned development preview; a full game-window gameplay session and secondary-platform runtime behavior remain unverified.

- The optional original net6.0/Harmony bridge loads only into the child game started through Companion. No separate SMAPI installation, global environment changes or game-file modifications. It checks actual action counters on the update thread, removes only Companion quests without extra rewards/quest credit and records live results while Companion is closed. Windows vanilla 1.6.15 single-player only; unsupported versions/multiplayer are refused. Shipping completes after overnight sale processing. Unmeasurable/manual goals remain in Companion. Offline export now sends only natively tracked recipe tasks with font-safe English.
- Farm Designer supports all eight original layouts, original map canvas, object/building/crop palettes, coordinates, move/delete, undo/redo, saved libraries and backups. Navigation flush and serialized write-before-read protect quick edits. Guarded application supports compatible one-tile objects and existing moves from host inventory/learned single-output recipes. Buildings/crops remain design-only; no automatic removal, explosives, seed/fertilizer application or chest-material consumption. Partial native failure reports actual applied placements. Review the world before a normal game save.
- Storage Finder preserves saved container location/coordinates, equipment/item identity, quality and quantities; Junimo shared contents count once. Nested/unsupported containers and invalid quantities are not confirmed. Original map markers are shown only for supported identities. Storage updates after saving.
- Optional public Steam profiles are validated against the complete current 49-achievement catalog; Steam unlocks, save requirements and manual marks stay separate. Private/incomplete/unknown data cannot overwrite evidence. All 49 official icons downloaded and reread from an offline cache in local QA. The installer contains no proprietary pixels or private data.
- All twelve official languages are selectable. Each of ten newly added languages has 128 authored core/new-feature translations; Turkish has 1,832 entries. Other guide copy falls back to English explicitly. Local dictionaries retain private English lookup assets so language switches can resolve original game terms. Do not describe this as complete translation.
- Additional repairs: native Netcode dictionary `.Pairs` enumeration; actual quest field/collection compatibility; child-only startup environment; status I/O failure isolation; stale/future session guards; unique placement/design identities; duplicate-source chest move refusal; bomb rejection; full recipe batch material costs; qualified machine/equipment artwork; storage sprite overflow; normalized visible monster bounds; and corrected Italian/Japanese translation column ordering.

**246 automated checks passed:** 124 frontend/domain, 63 Rust, 38 browser UI and 21 bridge checks; five actual-game compatibility groups also passed. TypeScript, production frontend compilation, Rust formatting and Clippy passed. Real-art audit: 7,538 references, no unexplained blank images; all eight farm maps rendered. Four original saves/48 containers validated against frontend schemas without changing raw save fingerprints. Three containers with legacy equipment in the 1.5.6 save remain uncertain; the three 1.6 saves have confirmed container parsing. Additional verification and Windows installation results are recorded in [the work log](docs/0.10-WORKLOG.md).

Synthetic fixtures cover save writes; development never modifies original player saves. Real installed game types are used only in an isolated no-window compatibility harness. Older entries below describe their own historical releases, not the current live connection or translation behavior. The nonfatal >500 kB frontend chunk warning and macOS bundle-identifier advisory remain; the existing application identity is retained to preserve user data.

**Windows installation verified:** the final NSIS setup completed successfully and upgraded the existing 0.9.0 installation to 0.10.0. The installed executable matches the tested release after accounting for Tauri's one official NSIS metadata marker, and both embedded bridge DLLs match exactly. The app window opened/responded; 49 official achievement pictures are available in its offline cache. No Steam account was automatically selected. Post-install original-save fingerprints remain unchanged. Setup/portable ZIP checksums and the thirteen-file package allowlist are verified. Uninstall remains untested.

Next priorities: a complete game-window playthrough of connection behavior, guarded building/crop placement, remaining authored guide translations, legacy 1.5 equipment identity adapters and reducing the largest shared frontend chunk.

## 0.9.0 native action tasks, prices and readable planning — 2026-10-18

Supported cooking/crafting exports now use the vanilla recipe event through `CraftingQuest` on 1.6.9+ saves. Existing 0.8 reminders need one fresh game-closed transfer. A zero-reward completed task is removed by the game; no reward-claim box is expected. Other goal types remain explicit reminders. No mod, external runtime bridge or background service is installed. See [usage and limits](docs/WORKFLOW_AND_LOCALIZATION.md).

- **201 tests passed:** 115 frontend/domain/localization, 54 Rust and 32 browser cases. The affected final copy/layout cases were rerun. TypeScript, frontend production compilation, Rust formatting and Clippy passed.
- Isolated vanilla 1.6.15 serialization retained the Rust-generated Turkish title/description/objective and actual subtype. The native recipe-event probe matched the intended object and rejected another. Source inspection confirms cooking calls the same event. No original saves were touched; a full game-window gameplay session remains unverified.
- Price tables cover quality availability, current installed values, saved profession/profit-margin estimates, flavored product inputs and separate equipment rules. Unknown evidence, older versions, durability/forging, fruit-origin assumptions and shared-wallet effects are explicit. Native float32 rounding was cross-checked, including 839.99994 → 839.
- All **7,535 sprite references**, including **2,456 gallery entries**, were checked. The combined pixel audit covers 7,538 IDs: zero decode failures/unexplained blank sprites and three original empty/unused entries with explanations. Canonical reference audit repaired wildcard seeds; original quality stars were added. Loader: **6,283 Turkish game strings, zero warnings**.
- Planner overview, dependency-aware next steps, goal/status filters and expandable preparation details are integrated with the Dashboard. Game-journal quest planning is removed, and collections use complete/incomplete/unknown filters and counts.
- Authored language sources are unified under `src/locales`: **2,862 indexed English keys and 1,700 Turkish entries**. Remaining keys fall back to English; some are reference names/error templates rather than displayed untranslated screens. Local game terminology takes precedence; proprietary game strings remain excluded from source/packages. English override generation avoids bundling the duplicate English catalog.
- The largest frontend chunk is about **452 kB before gzip**, below the default bundler warning threshold. Windows installation/upgrade/removal, Linux/macOS runtime behavior and a full gameplay session remain unverified. Packages remain unsigned previews; existing installations are not replaced.

The final **0.9.0 Windows x64 executable and NSIS installer built successfully** (build exit code 0). The standalone ZIP contains sixteen explicitly allowed application, notice and documentation files. Packaging checks the executable version, archived executable hash and exact file list, then writes SHA-256 checksums for both downloads. No original save data or extracted game artwork is included, and no installer was run against the existing user installation.

## 0.8.0 saved progress and display polish — 2026-10-18

The app remains mods-free by user choice. Supported goal progress is reconciled after a game save while Companion is open, or on the next launch after playing with it closed. Per-farmer confirmations persist in app-owned storage. No process runs while Companion is closed. Personal notes remain manual, and vanilla game-journal reminders cannot complete live; they are refreshed/removed through the next explicit game-closed transfer. See [behavior and limits](docs/SAVED_PROGRESS_AND_LOCALIZATION.md).

- **185 tests passed:** 105 frontend/domain/localization, 52 Rust and 28 browser UI cases. TypeScript, the production frontend build, Rust formatting and Clippy passed. The last localization refinements passed the affected suite again.
- Repaired removal of old Companion notes after newer saves invalidate exact undo; namespaced quest IDs; unsupported-version collection confirmations; circular planning of Companion reminders; Unicode-safe text truncation; selected farmer fallback; display-language dates and protected personal save-selector names.
- **42 animal previews** now trim transparent padding inside the first frame and fit a consistent 48px longest side in the checked gallery. Aspect ratios are preserved. Baby/pet labels and corresponding Wiki sources are repaired.
- Added **598 Turkish translation entries**, normalized display lookup and added local legacy display fields. Real installed-data extraction reports **7,532 sprite references, 6,283 Turkish strings and zero warnings**. No extracted game text, pixels or private saves are bundled into packages.
- Real-art QA checked ten Turkish sections plus fish, Leo and monster details, all twelve festival guides and a 1000px/130% layout. The targeted rendered-text audit and browser runtime checks reported no remaining detected issues; this is not an exhaustive translation guarantee for all possible game content.
- The initial JavaScript chunk is about 753 kB before gzip; the bundler's nonfatal size warning remains a performance follow-up. Windows installation/upgrade/removal and a full game-window journal session remain unverified. Original saves are not written during development; journal write tests use temporary synthetic XML.

The previous 0.7.1 BOM fingerprint correction and all closed-game, backup, stale-save and exact-undo guards remain enabled.

The final **0.8.0 Windows x64 executable and NSIS installer built successfully** (build exit code 0). The standalone ZIP contains fifteen explicitly allowed application, notice and documentation files. Packaging verifies the archived executable against the release build and writes SHA-256 checksums for both downloads. No installer is run against the existing user installation.

## 0.7.1 journal rescan correction — 2026-10-18

Fixed the false “The save changed. Rescan before transferring tasks” refusal for UTF-8 BOM saves. The stable scanner previously stripped the BOM before hashing; the writer correctly hashed raw bytes, so identical files appeared different. The scanner now parses and fingerprints the original bytes. The original BOM is preserved during transfer and undo; stale-save, closed-game, backup and integrity guards remain enabled.

- **176 tests passed:** 98 frontend/domain/localization, 51 Rust and 27 UI cases. TypeScript, production frontend compilation, Rust formatting and Clippy passed.
- A new native regression exercises the real stable scan → transfer → rescan → receipt lookup → exact undo, for synthetic saves with and without BOM.
- A new bilingual UI regression verifies that a genuine changed-save refusal explains why writing stopped and offers a nearby read-only rescan. No transfer is retried automatically.
- Original save headers were inspected read-only to identify the BOM issue. All transfer and restore tests used temporary synthetic files; no original save was modified.
- Windows x64 executable and NSIS installer rebuilt successfully for **0.7.1**. The standalone ZIP contains fourteen allowed application/notice/documentation files; its executable is checked against the release build and both packages have SHA-256 checksums. Existing installed applications were not replaced.

Restart using 0.7.1, keep the game closed, rescan once and review the selected farm/notes before transferring. Version 0.7.0's warning can persist after rescanning on BOM-prefixed saves; use the corrected version.

## 0.7.0 journal and festivals — 2026-10-18

The existing project now includes explicit reward-free Planner journal transfers, twelve bilingual illustrated festival guides, original year-specific festival maps and preparation tasks. Leo's base/winter portraits, Animals-only gallery, category headings, direct Wiki links, location labels/map identities and language-switch state retention are repaired. See [implementation and verification](docs/JOURNAL_AND_FESTIVALS.md).

- **174 test cases passed:** 98 frontend/domain/localization, 50 Rust and 26 UI cases. Three existing UI selectors were scoped to personal-task rows after the new collapsed journal preview added duplicate text, then rerun successfully.
- TypeScript, production frontend compilation, Rust formatting and Clippy passed. The initial frontend chunk is about 685 kB before gzip; the bundler's size warning remains a performance follow-up.
- The installed vanilla 1.6.15 Quest serializer and display getters preserved a Turkish Rust-generated note. Synthetic XML tests verify zero reward, unrelated bytes, farmer scope, backup/undo and refusal to overwrite changed saves. No original saves were changed. The actual game window was not used for a full gameplay-session test.
- **18 festival and 8 farm maps** decoded successfully. All twelve guides' icons and Leo's portrait rendered without missing images or runtime errors. Turkish text and a 1000px/130% layout were visually reviewed.
- Local artwork loader: **7,532 sprite references**, **6,017 Turkish strings**, zero warnings. Wiki image requests were denied by robots policy; no Wiki images are claimed downloaded. Proprietary pixels and private data remain excluded from packages.
- The **0.7.0 Windows x64 application and NSIS installer built successfully**. The standalone ZIP uses an explicit application/notice/documentation list with SHA-256 checksums. The preview is unsigned; existing installed applications were not replaced and installation/upgrade/removal was not exercised.

Journal transfer requires closing the game, explicitly transferring selected notes, then reloading the save. Automatic scans remain read-only. Undo is available only before newer game progress is saved. Backups remain in app-owned storage. Individual Wiki pages not reviewed separately are explicitly labeled as derived links. Runtime event objects and live locations remain outside static map previews.

## 0.6.0 field-guide update — 2026-10-17

Monster art, hunting routes, NPC schedules, detailed maps and Perfection evidence are improved in the existing project. See [verification details](docs/FIELD_GUIDE_UPDATE.md).

- **154 tests passed:** 90 frontend/domain/localization, 42 Rust and 22 UI tests. The affected UI cases were rerun after the compact-layout and Turkish-title refinements.
- TypeScript, production frontend compilation, Rust formatting and Clippy passed.
- Reviewed **73 original monster previews**, including exposed Duggy/Magma Duggy frames and complete Hot Head, Squid Kid, bat, crab, golem and ghost frames. Default monster-gallery cards have no missing artwork.
- Real original maps rendered with 1,274 distinct sampled colors in the checked Mountain view. Nine local screenshots cover monster art, hunting details, schedules, English/Turkish maps and 130% text at a 1000px window width. No browser runtime errors were detected.
- The local loader still exposes **7,524 sprite references**, **6,017 Turkish game strings** and zero artwork warnings. Proprietary pixels and private save data are excluded from packages.
- The **0.6.0 Windows x64 executable and NSIS installer built successfully**. An explicit-file standalone ZIP and SHA-256 checksums accompany the package. Installation/upgrade/removal remains untested; the preview is unsigned.

Schedule displays are conditional references, not live positions. Festivals, resort visits and story changes can override them. Generated dungeon maps/monster spawn positions are not reconstructed: monster maps show original approaches and entrances. Runtime sprite tinting and Royal Serpent body assembly remain explicitly labeled preview limitations.

## 0.5.1 follow-up — 2026-10-17

Six additional defects, backup/recovery flows and incomplete artwork are repaired; see [follow-up repairs](docs/FOLLOWUP_REPAIRS.md) for details and remaining product limits.

- **142 tests passed:** 82 frontend/domain, 41 Rust and 19 UI regressions.
- TypeScript, production frontend build, Rust formatting and Clippy passed.
- All **2,456 installed gallery records** checked: no broken PNGs, runtime errors or unexplained blank images. Three transparent original game records have explicit unavailable-artwork explanations.
- Local extraction: **7,524 sprite references**, **6,017 Turkish strings**, zero warnings. Building and shirt screenshots were visually reviewed.
- Windows x64 executable and NSIS installer built successfully for **0.5.1**. Installation/upgrade/removal was not exercised; the package remains unsigned.

## Previous 0.5.0 verification record

**0.5.0 development preview — audited correctness repairs and expanded guidance.**

Verified on Windows on **2026-10-16**. Work extends the existing Tauri project. This is an unsigned preview; it does not claim completion of every Master Prompt feature.

## Implemented and repaired

- Read-only save discovery/import, stable reads, notifications and application-owned SQLite persistence. Newer copies of the same farm win; custom-directory removal forgets related imports. Saves and problematic files can be hidden and restored.
- All 24 audited issues have specific fixes and regression evidence in [the repair log](docs/REPAIR_VERIFICATION.md). Selected-farmer evidence, uncertain inventory, malformed counters, category materials, machine identities, quality stacks, graph readiness/ownership, shared production, upgraded/repeated buildings and bundle choices are corrected. Supported colored objects and other object subtypes retain material identity.
- Versioned 1.5/1.6 vanilla progress, eleven Perfection criteria and 49 observed Steam catalog entries. More achievement counters, 39 positive saved in-game achievement IDs and remaining action guides are integrated. Steam account verification remains separate.
- Original local game artwork and maps; 22 game dictionaries, 31 NPC schedule files, 6,017 Turkish strings, and 132 heart-event references for 32 characters. No game scripts are executed and no proprietary art/dialogue is distributed.
- Original 18px heart rows, relationship caps and selected-farmer interactions. Five normal gift classes, quality/occasion/book estimates, special relationship gifts, marriage guidance, seen-event records and readable conditions.
- Monster group aliases, versioned insect totals, dangerous regions, documented floor bands, base statistics, loot and saved kill evidence.
- Installed cooking/crafting ingredients and unlock sources, crop/forage/location/building catalogs, deterministic machine rules and explicit fixed-offer purchases. Plans can compare supported alternatives, count building chains, preserve unknown quantities and show only relevant goal ownership.
- Museum, bundle, walnut and quest details with evidence, source references and planner actions. Saved qualities are reserved before lower-quality demand without consuming the same stack twice.
- Original farm-specific location maps, keyboard/coordinate controls, zoom/grid, known saved obstacle overlays and explicit exits to connecting maps. Missing verified floor-100 maps never substitute unrelated floors.
- Missing-fish seasonal filters, saved-date window reminders, birthdays and crop deadlines. Weather, live access and unsaved state remain checks in game.
- Detailed local history for all Perfection categories; 40-task plan pages, cached metadata indexes and lazy-loaded views. The largest initial JavaScript chunk is below the bundler warning threshold.
- English/Turkish controls and expanded generated translations. User names/notes and stored identifiers stay intact. Text-size choices are 100%, 115% and 130%.

## Verification

- **132 tests passed:** 78 frontend/domain/localization, 38 Rust and 16 UI regressions. Duplicate tests compiled into development examples are excluded from this total.
- TypeScript, production build, Rust formatting and Clippy passed.
- Real local metadata: **7,554 sprite references**, 22 dictionaries, 31 schedules, 132 heart-event references, 6,017 translations, **zero artwork/schema warnings**.
- All **456 applicable collection goals and 49 achievements** expanded individually without resolver or dependency errors. Combined cooking/crafting: **230 goals, 633 tasks**. This validates graph execution, not every possible in-game outcome or a globally optimal purchase plan.
- Real-art UI checks with synthetic progress: five gift classes, original hearts/two locked slots, Turkish event text, monster floor bands/empty results, map keyboard controls, connecting exits and 130% text layout. No browser runtime or console errors. Original maps must contain multiple rendered colors, not just an empty canvas.
- Four real saves are read locally for schema/progress checks. No private save data enters fixtures, tracked files or packages. Final native scan/hash and artifact results are appended below.

## Remaining limits

- Unsaved clock/weather, actions and live positions cannot be observed. Known saved obstacles are a partial collision overlay; unrecognized objects, modded content, doors and story-specific map changes may differ. Map exits can be followed; global multi-map travel optimization and generated mine layouts are not implemented.
- Unknown event/query clauses stay explicit checks. Festivals, random schedules and island visits can replace normal routes. Not every special-order/achievement chain is fully expanded or provable from supported saved fields. Missing journal entries do not prove completion.
- Normal gift forms are classified. Flavoured/procedural products, spouse adjustments and special interactions can add rules. Gift estimates are labeled base/scenario values, and special tea rules are separate.
- Purchase alternatives cover explicit deterministic offers; dynamic/random stock, modifiers, access and current prices require confirmation. Automatic selection is a heuristic, not a minimum-cost solver.
- Some generated or special native text remains English. Verified source pages are retained; individual unverified entries expose an explicitly labeled Wiki search rather than an invented URL.
- Unsupported special/modded storage, lost-and-found and other farmers' bags are excluded. Quality and quantity evidence does not establish physical access to a container.
- Installed dynamic metadata targets 1.6. Older saves retain bundled version rules. SMAPI virtual assets and mod-adjusted totals are unsupported.
- Windows installation/upgrade/removal, Linux/macOS runtime behavior, signing, a hosted GitHub release and an independent live Perfection comparison remain unverified. The existing installation outside the workspace is unchanged. The app identifier is retained for data compatibility; Tauri's macOS suffix advisory remains open for platform validation.

## Package and save verification

- The final Windows 0.5.0 NSIS installer and release executable compiled successfully. Both executable version fields report 0.5.0. The uninstalled ZIP includes the program, required notices and usage/status notes; SHA-256 checksums accompany the artifacts.
- The final executable scanned four original saves with zero issues. All four content fingerprints matched the fresh pre-verification baseline. Native artwork diagnosis found 7,554 sprite references, zero warnings and zero missing collection sprites.
- Earlier 0.1–0.4 packages are retained. No installer is run against the existing user installation; install/upgrade/uninstall behavior remains unverified.
