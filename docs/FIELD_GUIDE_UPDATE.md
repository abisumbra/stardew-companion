# Field-guide update — 0.6.0

Verified on Windows, 2026-10-17. Changes extend the existing Tauri 2 project and preserve the 0.5.1 state-protection and backup fixes.

## Monster art and hunting

The original atlas frame is chosen per monster rather than applying one default crop. Bats use a visible wing pose; Duggies use an exposed 16×16 frame; Hot Head and Squid Kid no longer contain part of a neighboring frame. Squid, slime, crab, golem, ghost and humanoid frame dimensions are corrected. A contact sheet of all 73 local monster records was visually reviewed.

Hunting cards explain regional access, search strategy, documented floor bands and distinctive encounter behavior. Group goals expose every member, so the player can compare Duggy and Magma Duggy or the three crab types. Alternative Carbon Ghost/Tiger Slime locations have separate routes. Normal and dangerous locations remain distinct. Known empty saved kill counters display zero rather than unknown.

Original entrance/approach maps can be opened directly from a hunting card. No arbitrary generated mine layout or monster coordinate is presented as an actual spawn. Slime tint and Royal Serpent head-only previews are labeled.

## NPC daily schedules

The schedule section has date and weather controls, automatic selection, readable manual variants, numbered times/destinations, recognizable activities and facing direction. Departure times are distinguished from explicit arrival times; no walking-duration estimate is invented. Original script identifiers are folded into reference details.

Parser repairs cover case-insensitive keys, spouse job priority, any-farmer friendship checks, unknown conditions, default/home bed destinations, married returns, quoted dialogue keys, omitted map names and malformed times. No game script is executed. A section navigation bar makes schedules/gifts/events/profile reachable without hiding the rest of the guide.

Maps display only the numbered stops for their current location. Changing maps clears a previous location's destination. Weather uncertainty, random rainy variants, festivals, marriage and special overrides are explicit. These are reference scenarios; live resort visits and all passive-festival/story branches are not simulated.

## Detailed maps

The default view fits the whole original area. Players can drag to pan, use preset/incremental zoom, focus a destination and return to Fit. Start/destination selection has explicit modes, keeping exploration from accidentally changing the route. Visible target/stop markers, a legend, friendly place names and grouped connecting exits make the map easier to read. Exact tile controls remain available in a folded section with keyboard support.

The resize observer follows the actual viewport element, including language-driven render changes. This fixes a map shrinking to a tiny preview after switching languages. Static collision and known saved obstacle limitations remain visible.

## Perfection and farmer identity

Completed, incomplete and unknown entries have separate filters and counts. Cooking/crafting/fishing/shipping show action-specific labels. A learned recipe is not shown as completed until its saved action exists. Each row describes the remaining action, with optional raw saved evidence. Criteria show earned/max points and explain binary awards.

Filters, sorting, evidence and filtered planning sit at the panel's top right. The detail drawer's planning action also sits next to Close at the top and stays reachable while scrolling. Compact windows use a criterion picker. All new guidance and criterion headings have Turkish translations.

Personal criteria carry the best farmer's stable ID, including duplicate names. Opening a Perfection detail shows that farmer's evidence without changing the active plan. Explicitly planning the objective selects that farmer. Shared world criteria retain the current farmer selection.

## Verification

- 90 frontend/domain/localization tests, 42 native Rust tests and 22 UI regressions passed: **154 total**, excluding duplicate tests compiled into diagnostic examples.
- TypeScript, production frontend build, Rust formatting and all-target Clippy passed.
- Local art: 7,524 sprite references, 6,017 Turkish strings, zero warnings. The default monster gallery has zero missing-art cards. All 73 monster previews decoded and were visually checked.
- Real-art UI checks use synthetic progress only. Nine ignored screenshots cover the contact sheet, gallery, monster guide, original maps, schedules, Turkish layout and 1000px/130% text. The checked Mountain canvas contained 1,274 sampled colors; no runtime/console errors occurred.
- Browser regressions exercise map fitting, drag-to-pan, zoom values, per-location markers, route changes, Turkish labels, completion/recipe separation, top-right actions and farmer identity. The last layout refinements were checked again in the affected cases.
- Original game/save files are read only. No private saves, textures, screenshots or extracted game dictionaries enter the distributable.

Optional local visual verification: generate ignored metadata with the native `artwork_probe` and `tilemap_probe` examples, then run `node scripts/verify-experience-ui.mjs`. The script expects ignored Town, Forest, Mountain, Mine, SeedShop and ScienceHouse map diagnostics.

## Package

The Windows x64 release executable and NSIS installer compiled successfully as **0.6.0**. The standalone ZIP contains 13 explicitly checked application/notices/documentation files and is accompanied by SHA-256 checksums. The final release executable also loaded 7,524 sprite references and 73 monster records with zero warnings and zero missing collection artwork. This is an unsigned development preview. The existing installed application is not replaced during tests; installation, upgrade and removal are not claimed as verified.
