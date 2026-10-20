import fs from 'node:fs';
const keys = [
  'Cook {item}',
  'Craft {item}',
  'Catch {item}',
  'Ship {item}',
  'Reach {count} hearts with {item}',
  'Reach level {count}: {item}',
  'The Companion connection removes this task when its action record is complete. No reward.',
];
const languages = {};
for (const code of ['en', 'tr', 'de', 'es', 'fr', 'hu', 'it', 'ja', 'ko', 'pt', 'ru', 'zh']) {
  const catalog = JSON.parse(fs.readFileSync(`src/locales/${code}.json`, 'utf8'));
  languages[code] = Object.fromEntries(keys.map((key) => [key, catalog[key] ?? key]));
}
const catalog = JSON.parse(fs.readFileSync('data/catalog.json', 'utf8'));
const labels = Object.fromEntries(
  [...catalog.entries, ...catalog.steam.achievements].map((entry) => [
    entry.id,
    entry.name.replace(/[^\x20-\x7e]/g, ''),
  ]),
);
const destination = 'src/locales/bridge-goals.json',
  output = JSON.stringify({ languages, labels }, null, 2) + '\n';
if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== output)
  fs.writeFileSync(destination, output);
