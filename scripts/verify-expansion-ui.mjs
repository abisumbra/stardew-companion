// Local-only visual QA with original installed pixels and synthetic player progress.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium, expect } from '@playwright/test';
const art = JSON.parse(await readFile('artifacts/artwork-current.local.json', 'utf8'));
const maps = {};
for (const file of await readdir('artifacts'))
  if (/^tilemap-Farm.*\.local\.json$/.test(file))
    maps[file.slice(8, -11)] = JSON.parse(await readFile('artifacts/' + file, 'utf8'));
const server = await createServer({
  cacheDir: 'node_modules/.vite-expansion-qa',
  server: { port: 1437, strictPort: true, host: '127.0.0.1', hmr: false },
  logLevel: 'error',
});
await server.listen();
const { syntheticSave } = await server.ssrLoadModule('/src/domain/test-fixture.ts');
const save = syntheticSave();
save.containers = [
  {
    id: 'test-chest',
    name: 'Chest',
    location: 'Farm',
    tile: [22, 15],
    kind: 'chest',
    sharedGroup: null,
    contentsKnown: true,
    items: [
      { id: '(O)388', quantity: 99, quality: 0 },
      { id: '(O)24', quantity: 4, quality: 2 },
    ],
  },
];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(
    ({ art, save, maps }) => {
      localStorage.setItem('companion:language', 'en');
      window.isTauri = true;
      const states = {};
      window.__TAURI_INTERNALS__ = {
        transformCallback: () => 1,
        unregisterCallback: () => {},
        invoke: async (cmd, args = {}) => {
          if (cmd === 'get_artwork') return art;
          if (cmd === 'scan_saves')
            return { saves: [save], issues: [], directories: [], customDirectories: [] };
          if (cmd === 'get_state') return states[args.scope] ?? null;
          if (cmd === 'set_state') {
            states[args.scope] = args.value;
            return;
          }
          if (cmd === 'get_location_map') {
            if (!maps[args.location]) throw Error('QA map unavailable');
            return maps[args.location];
          }
          if (cmd === 'connection_status') return { state: 'disconnected' };
          if (cmd === 'get_game_translations') return {};
          if (cmd === 'steam_icons') return {};
          if (cmd === 'journal_receipt') return null;
          if (cmd === 'progress_history') return [];
          if (cmd === 'plugin:event|listen') return 1;
          if (['record_progress', 'plugin:event|unlisten'].includes(cmd)) return;
          throw Error(cmd);
        },
      };
      window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
    },
    { art, save, maps },
  );
  await page.goto('http://127.0.0.1:1437');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Farm Designer', exact: true })
    .click();
  await expect(page.locator('canvas[aria-label="Original farm map"]')).toBeVisible();
  await expect.poll(() => page.locator('.palette-items button').count()).toBeGreaterThan(70);
  for (const layout of [
    'Standard',
    'Riverland',
    'Forest',
    'Hill-top',
    'Wilderness',
    'Four Corners',
    'Beach',
    'Meadowlands',
  ]) {
    await page.getByLabel('Farm design type').selectOption(layout);
    await expect(page.locator('canvas[aria-label="Original farm map"]')).toBeVisible();
    await page.waitForTimeout(150);
  }
  await page.getByLabel('Farm design type').selectOption('Standard');
  await page
    .locator('.palette-items button')
    .filter({ has: page.locator('span', { hasText: /^Chest$/ }) })
    .click();
  await page.getByLabel('Placement X', { exact: true }).fill('24');
  await page.getByLabel('Placement Y', { exact: true }).fill('18');
  await page.getByRole('button', { name: 'Apply at coordinates' }).click();
  await expect(page.locator('.farm-placement')).toHaveCount(1);
  await page.screenshot({ path: 'artifacts/designer-0.10.local.png', fullPage: true });
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Storage Finder', exact: true })
    .click();
  await page.locator('.storage-card').click();
  await expect(page.locator('.storage-items .game-sprite')).toHaveCount(2);
  expect(
    await page
      .locator('.storage-items .game-sprite')
      .evaluateAll((nodes) => nodes.every((n) => n.getBoundingClientRect().width <= 36)),
  ).toBe(true);
  await page.screenshot({ path: 'artifacts/storage-0.10.local.png', fullPage: true });
  await page.setViewportSize({ width: 1000, height: 800 });
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Farm Designer', exact: true })
    .click();
  await page.getByRole('combobox', { name: 'Interface language' }).selectOption('tr');
  await page.screenshot({ path: 'artifacts/designer-compact-tr-0.10.local.png', fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
  expect(errors).toEqual([]);
  const result = { layouts: Object.keys(maps).length, errors, overflow };
  await writeFile('artifacts/expansion-ui-audit.local.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
  await server.close();
}
