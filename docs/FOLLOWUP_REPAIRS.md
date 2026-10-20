# Follow-up repairs — 0.5.1

## Behavior

- Failed planner/account reads leave editing disabled. Retry saved data reloads the original persisted state.
- Dashboard recommendations/greetings, encyclopedia completion and fishing filters use the selected farmer.
- Every scanned farm receives a full progress summary. Older basic-only history cannot be reconstructed without the original save snapshots.
- Shared tasks consider every owning goal's priority and pin. Manual tasks respect their selected priority.
- Acquisition identity includes output, yield and condition; existing route preferences remain readable.
- A failed read retains the last successful snapshot even when an older duplicate is readable elsewhere.
- Settings exports farm plans, notes, manual achievements and farm preferences. Import previews the count, validates all sections and restores matching scopes in one SQLite transaction. Unrelated farms remain intact. Export replaces the chosen JSON file atomically.
- An error recovery screen offers reload without clearing saved state. Recovery/backup controls have Turkish translations.

## Artwork

- Corrected Horse (32×32), Big Slime/Spider (32×32) and Crow (64×64) frames.
- Combined shirt base/dye layers using default RGB colors, restoring twenty invisible shirt previews.
- Buildings use metadata identities/source rectangles and unconditional static layers. Cabin/Farmhouse resolve correctly. Junimo Hut uses one 48×64 frame.
- Fish Pond uses its original 80×80 border with a schematic blue water fill. Dynamic fish, contents and live animation are not inferred.
- Portrait borders no longer clip their sprite content. Crop/museum references resolve to item art; achievements, quests, locations, bundles and gold have deliberate interface icons.
- Three original records (Slime Crate 925, Camping Stove 927, Hedge 929) have fully transparent artwork. They remain searchable with an explicit unavailable-artwork explanation.

## Verification

Regression coverage includes state-load failures/retry, all-farm history, shared priorities, duplicate saves, shop conditions, backup import/export, transactional restore and sprite alpha/frame handling.

Verified on 2026-10-17: 82 frontend/domain tests, 41 Rust tests and 19 UI tests passed (142 total). TypeScript, production frontend build, formatting and Clippy passed. All 2,456 gallery records were checked: zero runtime/decode failures, zero unexplained blank images, three explained unavailable originals. Building and shirt screenshots were visually reviewed.

Optional local visual check: `cargo run --manifest-path src-tauri/Cargo.toml --example artwork_probe`, then `node scripts/verify-artwork-ui.mjs`. It checks every installed gallery entry and captures screenshots under ignored `artifacts/`, using only synthetic farm data.

Windows x64 release executable and `Stardew Companion_0.5.1_x64-setup.exe` built successfully. The installer is unsigned; installation/upgrade/removal was not exercised.

## Remaining product limits

The six reported defects are addressed. Broader feature limits remain: uncommon native conditions/text can require in-game checks; global multi-map travel optimization is not implemented; Linux/macOS and Windows installation/upgrade/removal need native platform validation. Signing and hosted release publication are not configured. These are not claimed as completed by this patch.
