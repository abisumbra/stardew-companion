// Optional local QA: installed art stays in ignored artifacts; progress is synthetic.
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium, expect } from '@playwright/test';
const art = JSON.parse(await readFile('artifacts/artwork-current.local.json', 'utf8'));
const maps = {};
for (const name of ['Town', 'Forest', 'Mountain', 'Mine', 'SeedShop', 'ScienceHouse'])
  maps[name] = JSON.parse(await readFile(`artifacts/tilemap-${name}.local.json`, 'utf8'));
const server = await createServer({
  cacheDir: 'node_modules/.vite-experience-qa',
  server: { port: 1434, strictPort: true, host: '127.0.0.1', hmr: false },
  logLevel: 'error',
});
await server.listen();
const { syntheticSave } = await server.ssrLoadModule('/src/domain/test-fixture.ts');
const save = syntheticSave();
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
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
            if (!maps[args.location]) throw Error('QA map not loaded: ' + args.location);
            return maps[args.location];
          }
          if (cmd === 'progress_history') return [];
          if (cmd === 'record_progress') return;
          if (cmd === 'plugin:event|listen') return 1;
          if (cmd === 'plugin:event|unlisten') return;
          throw Error(cmd);
        },
      };
      window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
    },
    { art, save, maps },
  );
  await page.goto('http://127.0.0.1:1434');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Encyclopedia', exact: true })
    .click();
  await page.getByRole('button', { name: /^Monsters / }).click();
  await expect(page.locator('.monster-card').first()).toBeVisible();
  await expect(page.locator('.monster-card .artwork-missing')).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/experience-monsters.local.png' });
  await page.getByRole('textbox', { name: 'Search current view' }).fill('Duggy');
  await page.locator('.monster-card').first().click();
  await expect(page.locator('.monster-hunting')).toContainText('Floors 2–29');
  await page.getByRole('dialog').screenshot({ path: 'artifacts/experience-duggy.local.png' });
  await page.getByRole('button', { name: 'Show entrance map' }).click();
  await page.locator('.tile-map-viewer').scrollIntoViewIfNeeded();
  await expect(page.locator('.tile-map-viewer canvas')).toBeVisible();
  await page.locator('.tile-map-viewer').screenshot({ path: 'artifacts/experience-map.local.png' });
  const colors = await page.locator('.tile-map-viewer canvas').evaluate((c) => {
    const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data,
      s = new Set();
    for (let i = 0; i < data.length; i += 16)
      s.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`);
    return s.size;
  });
  expect(colors).toBeGreaterThan(20);
  await page.keyboard.press('Escape');
  await page.getByRole('textbox', { name: 'Search current view' }).fill('');
  await page.getByRole('button', { name: /^Characters / }).click();
  await page.getByRole('textbox', { name: 'Search current view' }).fill('Abigail');
  await page.locator('.social-card').click();
  await page
    .getByRole('navigation', { name: 'Character details sections' })
    .getByRole('button', { name: 'Daily schedules' })
    .click();
  await page.getByRole('combobox', { name: 'Schedule variant' }).selectOption('spring');
  await page.locator('.npc-schedule').evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await page.getByRole('dialog').screenshot({ path: 'artifacts/experience-schedule.local.png' });
  await page.getByRole('button', { name: 'Show daily route map' }).click();
  await page.locator('.tile-map-viewer').scrollIntoViewIfNeeded();
  await expect(page.locator('.tile-map-viewer canvas')).toBeVisible();
  await page
    .locator('.tile-map-viewer')
    .screenshot({ path: 'artifacts/experience-npc-map.local.png' });
  await page.getByRole('combobox', { name: 'Interface language' }).selectOption('tr');
  expect(
    await page.locator('.tile-map-viewer canvas').evaluate((c) => c.getBoundingClientRect().width),
  ).toBeGreaterThan(500);
  await page.locator('.npc-schedule').evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await page.getByRole('dialog').screenshot({ path: 'artifacts/experience-schedule-tr.local.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'Arayüz dili' }).selectOption('en');
  await page.getByRole('textbox', { name: 'Search current view' }).fill('');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Perfection', exact: true })
    .click();
  await page.locator('.criteria-strip button').filter({ hasText: 'Cooking' }).click();
  await page
    .getByRole('group', { name: 'Perfection status filter' })
    .getByRole('button', { name: 'All', exact: true })
    .click();
  await page.locator('.perfection-panel-heading').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/experience-perfection.local.png' });
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.evaluate(() => document.documentElement.style.setProperty('--text-scale', '1.3'));
  await page.screenshot({ path: 'artifacts/experience-perfection-130.local.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  const contact = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  await contact.setContent(
    '<style>body{background:#eee0bc;font:14px Segoe UI}.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}.card{padding:7px;background:#fff5d5;border:1px solid #986932}canvas{image-rendering:pixelated;background:repeating-conic-gradient(#ddd 0 25%,#eee 0 50%) 0/16px 16px}b{display:block}</style><div class="grid"></div>',
  );
  await contact.evaluate(async (art) => {
    for (const e of art.monsters) {
      const r = art.sprites[e.id],
        sheet = art.sheets[r?.sheet];
      if (!r || !sheet) continue;
      const im = new Image();
      im.src = sheet.url;
      await im.decode();
      const card = document.createElement('div');
      card.className = 'card';
      const label = document.createElement('b');
      label.textContent = e.name;
      card.append(label);
      const c = document.createElement('canvas');
      c.width = 160;
      c.height = 96;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const scale = Math.min(4, 160 / r.width, 96 / r.height);
      ctx.drawImage(
        im,
        r.x,
        r.y,
        r.width,
        r.height,
        (160 - r.width * scale) / 2,
        0,
        r.width * scale,
        r.height * scale,
      );
      card.append(c);
      document.querySelector('.grid').append(card);
    }
  }, art);
  await contact.screenshot({
    path: 'artifacts/experience-monster-frames.local.png',
    fullPage: true,
  });
  console.log(
    JSON.stringify({
      monsterFrames: art.monsters.length,
      mapColors: colors,
      runtimeErrors: errors,
      screenshots: 9,
    }),
  );
} finally {
  await browser.close();
  await server.close();
}
