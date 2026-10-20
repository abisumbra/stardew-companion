// Local developer audit; never fetches content or reads game saves.
import ts from 'typescript';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
const server = await createServer({
  cacheDir: 'node_modules/.vite-locale-audit',
  server: { middlewareMode: true },
  logLevel: 'error',
});
try {
  const { translate, setLocale, registerGameTranslations } =
    await server.ssrLoadModule('/src/lib/locale.tsx');
  const art = JSON.parse(await readFile('artifacts/artwork-current.local.json', 'utf8'));
  registerGameTranslations(art.translations);
  setLocale('tr');
  const files = [
    'src/App.tsx',
    ...(await Promise.all(
      ['src/views', 'src/components', 'src/domain'].map(async (dir) =>
        (await readdir(dir))
          .filter((f) => /\.tsx?$/.test(f) && !f.includes('.test.') && !f.includes('test-fixture'))
          .map((f) => dir + '/' + f),
      ),
    ).then((a) => a.flat())),
  ];
  const missing = new Map();
  for (const file of files) {
    const src = await readFile(file, 'utf8'),
      ast = ts.createSourceFile(
        file,
        src,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
    function visit(n) {
      if (ts.isJsxText(n) || ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
        const text = (n.text ?? '').replace(/\s+/g, ' ').trim();
        if (
          /[a-zA-Z]{3}/.test(text) &&
          text.length >= 6 &&
          (/\s/.test(text) || ts.isJsxText(n)) &&
          !text.startsWith('http') &&
          !text.startsWith('../') &&
          !text.startsWith('./') &&
          !/^[a-z][\w-]*(?: [a-z][\w-]*){0,2}$/.test(text) &&
          translate(text) === text
        ) {
          const refs = missing.get(text) ?? [];
          refs.push(file);
          missing.set(text, refs);
        }
      }
      ts.forEachChild(n, visit);
    }
    visit(ast);
  }
  const rows = [...missing]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([text, files]) => ({ text, files: [...new Set(files)] }));
  await writeFile('artifacts/untranslated.local.json', JSON.stringify(rows, null, 2));
  console.log(JSON.stringify({ untranslated: rows.length, examples: rows.slice(0, 25) }));
} finally {
  await server.close();
}
