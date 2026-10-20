// Parse MIT-licensed reference literals with the TS syntax tree; never execute reference JS.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const source = readFileSync('research/stardew-checkup.reference.js', 'utf8');
const ast = ts.createSourceFile(
  'reference.js',
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
);
const result = [];
function literal(node) {
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node))
    return ts.isNumericLiteral(node) ? Number(node.text) : node.text;
  if (ts.isObjectLiteralExpression(node))
    return Object.fromEntries(
      node.properties.map((p) => {
        if (!ts.isPropertyAssignment(p)) throw new Error('Only property literals are supported');
        return [p.name.text, literal(p.initializer)];
      }),
    );
  throw new Error('Nonliteral reference data rejected');
}
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'parseWalnuts') {
    const scan = (n) => {
      if (
        ts.isVariableDeclaration(n) &&
        ['trackerAllAtOnce', 'trackerExtra', 'trackerLimited'].includes(n.name.getText(ast))
      ) {
        for (const [id, value] of Object.entries(literal(n.initializer)))
          result.push({
            id,
            count: value.num,
            name: value.name,
            hint: value.hint.replaceAll('&quot;', '"'),
            method:
              n.name.getText(ast) === 'trackerLimited'
                ? 'limited'
                : n.name.getText(ast) === 'trackerExtra'
                  ? 'coconut'
                  : 'marker',
            sources: ['checkup', 'wiki-walnut'],
            verifiedAt: '2026-10-15',
            versions: ['1.5', '1.6'],
          });
      }
      ts.forEachChild(n, scan);
    };
    scan(node);
    return;
  }
  ts.forEachChild(node, visit);
}
visit(ast);
for (const entry of result) {
  entry.verifiedAt = '2026-10-16';
  if (entry.id === 'Bush_IslandNorth_5_30')
    entry.hint =
      'Along river accessed via secret passage from Volcano entrance; use the marker coordinates shown on the map.';
}
if (result.reduce((n, r) => n + r.count, 0) !== 130)
  throw new Error('Walnut target total is not 130');
writeFileSync(
  'data/walnuts.json',
  JSON.stringify(
    { referenceHash: createHash('sha256').update(source).digest('hex'), entries: result },
    null,
    2,
  ) + '\n',
);
console.log(`${result.length} evidence groups covering 130 walnuts imported`);
