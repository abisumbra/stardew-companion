// Local-only import. Never fetches a wiki, executes source code or accesses save files.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CatalogSchema } from '../src/domain/models.ts';
const input = process.argv[2];
if (!input)
  throw new Error('Usage: npm run knowledge:import -- path/to/reviewed-catalog.json [--apply]');
const path = resolve(input),
  text = readFileSync(path, 'utf8');
if (Buffer.byteLength(text) > 5 * 1024 * 1024)
  throw new Error('Knowledge import exceeds 5 MiB limit');
const data = CatalogSchema.parse(JSON.parse(text));
const sources = JSON.parse(readFileSync('data/sources.json', 'utf8'));
const ids = new Set();
for (const entry of [...data.entries, ...data.steam.achievements]) {
  if (ids.has(entry.id)) throw new Error(`Duplicate ID: ${entry.id}`);
  ids.add(entry.id);
  for (const s of entry.sources) {
    if (!sources[s] || !/^https:\/\//.test(sources[s].url))
      throw new Error(`Unreviewed source: ${s}`);
  }
}
if (data.steam.achievements.length !== data.steam.observedTotal)
  throw new Error('Steam observation count does not match catalog');
console.log(
  `Validated ${data.entries.length} versioned collection entries and ${data.steam.observedTotal} Steam achievements. No network requests made.`,
);
if (process.argv.includes('--apply')) {
  writeFileSync('data/catalog.json', JSON.stringify(data, null, 2) + '\n');
  console.log(
    'Applied to data/catalog.json. Run npm run check and review attribution before distribution.',
  );
} else
  console.log(
    'Validation only. Review the data, then pass --apply to replace the bundled catalog.',
  );
