// Collect display-copy keys in one place. Runtime game strings stay local and are never exported.
import fs from 'node:fs/promises';
import ts from 'typescript';
const tr = JSON.parse(await fs.readFile('src/locales/tr.json', 'utf8'));
const en = JSON.parse(await fs.readFile('src/locales/en.json', 'utf8'));
const references = {};
async function walk(folder) {
  for (const file of await fs.readdir(folder, { withFileTypes: true })) {
    const path = folder + '/' + file.name;
    if (file.isDirectory()) {
      if (!['locales'].includes(file.name)) await walk(path);
      continue;
    }
    if (!/\.tsx?$/.test(path) || /\.test\.|test-fixture/.test(path)) continue;
    const ast = ts.createSourceFile(
      path,
      await fs.readFile(path, 'utf8'),
      99,
      true,
      path.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    function visit(n) {
      if (ts.isJsxText(n) || ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
        const key = n.text.replace(/\s+/g, ' ').trim();
        const attribute = ts.isJsxAttribute(n.parent) ? n.parent.name.getText(ast) : null;
        const codeAttribute =
          attribute &&
          ['className', 'id', 'role', 'type', 'value', 'key', 'htmlFor', 'data-l10n'].includes(
            attribute,
          );
        if (
          !codeAttribute &&
          ((key &&
            /[A-Za-z]/.test(key) &&
            !key.startsWith('http') &&
            !key.startsWith('./') &&
            !key.startsWith('../') &&
            !/^[\w:/.-]+$/.test(key)) ||
            (ts.isJsxText(n) && key))
        ) {
          if (key.length < 5000) {
            en[key] ??= key;
            references[key] ??= [];
            references[key].push(path);
          }
        }
      }
      ts.forEachChild(n, visit);
    }
    visit(ast);
  }
}
await walk('src');
async function native(folder) {
  for (const file of await fs.readdir(folder, { withFileTypes: true })) {
    const path = folder + '/' + file.name;
    if (file.isDirectory()) await native(path);
    else if (file.name.endsWith('.rs')) {
      const source = (await fs.readFile(path, 'utf8')).split('#[cfg(test)]')[0];
      for (const match of source.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
        const key = match[1];
        if (
          key.length > 8 &&
          key.length < 1000 &&
          /[A-Za-z]{3} [A-Za-z]{3}/.test(key) &&
          !/[<>]|\\|https?:/.test(key)
        ) {
          en[key] ??= key;
          references[key] ??= [];
          references[key].push(path);
        }
      }
    }
  }
}
await native('src-tauri/src');
for (const file of ['data/catalog.json', 'data/walnuts.json', 'data/recipe-unlocks.json']) {
  const data = JSON.parse(await fs.readFile(file, 'utf8'));
  function visit(value) {
    if (
      typeof value === 'string' &&
      /[A-Za-z]/.test(value) &&
      /\s/.test(value) &&
      !value.startsWith('http') &&
      value.length < 5000
    )
      en[value] ??= value;
    else if (value && typeof value === 'object') for (const v of Object.values(value)) visit(v);
  }
  visit(data);
}
for (const name of await fs.readdir('src/locales')) {
  if (!/^(tr|de|es|fr|hu|it|ja|ko|pt|ru|zh)\.json$/.test(name)) continue;
  for (const key of Object.keys(JSON.parse(await fs.readFile(`src/locales/${name}`, 'utf8'))))
    en[key] ??= key;
}
for (const name of [
  'StartupHook.cs',
  'Runtime.cs',
  'Protocol.cs',
  'FarmTransfer.cs',
  'GoalText.cs',
]) {
  const path = `bridge/${name}`,
    source = await fs.readFile(path, 'utf8');
  for (const match of source.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
    const key = match[1];
    if (
      key.length > 8 &&
      key.length < 1000 &&
      /[A-Za-z]{3} [A-Za-z]{3}/.test(key) &&
      !/[<>]|\\|https?:/.test(key)
    ) {
      en[key] ??= key;
      references[key] ??= [];
      references[key].push(path);
    }
  }
}
const ordered = Object.fromEntries(Object.entries(en).sort(([a], [b]) => a.localeCompare(b)));
for (const [lang, data] of Object.entries({ en: ordered, tr }))
  await fs.writeFile(`src/locales/${lang}.json`, JSON.stringify(data, null, 2) + '\n');
await fs.writeFile('src/locales/references.json', JSON.stringify(references, null, 2) + '\n');
console.log(JSON.stringify({ messages: Object.keys(en).length, turkish: Object.keys(tr).length }));
