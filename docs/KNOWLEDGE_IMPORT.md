# Knowledge contributions

The application never scrapes on launch. A reviewed, versioned bundle ships with it.

1. Obtain only information you have permission to access. Wiki robots rules currently disallow GPTBot; the structured API could not be established as accessible. Do not bypass those restrictions. Research-service results are separately identified in the manifest.
2. Prepare a small, targeted JSON catalog matching `CatalogSchema` in `src/domain/models.ts`. Keep stable IDs, canonical names, game versions, actual verification dates and source IDs. Preserve unavailable official Steam descriptions as `null`.
3. Add new sources to `data/sources.json` only after manual review of URLs, access status and license. Never manufacture item URLs from names.
4. Run `npm run knowledge:import -- path/to/catalog.json` to validate without modifying anything. `--apply` writes the validated local bundle. Node 24.7+ is required for this tool's TypeScript schema import.
5. Run `npm run knowledge:validate` and `npm run check`. Review the diff, version changes, licenses and source coverage. Update `DATA_SOURCES.md` and `DEVELOPMENT_STATUS.md`.

`scripts/build-reference-catalog.mjs YYYY-MM-DD` is a maintenance tool for a manually downloaded MIT-licensed Checkup reference plus an official English Steam listing in `research/`. It extracts literals without evaluating source JavaScript, verifies the observed Steam total and records a SHA-256 of the reference. It intentionally corrects the 1.6 Clam shipping discrepancy using the Wiki Collections page: Clam belongs to the Fish collection in 1.6. The 1.6 shipping catalog has 154 entries. Wedding Ring is excluded from crafting Perfection.

Detailed guides currently live in `src/domain/knowledge.ts`; changes require explicit cited verification, ingredient quantities, applicability and regression tests. Identity catalog coverage is not detailed guide coverage.

A future permitted network importer must use one request queue, an identifying User-Agent, >=2 second spacing, disk caching, bounded retries and source revisions. It must respect robots, stop on restriction/rate-limit responses, and keep unavailable content unknown. No such crawler is enabled in this preview.
