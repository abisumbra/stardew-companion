# Architecture

## 0.10 additions

`bridge/` is a small original net6.0 startup hook with Harmony. Native `connection.rs` launches the installed game with child-scoped environment variables and extracts only these two open-source DLLs to app data. Plans/results use bounded atomic JSON. The game's update thread evaluates actual action records and edits only namespaced Companion quests; no save-file writes occur. `FarmTransfer.cs` preflights exact native placement and shared inventory before supported object mutations. See [runtime scope](docs/CONNECTION_DESIGN_STORAGE.md).

`farm-design.ts` validates versioned, uniquely identified libraries. The designer persists via the existing serialized SQLite state writer, including a final navigation flush. `save/parser.rs` separately preserves container identity, quality stacks and farm object coordinates. `steam.rs` reads optional public profiles with complete catalog validation and caches allowlisted official JPEGs. Live evidence, saved evidence, Steam evidence and manual marks remain distinct. Twelve central authored catalogs are supplemented by local installed-language dictionaries, never exported into packages.

Stardew Companion is an offline Tauri 2 desktop application. Code is MIT; separately attributed wiki-derived knowledge is CC BY-NC-SA 3.0. This is a development preview until all acceptance criteria in DEVELOPMENT_STATUS.md pass.

## Boundaries

- `src-tauri/src/save/`: bounded, read-only XML parsing, platform discovery, stable reads. A farm identity combines the game's unique ID and host multiplayer ID, not its display name or filesystem location.
- `src-tauri/src/journal.rs`: explicit 1.6 journal transfer only. Rejects a running game or stale fingerprint; backs up the complete file, changes only the selected farmer's namespaced Companion quests and atomically replaces the save. Reward fields remain zero. Undo validates the backup and requires the exact post-transfer fingerprint. Ordinary scanning never calls this writer.
- Journal payloads can include validated `recipeCrafted` tracking for 1.6.9+ saves. Native XML uses the vanilla `CraftingQuest` subtype with a qualified item identity, type 2, daily=false, zero money and no next quest. The game's recipe event covers cooking and crafting. Other goals are base reminders. Neither external packets nor mods/services are used.
- `src-tauri/src/artwork/`: Steam-library discovery, canonical Content paths, bounded XNB decoding, PNG conversion and sprite resolution. Declarative field schemas describe 1.6 data. No managed game DLLs, game code or proprietary artwork are distributed; the optional connection's two open-source DLLs are separate.
- `src-tauri/src/storage.rs`: application-owned SQLite database, schema migrations, authorized directories, per-farm planner state, account-level manual Steam records, and progress history. Database lives in Tauri's app data directory, never in a save directory.
- `src-tauri/src/lib.rs`: typed IPC and a debounced native directory watcher. Background work does not block the webview. Only authorized/default directories can be scanned.
- `src/domain/`: validated IPC models, versioned knowledge, evidence-based progress, dependency expansion, resource reservation, season checks. Independent of React.
- `src/companion.tsx`: application orchestration, farm switching, persistence loading and event-driven refresh; navigation state is preserved on synchronization.
- `src/views/`, `src/components/` and `src/App.tsx`: separate page views, navigation, persistent farm selector, filters and actionable detail panels. Browser preview starts empty and cannot impersonate filesystem access.
- `src/components/Artwork.tsx` and `src/theme.css`: shared sheet CSS variables avoid duplicating encoded atlases in every card. Sprites use bounded crop rectangles and pixel rendering. Local images do not imply collection progress; the original wooden/parchment theme works without game assets.
- `src-tauri/src/artwork/maps.rs` and `src/domain/world-map.ts`: read installed menu-map layers/rectangles, choose stock seasonal/farm variants and match guide regions to native map areas. Unknown state queries are not evaluated; interior markers represent access points.
- `src/domain/fishing.ts` / `social.ts` and their guide components: individually cited route/birthday knowledge, separate saved-evidence checks, relationship caps and selected-farmer hearts. Fishing conditions stay unconfirmed when weather, clock, equipment or region access is unavailable.
- `data/`: bundled offline source manifest and catalog. Catalog coverage and detailed guide coverage are separate.
- `scripts/`: bounded, explicit source import and validation. No launch-time scraping or network use.

## Correctness

The 0.4 installed-data layer lives in `artwork/knowledge.rs` and the reflected public serialization schema. `gifts.ts`, `schedules.ts`, `monsters.ts`, `installed.ts`, `machines.ts`, `materials.ts` and `completion.ts` keep classification/planning/evidence logic separate from the UI. `artwork/tilemap.rs` decodes bounded native tBIN10 maps; `tilemap.ts` validates IPC and finds static paths. No game methods run. `locale.tsx` translates returned React text trees without changing control values, identifiers, event handlers or persisted game data; user-authored task text is excluded.

Known recipes, owned items and completed actions are different fields. Absent XML sections remain unknown. Unsupported versions retain basic metadata but cannot receive a Perfection score. Multiplayer uses the best **single farmer** per criterion, never a union of partial collections. Monsters and Stardrops are all-or-nothing Perfection criteria. Waivers are displayed separately. Account-level manual Steam confirmations never become Steam-verified unlocks.

## Synchronization

Native notifications are debounced. Stable reads compare metadata before/after a quiet interval and after the read, enforce byte/node limits, reject DTDs and incomplete XML, retry transient failures and publish an event. Fingerprints cover exact original UTF-8 file bytes, including any BOM, matching journal transfer/undo checks. The UI preserves navigation, farm selection and manual preferences. It only observes the last disk save. Manual preferences persist independently of regenerated tasks.

`domain/planner-completion.ts` reconciles tracked goals against current saved evidence after that farm's persisted plan loads. Confirmation receipts record the actual selected farmer, first confirming fingerprint and saved date in application-owned SQLite state. Failed-read retained snapshots create no new confirmations; reverted or unknown evidence withdraws confirmation for tracked goals. Scope guards prevent a farm switch from persisting another farm's plan. Manual tasks/step marks are never auto-completed. No process runs while the app is closed: the next startup scan observes progress made in the meantime.

Journal notes are a separate explicit export. A newer game save invalidates exact undo but does not prevent removing existing namespaced reminders with a fresh backed-up transfer. The game must be closed. Vanilla reminders have no live completion/packet bridge, and ordinary scans never write the save.

`domain/prices.ts` uses installed object/equipment definitions and explicit quality/product rules. Saved profit margin is read without a default; selected-farmer estimates never invent missing profession/version evidence. Float32 rounding follows the vanilla value pipeline. Dynamic product inputs and fixed equipment values remain separate. `domain/artwork-audit.ts` audits canonical references; `artwork-identity.ts` is the shared pure resolver for UI and audits.

Authored language catalogs, generated text rules and source references live in `src/locales`. Installed Turkish translations take precedence at display time; personal strings and canonical values are excluded. Build hooks emit only English overrides into a small runtime file while retaining the complete editable English catalog. `locale:collect` and `locale:check` maintain the inventory. Proprietary strings stay in the local artwork payload and are never copied into the source catalog.

## Security and privacy

No telemetry, login, cloud backend or automatic Steam calls. No XML external entity resolution. The webview has a restrictive CSP; paths from IPC are canonicalized against the authorized directory list. Native file pickers authorize additional roots. Source links open externally; downloaded knowledge is schema validated, never evaluated as code. Private saves and database files are excluded from Git.
