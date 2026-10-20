# Changelog

## 1.0.0 — Windows package — 2026-10-20

- Replaced the in-app brand, favicon and desktop/application icons with the original Krobus NPC portrait from the installed game; version remains 1.0.0.
- Packaged the current application, including the 0.12 reliability and daily workflow changes, as version 1.0.0.
- Synchronized application, installer and bundled game connection versions. Existing documented feature and validation limits still apply.

## 0.12.0 — reliability and daily workflows — 2026-10-20

- Fixed live goal re-addition, lost completion evidence, repeated transfer coordinates, stale connection state and editing before design loading completes.
- Added persistent design history/trash, group editing and portable design files; transfer preview and saved outcomes.
- Added selective backup restoration with undo and appearance settings, section recovery and sanitized diagnostics.
- Added game-date agenda and recurring tasks, planner-to-storage navigation, item totals, quality filters and local container labels.
- Shared connection/plan state, deferred secondary language bundles and strengthened translation, browser and release validation. See [limits and verification](docs/0.12-WORKLOG.md).

## 0.11.0 — design workspaces and interior maps — 2026-10-20

- Added independently persisted Home Designer with six original templates, furniture footprints, search/type filters and rugs beneath furniture.
- Reworked farm/home editing with one-layer camera zoom, fit, continuous paint preview, one-stroke undo, drag, erase, shortcuts and expanded workspaces. Shared maps support wheel zoom and large viewing.
- Moved storage selection to a top strip and resolved saved building instances through their original interior assets. Preserved actual chest artwork and displayed parent-building addresses.
- Added Steam completed/incomplete/unknown tabs while preserving the source of achievement evidence. Centralized the new UI copy and Turkish terminology.
- Home design remains local to Companion; furniture transfer, rotation and renovation reconstruction are not included.

## 0.10.0 — 2026-10-19

- Added bundled Windows 1.6.15 single-player connection, real action-based journal removal and app-independent result storage. No separate SMAPI install or game-file changes.
- Added saved Farm Designer for eight original layouts, inventory/recipe-aware guarded object placement and identity-preserving chest moves. Buildings/crops remain design-only.
- Added saved Storage Finder with contents, quality, coordinates, maps, search and shared Junimo counting.
- Added optional complete public Steam evidence and 49 official icon downloads with offline cache.
- Added twelve official language choices, central authored catalogs and on-demand installed terminology. Long-guide translation remains partial.
- Fixed native dictionary enumeration, preserved original-language dictionaries, sprite stretching in storage, monster padding, autosave navigation races, repeated source-object moves, unsafe explosives, mixed item qualifiers and recipe-batch rounding. Added compatibility, parser, domain, UI and real-art checks.

## 0.9.0 — native action tasks, prices and planning — 2026-10-18

- Replaced plain reminders with vanilla CraftingQuest tracking for supported cooking/crafting goals on 1.6.9+ saves. Exported tasks have a short action, zero rewards, no daily-quest credit and no follow-up quest. Existing exports need one new game-closed transfer. Reward-free completed tasks naturally leave the game journal; other goal types stay explicit reminders.
- Added per-quality sell/reference values from installed data, selected-farmer professions and saved profit margins. Ingredient selectors cover flavored artisan products. Missing evidence, unsupported quality, used equipment and shared-wallet estimates remain explicit.
- Audited all 7,535 sprite references and 2,456 gallery entries. Fixed wildcard seed artwork/availability and added original quality stars. Three unused records have empty native art and retain an explanation.
- Added Planner overview cards, dependency-aware next steps, goal/status filters, shorter readable summaries and expandable preparation details. Dashboard uses the same next-step presentation.
- Removed game-journal quest planning actions and added complete/incomplete/unknown collection filters and counts.
- Unified authored English/Turkish copy under `src/locales`, moved festival/achievement translations out of domain code, added message inventory/validation and prioritized installed Turkish terminology. English identity strings are omitted from runtime bundles.

## 0.8.0 — saved progress and Turkish polish — 2026-10-18

