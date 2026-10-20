# Third-party notices

Unofficial fan project, not affiliated with or endorsed by ConcernedApe, Stardew Valley, Valve or Steam. Their names and marks belong to their owners. The app icon and README banner include the original Krobus NPC portrait from the installed game at the user's request. Documentation screenshots show the application with synthetic farm/player data and locally decoded game artwork. Game artwork belongs to ConcernedApe and is not covered by the project's MIT license. Other game textures and sounds are not distributed as standalone assets.

- **Stardew Valley Wiki contributors:** applicable content is CC BY-NC-SA 3.0. See `data/LICENSE.md`, `data/sources.json`, `DATA_SOURCES.md`, https://stardewvalleywiki.com/ and https://creativecommons.org/licenses/by-nc-sa/3.0/ . Code licensing does not permit unrestricted commercial reuse of this content.
- **MouseyPounds/stardew-checkup:** collection identifiers/save-structure reference; MIT License; copyright (c) 2017 MouseyPounds. Full required notice: `research/CHECKUP_LICENSE`. https://github.com/MouseyPounds/stardew-checkup . Parser/engine are independently structured.
- **Steam / Valve:** official public listing https://steamcommunity.com/stats/413150/achievements/ . Attributed factual metadata; hidden descriptions are not invented. No account verification is implied.
- **Optional Steam profile evidence/icons:** explicit reads from steamcommunity.com and official shared.fastly.steamstatic.com images. No images are bundled; downloaded images remain in the user's application cache. Public unlock evidence is shown separately from save requirements; no login or achievement writes occur.
- **Harmony 2.4.3:** Andreas Pardeike and contributors; MIT, https://github.com/pardeike/Harmony . Bundled `0Harmony.dll` is used only by the optional game connection. Required full license: `research/HARMONY_LICENSE`. `Companion.Bridge.dll` is original project code; no Stardew Valley or SMAPI assemblies are bundled.
- **reqwest/rustls:** MIT / Apache-2.0 / ISC as applicable, https://github.com/seanmonstar/reqwest and https://github.com/rustls/rustls . Used for explicit public Steam reads over validated HTTPS.
- **Tauri/plugins:** MIT / Apache-2.0; https://github.com/tauri-apps/tauri .
- **React:** MIT; https://github.com/facebook/react .
- **Lucide:** ISC; https://lucide.dev/license . Interface icons are Lucide; the landscape is an original vector drawing. The Krobus app icon is a pixel-preserving representation of the first original NPC portrait frame from `Content/Portraits/Krobus.xnb`, owned by ConcernedApe. Its use does not imply endorsement.
- **ConcernedApe / Stardew Valley:** original game sprites and portraits remain proprietary. The application reads a user's installed copy in memory. The included Krobus icon/banner portrait and documentation screenshots are attributed exceptions; proprietary artwork is not licensed under this application's MIT license. The pixel landscape and wooden/parchment interface are original code-based artwork.
- **Pixelify Sans:** copyright 2021 The Pixelify Sans Project Authors; SIL Open Font License 1.1. Full notice and license: `data/PIXELIFY_SANS_OFL.txt`. Font is bundled for offline use through `@fontsource/pixelify-sans`.
- **XNB format references:** MonoGame content-reader documentation/source, https://github.com/MonoGame/MonoGame . The bounded reader is independently implemented; no MonoGame or Stardew managed code executes in the companion.
- **TBIN map format reference:** Casey Warrington's TBIN library, copyright 2017, MIT. See `research/TBIN_LICENSE` and https://github.com/mapeditor/tiled/tree/master/src/plugins/tbin/tbin . The tile-map decoder is independently implemented in Rust.
- **lzxd, lz4_flex, png and base64:** retain their upstream crate licenses; resolved versions are recorded in `src-tauri/Cargo.lock`.
- **Vite, Vitest, TypeScript, Zod, Prettier, Playwright and axe:** retain their respective package licenses. `package-lock.json` records resolved versions.
- **roxmltree:** MIT / Apache-2.0; https://github.com/RazrFalcon/roxmltree .
- **rusqlite:** MIT; https://github.com/rusqlite/rusqlite . SQLite is public domain: https://sqlite.org/copyright.html .
- **notify:** CC0-1.0; https://github.com/notify-rs/notify .
- **Serde, sha2, dirs and other crates:** upstream licenses apply. `src-tauri/Cargo.lock` records dependencies.

The UI displays source/content-license information. Downloaded development references are excluded from Git except required license notices.
