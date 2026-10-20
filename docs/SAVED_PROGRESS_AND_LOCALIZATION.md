# Saved progress and display repairs — 0.8.0

The user chose to keep the application mods-free. There is no SMAPI component, injected DLL, startup task or background service. The app cannot observe or complete a vanilla journal note live.

## Saved progress

While Companion is open, native directory notifications trigger a stable read of the latest game save. On launch, the app scans again and loads the matching farm plan before reconciling goal confirmations. A saved action that meets a supported goal removes that goal's generated work and records confirmation for the selected farmer. Confirmation stays separate from personal notes and manually checked steps.

When Companion was closed during play, the next launch reads the new save and records the result. It does not pretend to know the time of an unsaved action. Receipts retain the first confirming disk fingerprint and saved date. Unknown/reverted data withdraws confirmation for tracked goals; failed-read retained snapshots cannot create new confirmations. Old plans without receipt fields remain compatible through schema defaults.

## Game journal

1. Finish the supported action and let the game save normally.
2. Companion recognizes the saved result when open, or on the next launch.
3. Close the game before transferring the updated selection. Completed goals are excluded. To remove all old Companion notes, clear the selection and use Remove Companion notes.

Writing is always explicit, fingerprint guarded and backed up. Clearing notes now works even after a newer game save invalidates the previous undo receipt. Exact undo still refuses newer gameplay progress. Story quests and other farmers' notes are preserved. Personal free-text tasks must be marked manually. Companion's own reminders are not offered as new Planner quest goals.

## Display and Turkish coverage

Animal previews crop only nontransparent pixels in the first animation frame and fit the same display box without stretching the body. Baby prefixes and numbered pet appearances have readable labels. Wiki aliases lead to the appropriate animal page or Animals section.

Turkish lookup normalizes case, whitespace, curly apostrophes and display line-break markers. Stored IDs, conditions and user-authored text stay intact. Dates use the selected interface language. The native reader imports only known display fields from legacy hat, boot and furniture assets. New UI translations cover headings, status/evidence descriptions, achievement descriptions, route directions, conditions, Planner, maps and settings. This does not claim to translate arbitrary mod scripts or every unsupported game condition.

## Verification boundaries

All automated journal writes use temporary synthetic saves. UI progress is synthetic; original installed artwork is used only by ignored local QA probes. Packages exclude private saves, databases, proprietary art and extracted game translations. The existing installed application is not replaced during packaging. Actual installation/upgrade/removal and a full game-window session remain unverified.

The automated suite includes closed-app progress/relaunch reconciliation, per-farmer isolation, failed-load protection, clearing old notes without an undo receipt, namespaced quest IDs, unsupported versions, Unicode truncation and animal-frame bounds. The optional real-art check verifies 42 equal longest-side previews, Leo, twelve festival guides, map matching, Turkish screens and compact layouts.

185 cases passed (105 frontend/domain/localization, 52 Rust, 28 browser UI), together with TypeScript, production frontend compilation, Rust formatting and Clippy. After final sentence-splitting refinements, all frontend tests and the affected Turkish browser cases were rerun. Local artwork extraction returned 7,532 sprite references, 6,283 Turkish strings and no warnings. The new UI dictionary has 598 entries. The targeted rendered-text audit covers ten main sections and selected fish, Leo and monster details; it is not an exhaustive proof for every possible dialog. The initial JavaScript chunk remains about 753 kB before gzip and produces a nonfatal bundler size warning.