- Added per-farmer saved goal confirmations that persist across launches. Progress made while Companion is closed is reconciled on the next launch; personal notes and manual action marks remain manual. No mod or background service is installed.
- Fixed clearing old Companion journal notes after the game saves new progress, even when the exact-undo receipt has expired. Completed goals are excluded from the next explicit game-closed transfer. In-game notes remain reminders and cannot complete live.
- Trimmed transparent padding from the first animal frame and fitted every animal preview consistently. Cleaned up baby/pet names and their Wiki links.
- Expanded Turkish headings, achievements, routes, requirements, Planner and settings guidance. Added case/spacing/apostrophe-normalized lookup and local hat, boot and furniture display translations. Dates follow the selected interface language; personal farm/player names remain verbatim.
- Fixed namespaced quest IDs, prevented planning Companion reminders as new game goals, preserved Unicode at journal text limits and stopped unsupported-version collection actions from receiving completion confirmations.

## 0.7.1 — journal fingerprint correction — 2026-10-18

- Fixed a false stale-save refusal on UTF-8 BOM saves. Save scanning and journal writing now compare the exact same file bytes; repeated rescans can proceed without a persistent false mismatch. The BOM is preserved in the save and backup.
- Added a nearby rescan button and a clearer explanation for genuinely changed saves. Rescanning never retries a write automatically. Game-closed, fingerprint, backup and undo safeguards remain in place.
- Added a real scan → transfer → rescan → undo regression for synthetic saves with/without BOM and a bilingual stale-save recovery UI test. No original saves were changed.

## 0.7.0 — journal notes and festivals — 2026-10-18

- Added explicit mods-free, reward-free Planner journal transfers for 1.6 saves, full backups, process/fingerprint checks and protected undo. Existing story quests and other farmer data remain intact.
- Added twelve illustrated bilingual festival guides, odd/even-year original maps, individual Wiki references and deduplicated Planner preparation notes.
- Repaired Leo's texture identity and portrait variants, category headings, Animals-only gallery, unresolved location names, location map matching and item-specific Wiki links.
- Preserved view state when changing language and made the sidebar scroll at larger text sizes. Wiki image access was denied; original installed art remains the source of pixels.

## 0.6.0 — clearer field guides and completion evidence — 2026-10-17

- Corrected monster frame sizes and selected visible poses for buried enemies, bats, crabs and other variants. Reviewed all 73 local monster previews.
- Added hunting routes with access requirements, precise documented floor bands, encounter tips, original entrance maps and individually selectable eradication-group members.
- Replaced the short NPC schedule list with date/weather scenarios, readable variant labels, departure/arrival times, numbered stops, activities and per-location map markers. Fixed bed destinations, conditional uncertainty and case-insensitive selection.
- Added fitted original maps, drag-to-pan, zoom controls, target focus, visible markers, deduplicated exits and separate route-selection modes. Fixed stale targets/markers across maps and resizing after language changes.
- Expanded Perfection into complete/incomplete/unknown states, action-specific explanations, recipe-knowledge labels, saved evidence, point summaries and filtered planning. Actions sit at the top right; personal objectives keep the correct farmer identity.
- Improved Turkish guidance, compact-window navigation and large-text layouts. Game saves and installed files remain read-only.

## 0.5.1 — state protection and artwork repairs — 2026-10-17

- Fixed all six follow-up audit findings: failed-load writes, selected-farmer displays, unselected-farm history, shared-goal priorities, conditional acquisition identities and older-copy fallback.
- Added validated transactional plan backups, retry controls and an error recovery screen.
- Fixed horse/slime/crow/spider frames, shirt dye layers and building previews/identities. Empty original item artwork has an explicit placeholder.
- Added Turkish recovery/backup text and regression/visual checks. See [follow-up repairs](docs/FOLLOWUP_REPAIRS.md).

## 0.5.0 — correctness and expanded guidance — 2026-10-16

- Fixed the 24 audited issues: selected-farmer evidence, material readiness/ownership, shared root/intermediate outputs, stale bundle choices, machine/category/unknown inventory, malformed counters, completed goals, upgraded buildings, monster names/version totals/variants, farm maps, mine floor 100 fallback, protected player names, integer inputs, keyboard focus/maps, empty searches and newer imports/directory cleanup.
- Added quality-aware saved stacks, known saved map obstacles, related-map exits, explicit acquisition alternatives and repeated building requirements. Supported object subtypes retain inventory identity.
- Added broader achievement evidence, all remaining achievement action guides, objective details and expanded prerequisite graphs. Saved in-game achievement records remain separate from Steam account verification.
- Added 132 heart-event references for 32 characters from local event headers, condition explanations, gift quality/occasion estimates, special gifts, marriage guidance and documented monster floor bands.
- Added missing-fish filtering and date-window reminders, detailed progress history, 100/115/130% text sizes, more Turkish guidance, paged plans and cached/lazy-loaded views.
- Added runtime validation for consumed game metadata and regression coverage. See docs/REPAIR_VERIFICATION.md and DEVELOPMENT_STATUS.md for evidence and remaining limits.

