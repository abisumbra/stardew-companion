// Optional local QA. Reads only the ignored artwork probe, never player saves.
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium, expect } from '@playwright/test';
const art = JSON.parse(await readFile('artifacts/artwork-current.local.json', 'utf8'));
const server = await createServer({
  cacheDir: 'node_modules/.vite-artwork-qa',
  server: { port: 1432, strictPort: true, host: '127.0.0.1', hmr: false },
  logLevel: 'error',
});
await server.listen();
const { syntheticSave } = await server.ssrLoadModule('/src/domain/test-fixture.ts');
const save = syntheticSave();
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(
    ({ art, save }) => {
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
          if (cmd === 'progress_history') return [];
          if (cmd === 'record_progress') return;
          if (cmd === 'plugin:event|listen') return 1;
          if (cmd === 'plugin:event|unlisten') return;
          throw Error(cmd);
        },
      };
      window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
    },
    { art, save },
  );
  await page.goto('http://127.0.0.1:1432');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Encyclopedia', exact: true })
    .click();
  await page.getByRole('button', { name: /^Animals / }).click();
  await expect(page.locator('.entity-card').first()).toBeVisible();
  expect(await page.locator('.entity-card .artwork-missing').count()).toBe(0);
  await page.screenshot({ path: 'artifacts/artwork-world-fixed.local.png', fullPage: true });
  await page.getByRole('textbox', { name: 'Search current view' }).fill('horse');
  await page.locator('.entity-card').first().click();
  const horseSize = await page
    .getByRole('dialog')
    .locator('.game-sprite')
    .first()
    .evaluate((e) => {
      const r = e.getBoundingClientRect();
      return Math.max(r.width, r.height);
    });
  expect(horseSize).toBe(72);
  await page.getByRole('dialog').screenshot({ path: 'artifacts/artwork-horse-fixed.local.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('textbox', { name: 'Search current view' }).fill('');
  await page.getByRole('button', { name: /^Buildings \d/ }).click();
  expect(await page.locator('.encyclopedia-card .artwork-missing').count()).toBe(0);
  await page.screenshot({ path: 'artifacts/artwork-buildings-fixed.local.png', fullPage: true });
  await page.getByRole('button', { name: /^Monsters \d/ }).click();
  const monsters=page.locator('.monster-card .game-sprite');
  const sizes=await monsters.evaluateAll(nodes=>nodes.map(e=>{const b=e.getBoundingClientRect();return Math.round(Math.max(b.width,b.height));}));
  expect(sizes.length).toBeGreaterThan(10);
  expect(new Set(sizes).size).toBe(1);
  await page.screenshot({path:'artifacts/monsters-0.10.local.png',fullPage:true});
  await page.getByRole('button', { name: /^All items \d/ }).click();
  await page.getByLabel('Item category', { exact: true }).selectOption('shirt');
  await page.screenshot({ path: 'artifacts/artwork-shirts-fixed.local.png' });
  const pixels = await page.evaluate(async (art) => {
    const images = new Map();
    const failures = [];
    for (const [key, sheet] of Object.entries(art.sheets)) {
      const image = new Image();
      image.src = sheet.url;
      try {
        await image.decode();
        images.set(key, image);
      } catch {
        failures.push(key);
      }
    }
    const blank = [],
      unavailable = [],
      canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d', { willReadFrequently: true });
    const gallery = [...art.items, ...art.characters, ...art.monsters, ...art.world];
    const byId=new Map(gallery.map(e=>[e.id,e]));
    for(const id of Object.keys(art.sprites)) if(!byId.has(id))byId.set(id,{id});
    const entities=[...byId.values()];
    for (const entity of entities) {
      const s = art.sprites[entity.id],
        image = s && images.get(s.sheet);
      if (!s || !image) {
        if (art.unavailable?.[entity.id]) unavailable.push(entity.id);
        else blank.push(entity.id);
        continue;
      }
      canvas.width = s.width;
      canvas.height = s.height;
      ctx.drawImage(image, s.x, s.y, s.width, s.height, 0, 0, s.width, s.height);
      const bytes = ctx.getImageData(0, 0, s.width, s.height).data;
      if (!bytes.some((value, i) => i % 4 === 3 && value > 0)) blank.push(entity.id);
    }
    return { failures, blank, unavailable, checked: entities.length, galleryChecked:gallery.length };
  }, art);
  const result = { errors, ...pixels };
  await writeFile('artifacts/artwork-ui-audit.local.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  expect(errors).toEqual([]);
  expect(pixels.failures).toEqual([]);
  expect(pixels.blank).toEqual([]);
} finally {
  await browser.close();
  await server.close();
}
