// One-off repeatable source migration. Does not mutate the DOM or stored game data.
import ts from 'typescript';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const files = [
  'src/App.tsx',
  ...['src/views', 'src/components'].flatMap((dir) =>
    readdirSync(dir)
      .filter((n) => n.endsWith('.tsx'))
      .map((n) => `${dir}/${n}`),
  ),
];
for (const file of files) {
  if (file.endsWith('/Artwork.tsx')) continue;
  let text = readFileSync(file, 'utf8');
  if (text.includes('import { localize }')) continue;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
    edits = [];
  function jsx(node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node))
      return true;
    return ts.forEachChild(node, jsx) ?? false;
  }
  function visit(node) {
    if (ts.isReturnStatement(node) && node.expression && jsx(node.expression)) {
      const e = node.expression;
      edits.push([e.getStart(source), 'localize('], [e.end, ')']);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!edits.length) continue;
  for (const [at, value] of edits.sort((a, b) => b[0] - a[0]))
    text = text.slice(0, at) + value + text.slice(at);
  const path = file === 'src/App.tsx' ? './lib/locale' : '../lib/locale';
  writeFileSync(file, `import { localize } from '${path}';\n` + text);
}
