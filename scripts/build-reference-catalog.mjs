// Deliberate, offline adaptation of MIT-licensed collection identifiers. Never executes reference JS.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const raw = readFileSync('research/stardew-checkup.reference.js', 'utf8');
const observed = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(observed ?? ''))
  throw new Error('Provide the actual verification date, YYYY-MM-DD');
const token = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;
function unquote(s) {
  return s[0] === '"' ? JSON.parse(s) : s.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}
const entries = [];
for (const [kind, fn, page] of [
  ['cooking', 'parseCooking', 'Cooking'],
  ['crafting', 'parseCrafting', 'Crafting'],
  ['fishing', 'parseFishing', 'Fish'],
  ['shipping', 'parseBasicShipping', 'Collections'],
]) {
  const section = raw.split(`function ${fn}(`)[1].split('\n\tfunction ')[0];
  const recipeBlock = section.match(/meta\.recipes\s*=\s*([\[{])([\s\S]*?)[\]}];/);
  if (!recipeBlock) throw new Error(`Cannot locate ${fn} catalog`);
  const values = new Map();
  if (kind === 'crafting')
    for (const t of recipeBlock[2].matchAll(token))
      values.set(unquote(t[0]), { name: unquote(t[0]), since: '1.5' });
  else
    for (const line of recipeBlock[2].split('\n')) {
      const pair = line.match(/^\s*(\w+|"[^"]+"):\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
      if (pair) values.set(pair[1].replaceAll('"', ''), { name: unquote(pair[2]), since: '1.5' });
    }
  let since = '1.5';
  for (const line of section
    .slice(section.indexOf(recipeBlock[0]) + recipeBlock[0].length)
    .split('\n')) {
    const v = line.match(/compareSemVer\(saveInfo.version, ["'](1\.\d+)["']\)/);
    if (v) since = v[1] === '1.6' ? '1.6' : '1.5';
    if (kind === 'crafting' && line.includes('meta.recipes.push('))
      for (const t of line.split('meta.recipes.push(')[1].split(');')[0].matchAll(token))
        values.set(unquote(t[0]), { name: unquote(t[0]), since });
    const a = line.match(/meta\.recipes\[(\w+|"[^"]+")\] = ("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
    if (a) values.set(a[1].replaceAll('"', ''), { name: unquote(a[2]), since });
  }
  // In 1.6 Clam moved to the Fish collection. Checkup's shipping list still includes it;
  // cross-check against Wiki Collections (2026-10-15): 154 shipping entries, not 155.
  for (const [key, value] of values)
    entries.push({
      id: `${kind}:${key}`,
      key,
      name: value.name,
      type: kind,
      versions:
        kind === 'shipping' && key === '372'
          ? ['1.5']
          : value.since === '1.6'
            ? ['1.6']
            : ['1.5', '1.6'],
      sources: ['checkup', `wiki-${page.toLowerCase()}`],
      verifiedAt: observed,
      verification: 'catalog',
    });
}
const decode = (s) =>
  s
    .replace(/<[^>]*>/g, '')
    .replaceAll('&amp;', '&')
    .replaceAll('&#039;', "'")
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'")
    .trim();
const steam = readFileSync('research/steam-achievements.html', 'utf8');
const total = Number(
  steam.match(/Total achievements:\s*<[^>]*>\s*(\d+)/)?.[1] ??
    steam.match(/Total achievements:\s*(\d+)/)?.[1],
);
const achievements = [...steam.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<h5>([\s\S]*?)<\/h5>/g)].map(
  (m) => ({
    id: `achievement:${decode(m[1])
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-$/, '')}`,
    name: decode(m[1]),
    description: decode(m[2]) || null,
    sources: ['steam'],
    verifiedAt: observed,
    verification: decode(m[2]) ? 'official-catalog' : 'hidden-description',
  }),
);
if (!total || achievements.length !== total)
  throw new Error(`Steam count mismatch: listing ${total}, parsed ${achievements.length}`);
mkdirSync('data', { recursive: true });
writeFileSync(
  'data/catalog.json',
  JSON.stringify(
    {
      version: `2026.10.15.1`,
      verifiedAt: observed,
      referenceHash: createHash('sha256').update(raw).digest('hex'),
      entries,
      steam: { observedTotal: total, observedAt: observed, achievements },
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    collections: Object.fromEntries(
      ['cooking', 'crafting', 'fishing', 'shipping'].map((t) => [
        t,
        entries.filter((e) => e.type === t && e.versions.includes('1.6')).length,
      ]),
    ),
    steam: total,
  }),
);
