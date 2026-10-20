# Stardew Companion

Version **1.0.0**. Windows downloads are available on the [Releases page](https://github.com/abisumbra/stardew-companion/releases). The application and desktop icons use the original Krobus NPC portrait.

A local desktop field guide for Stardew Valley, built in the existing Tauri 2 + React + TypeScript + Rust project. Save scanning is read-only. An optional bundled game connection runs when Stardew Valley is launched from Companion; no separate SMAPI/mod installation is needed. **Development preview, not a stable release.** No required account, telemetry or save uploads.

## Working features

- **0.11:** fluid farm/home workspaces with wheel zoom, auto-fit, expanded view, drag/paint/erase and one-stroke undo; six original home templates and independently saved furniture designs; horizontal storage cards with correctly linked interior maps; Steam completion tabs. Home furniture transfer and renovation reconstruction are not included. See [design controls and limits](docs/DESIGN_WORKSPACE.md).

- **0.10:** bundled single-player Windows 1.6.15 connection, measured journal task removal while Companion is closed, saved eight-layout Farm Designer with guarded object placement/moves, Storage Finder, fitted monster art, optional public Steam verification/49 official icons, and twelve language choices. Building/crop application and fully translated long guides remain outside this milestone. See [usage and limits](docs/CONNECTION_DESIGN_STORAGE.md).

- **0.9:** supported cooking/crafting tasks use the game's own completion events after a new transfer (1.6.9+). Zero-reward tasks leave the game journal when completed. Added quality/sell-price tables, ingredient-dependent pricing, readable next steps, collection status filters and a unified [translation source](src/locales/README.md). See [usage and verification](docs/WORKFLOW_AND_LOCALIZATION.md).

- **0.8:** saved goal confirmations persist per farmer. Progress made while Companion is closed is detected on its next launch; personal notes remain manual. Old in-game reminders can be removed after a new game save through an explicit game-closed transfer. Animal previews have consistent visible sizes, and Turkish coverage adds 598 display entries plus more local game translations. See [saved progress and display repairs](docs/SAVED_PROGRESS_AND_LOCALIZATION.md).

- **0.7.1 fix:** journal transfer no longer falsely reports a changed save when the file has a UTF-8 BOM. Restart with the updated app and rescan once. A real changed-save refusal also offers a nearby rescan button; transfer still requires a separate explicit click.
- **0.7:** optional reward-free Planner notes in the game's quest journal; close the game, open **Smart Planner → In-game quest journal**, select notes and transfer, then reload the save. Backups and unchanged-save undo are included. See [journal transfer details](docs/JOURNAL_AND_FESTIVALS.md).
- Twelve illustrated festival guides with year-specific original maps, shopping/contest advice, individual Wiki references and preparation tasks. Leo's portrait identity, Animals category, location names/maps and matching category headings are repaired. Changing language preserves the current guide selection.
- Automatic save discovery, multiple directories, individual imports and a persistent farm selector.
- Real farmer/date/version metadata, safe bounded XML parsing, native notifications, debouncing, stable reads/retries, last-sync timestamps and descriptive errors.
- Versioned 1.5/1.6 vanilla catalogs. For 1.6: 154 shipping entries, 81 dishes, 149 craftables (Wedding Ring excluded) and 72 fish. Missing entries are named individually. Ownership and recipe knowledge never substitute for completing an action.
- Eleven Perfection criteria, the best single farmer per multiplayer category, all-or-nothing Stardrop/monster goals and separate waiver points. Unsupported/absent data stays unknown.
- Official Steam catalog observed at 49 achievements on 2026-10-19. Optional public-profile verification, farm evidence, unknown states and manual confirmations remain separate.
- Goal planner with shared prerequisites/materials, reservations, priorities, pins, manual steps and farm-specific SQLite persistence.
- Searchable offline encyclopedia with 77 bundled guides plus installed-data guides for every cooking/crafting recipe, acquisition routes, crops, forage, buildings and machines. English/Turkish interface with local game translations.
- Fish dossiers with separate seasonal locations, split time windows, weather, Fishing level, access instructions, Crab Pot methods and Magic Bait planning. Actual in-game Valley/Island maps, seasonal textures, region highlights and focus controls come from the installed game.
- Villager profiles with original heart sprites, relationship caps/locked slots, selected-farmer gift/talk counters, 34 birthdays, five gift classes and 31 installed schedules with map stops.
- Monster base profiles, reference locations, loot rolls, combat advice and saved eradication targets/rewards.
- Museum donations, saved/remixed bundles and offering choices, 130 walnuts in 69 evidence groups, quest journals and optional planner goals. Original location maps add coordinates, zoom/grid and static walking routes.
- Recursive recipe/material planning includes deterministic machine inputs/fuel, output yields, profession-sensitive Crab Pots, farmer selection and one shared Junimo Chest pool.
- Pixel farm theme with wooden menus and parchment panels. Original item/recipe icons, portraits, monster variants, animal sprites and building previews are decoded read-only from your installed Stardew Valley 1.6+ game. Search, category filters and paged galleries keep large collections usable.

## Original game artwork

Wiki image access was denied by its robots policy during this update. No restriction was bypassed. The app uses original local game pixels; no Wiki images are claimed downloaded. Individual Wiki links now match English entry identities; derived URLs that have not been checked individually are labeled explicitly.

Version 0.5 adds corrected farmer/material evidence, quality-aware stacks, acquisition alternatives, repeated building targets, heart events, gift scenarios, documented monster floor bands, saved map obstacles/exits, detailed progress history and adjustable text size. The [repair log](docs/REPAIR_VERIFICATION.md) maps all 24 audited bugs to their fixes and checks.

Steam installations and additional Steam libraries are detected automatically. For GOG or another location, open **Settings → Original game artwork → Choose game folder** and select the folder containing `Content`. The companion reads XNB textures and item/recipe metadata without launching the game or installing mods. Assets are decoded in memory and reused as sprite atlases; they are not copied to the repository, app database or installer. Without a supported installation, the progress tools still work and missing artwork is marked explicitly. Local recipes describe the installed game's data; 1.6 plans expand their intermediate materials and deterministic processing rules. Older saves retain version-aware bundled rules.

Objects, machines, weapons, tools, hats, boots, shirts, pants, trinkets and furniture have item galleries. Portrait galleries include seasonal variants; monster sheets include dangerous variants. Building previews use source rectangles and static layers; animals show a first sprite frame. Shirts include default-color dye overlays. Prismatic animation, player-specific dyes, procedural variants, wallpapers/flooring and SMAPI virtual assets are not reconstructed.

Version 0.5.1 adds protected state loading, plan backup/restore and artwork repairs. See [follow-up repairs](docs/FOLLOWUP_REPAIRS.md) for verification and remaining limits.

Fishing maps use `Data/WorldMap` rectangles and the matching `LooseSprites/map` / `map_island` textures, including the atlas crops and seasonal variants. Known farm-type overlays follow the selected save; other progression overlays are omitted. Region outlines and entrance markers are reference locations, not confirmation that a region is unlocked or a tile is fishable. Detailed casting directions remain below the map. No map images are distributed.

## Run

Install Node 24.7+, Rust stable, .NET SDK 9 and [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). Windows needs MSVC C++ tools and WebView2. The SDK builds the bundled net6.0 connection; end users use the game's runtime and do not install an SDK. Bridge tests additionally require a .NET 6 runtime.

```sh
npm ci
npm run tauri dev
```

This starts Vite and Rust together. `npm run dev` alone is an honest browser preview without native save access. Close an existing Vite on port 1420 before using `tauri dev`.

## Build and install

```sh
npm run tauri -- build --bundles nsis
```

On Windows the setup executable is generated under `src-tauri/target/release/bundle/nsis/`. MSI is also configurable with `--bundles msi` when WiX/Windows prerequisites are available. These are unsigned development packages; see DEVELOPMENT_STATUS.md for the actual local build result. Install and launch Stardew Companion to scan saves without modifying them.

The release executable in `src-tauri/target/release/` can run without installation when WebView2 is present. Data still lives in OS app-data; this is not a self-contained portable-data mode. Linux/macOS packaging is prepared in CI, pending native validation.

## Saves

| Platform    | Default root                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| Windows     | `%APPDATA%\StardewValley\Saves`                                                                               |
| Linux/macOS | `~/.config/StardewValley/Saves`                                                                               |
| Proton      | Steam library's `steamapps/compatdata/413150/pfx/drive_c/users/steamuser/AppData/Roaming/StardewValley/Saves` |

Standard Linux Steam libraries are checked. Add custom libraries and container/Flatpak locations in **Save Manager**. Choose the full `FarmerName_ID` file, not `SaveGameInfo` or an `_old` backup. Only complete disk saves are scanned. The optional live connection separately observes supported action counters; live evidence does not replace saved evidence.

## Tests

```sh
npm run check
npm run test:e2e
cargo test --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

Browser tests use synthetic farms with IPC mocks. Windows uses installed Edge; CI installs Chromium with `npx playwright install --with-deps chromium`. No private saves are fixtures. Coverage includes action/ownership separation, corrupted/partial saves, discovery, missing data, versions, multiplayer, graphs, materials, farm switching, persistence, source metadata and basic accessibility.

## Privacy and licenses

Normal scanning is read-only; legacy backed-up journal exports require an explicit action with the game closed. The optional live connection changes game memory and leaves saving to the game. `companion.sqlite3` stores preferences, plans, Steam evidence, designs and summaries in OS app data (Windows: `%APPDATA%\com.stardewcompanion.app`). No uploads, analytics or launch-time scraping occur. Public Steam reads, picture downloads and source links require explicit actions. Cached icons are read offline on startup.

Original code/graphics: [MIT](LICENSE). Applicable wiki-derived knowledge: [CC BY-NC-SA 3.0](data/LICENSE.md), with noncommercial/share-alike obligations. See [third-party notices](THIRD_PARTY_NOTICES.md). Unofficial fan project with no endorsement by ConcernedApe or Valve.

## Limitations

Installed-data guides require a supported 1.6+ installation. Some event/achievement requirements, current weather, equipment, region access and live character positions still need checking in game. Static map paths cannot account for live objects/doors or generated floors. Normal gift forms are covered; preserved/quality/story variants can have extra rules. Some generated guidance, conditions and source text remains English in the Turkish UI. Mod-adjusted totals and Steam account verification are unsupported. See DEVELOPMENT_STATUS.md for the current validation record.

Automated wiki crawling is disabled: access restrictions/API availability were not established. See [data sources](DATA_SOURCES.md), [permitted local import](docs/KNOWLEDGE_IMPORT.md) and [development status](DEVELOPMENT_STATUS.md).

## Troubleshooting

- No saves: add the correct directory or import the full save; missing default directories are normal before a first game save.
- Save changing/invalid XML: finish the overnight save, then rescan. The last good snapshot is retained after a failed refresh. Never edit a game save to fix a companion error.
- Unknown progress: inspect the evidence panel; missing sections, unsupported versions and unimplemented rules are not counted as complete.
- Development network error: run `npm run tauri dev`; both processes use `http://127.0.0.1:1420`. Sandboxed environments may need the server and native process in the same network context.
- Cannot open database: ensure the app's own app-data directory is writable. Game directories need read access only.
- Storage totals: supplies use the selected farmer, ordinary chests/fridges and the shared Junimo list counted once. Other farmers' bags, lost-and-found and unsupported special/modded containers are excluded. Retrieve materials from distant storage before using them.
- Missing images: select the game installation folder in Settings and use Reload artwork after updating/replacing the game. The image loader requires the 1.6 data layout; 1.5 save analysis remains available. Individual unsupported textures are reported in Settings.

See [contributing](CONTRIBUTING.md), [architecture](ARCHITECTURE.md), and [changelog](CHANGELOG.md).