## 0.4.0 — expanded game-data companion — 2026-10-16

- Added 20 installed game dictionaries, 31 character schedules and local Turkish game strings. English/Turkish UI selection preserves canonical game/planner identifiers.
- Replaced heart shapes with original filled/empty sprites; kept relationship caps/locked slots. Fixed unknown friendship states and incorrect NPC evidence text.
- Added all five normal gift preferences, personal/universal/category/context rules, search and selected-farmer bag checks.
- Added monster base profiles, loot rolls, tactics, dangerous artwork variants and saved eradication targets/rewards.
- Added actual location tile maps, coordinates, zoom/grid, static walking paths and NPC/walnut markers, including seasonal/nested mine textures.
- Added crop/forage/location/building catalogs, growth/deadline calendars, construction planning, machine guides and all installed cooking/crafting ingredients/unlock routes.
- Connected intermediate recipes and deterministic machine inputs/fuel/yields to material planning. Added farmer selection, profession-sensitive Crab Pots and Junimo inventory counted once.
- Added museum evidence, saved/remixed bundle definitions/choices, 69 evidence groups covering 130 walnuts, quest journals and optional planner goals.
- Fixed fishing filter-to-detail routing and persisted alternate routes/Magic Bait settings, including revising existing plans. Expanded regression and real-game-data checks.
- Game files remain read-only; proprietary pixels stay local and are excluded from packages. Remaining limits are recorded in DEVELOPMENT_STATUS.md.

## 0.3.0 — fishing maps & social profiles preview — 2026-10-15

- Added detailed, individually cited guides for all 72 fish, separate location/season routes, split time windows, weather, levels, access instructions, Crab Pot guidance and Magic Bait planning.
- Replaced the schematic fishing map with original menu-map textures read from the installed game. Valley/Island map regions, atlas crops and positions come from `Data/WorldMap`; seasonal images, stock farm overlays and focus controls are supported.
- Added saved friendship hearts with 8/10/14-heart relationship limits, locked romantic hearts, farmer selection and daily gift/talk evidence. Missing counters remain unknown.
- Added 34 villager profiles/birthdays, a seasonal birthday calendar, dashboard reminders and local personal loved-gift previews with bag availability.
- Improved body text size/spacing, visible route instructions, item descriptions, empty search states and evidence folding. Fishing planner tasks now request checking unobserved conditions.
- Added regression coverage for fish routes, Magic Bait access restrictions, social state, rectangle decoding, real-map selection/focus and missing-map fallback. Original game saves remain read-only.

## 0.2.0 — artwork & pixel theme preview — 2026-10-15

- Added a wooden/parchment pixel theme, offline Pixelify Sans font and original pixel farm landscape.
- Added read-only Steam game discovery and a game-folder picker; bounded in-memory XNB/LZX/LZ4 texture decoding requires no mods or game changes.
- Added item and recipe output/ingredient icons, NPC portraits and walking sprites, monster variants, animal sprites and building sheet previews.
- Added searchable, paged item galleries with category filters for objects, machines, weapons, tools, hats, boots, shirts, pants, trinkets and furniture.
- Retained explicit missing-art states, local source attribution and unmodified save/progress rules. Game artwork is not redistributed.
- Added decoder bounds/format tests and synthetic artwork UI regressions. Full gameplay-guide coverage and animated/dyed appearance reconstruction remain incomplete.

## 0.1.0 — development preview — 2026-10-15

- Replaced the Tauri welcome screen with an offline desktop field guide and nine connected views.
- Added read-only auto-discovery, bounded safe XML parsing, multi-farm selection, versioned collection progress, debounced file notifications and stable-read retries.
- Added application-owned SQLite migrations, per-farm manual planning, account-level manual Steam confirmations and progress summaries.
- Bundled attributed 1.5/1.6 catalogs, 49 observed Steam achievements and an initial verified guide subset.
- Added dependency expansion, shared materials, reservations, manual overrides, seasonal guidance and source/evidence panels.
- Added Rust/domain/browser tests, accessibility checks, CI and preview packaging configuration.
- Full guide coverage, optional completionist detection, Steam account verification and cross-platform runtime validation remain incomplete.
