import fs from 'node:fs/promises';
const en = JSON.parse(await fs.readFile('src/locales/en.json', 'utf8'));
const catalogs = { en };
for (const code of ['tr', 'de', 'es', 'fr', 'hu', 'it', 'ja', 'ko', 'pt', 'ru', 'zh'])
  catalogs[code] = JSON.parse(await fs.readFile(`src/locales/${code}.json`, 'utf8'));
const errors = [];
for (const [locale, data] of Object.entries(catalogs))
  for (const [id, text] of Object.entries(data))
    if (!id.trim() || typeof text !== 'string' || !text.trim())
      errors.push(`${locale}: invalid ${id}`);
for (const [locale, data] of Object.entries(catalogs))
  for (const id of Object.keys(data)) {
    if (!Object.hasOwn(en, id)) errors.push(`Missing English key for ${locale}: ${id}`);
  }
const required = JSON.parse(await fs.readFile('src/locales/required-core.json','utf8'));
for (const key of required) for (const locale of ['en','tr']) if (!catalogs[locale][key]) errors.push(`Missing core translation ${locale}: ${key}`);
if (errors.length) throw Error(errors.join('\n'));
console.log(
  JSON.stringify({
    english: Object.keys(en).length,
    languages: Object.fromEntries(
      Object.entries(catalogs).map(([code, entries]) => [
        code,
        {
          translated: Object.keys(entries).length,
          englishFallbacks: Object.keys(en).filter((id) => !Object.hasOwn(entries, id)).length,
        },
      ]),
    ),
  }),
);
