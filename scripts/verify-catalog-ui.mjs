// Optional local QA: installed artwork stays ignored; all farm progress is synthetic.
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium, expect } from '@playwright/test';
const art = JSON.parse(await readFile('artifacts/artwork-current.local.json', 'utf8'));
const maps = {};
for (const name of [
  'Town',
  'Town-EggFestival',
  'Town-EggFestival2',
  'Beach-NightMarket',
  'Farm_Foraging',
])
  maps[name] = JSON.parse(await readFile(`artifacts/tilemap-${name}.local.json`, 'utf8'));
const server = await createServer({
  cacheDir: 'node_modules/.vite-catalog-qa',
  server: { port: 1435, strictPort: true, host: '127.0.0.1', hmr: false },
  logLevel: 'error',
});
await server.listen();
const { syntheticSave } = await server.ssrLoadModule('/src/domain/test-fixture.ts');
const save = syntheticSave();
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.addInitScript(
    ({ art, save, maps }) => {
      localStorage.setItem('companion:language', 'en');
      window.isTauri = true;
      window.__links = [];
      window.__mapRequests = [];
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
            window.__mapRequests.push(args.location);
            if (!maps[args.location]) throw Error('QA map not loaded: ' + args.location);
            return maps[args.location];
          }
          if (cmd === 'journal_receipt') return null;
          if (cmd === 'plugin:opener|open_url') {
            window.__links.push(args.url);
            return;
          }
          if (cmd === 'progress_history') return [];
          if (['record_progress', 'plugin:event|unlisten'].includes(cmd)) return;
          if (cmd === 'plugin:event|listen') return 1;
          throw Error(cmd);
        },
      };
      window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
    },
    { art, save, maps },
  );
  await page.goto('http://127.0.0.1:1435');
  const nav = (name) =>
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name, exact: true });
  await nav('Encyclopedia').click();
  await page.getByRole('button', { name: /^Characters / }).click();
  await page.getByRole('textbox', { name: 'Search current view' }).fill('Leo');
  await expect(page.locator('.social-card')).toHaveCount(1);
  await expect(page.locator('.social-card .artwork-missing')).toHaveCount(0);
  await page.locator('.social-card').click();
  await page.getByRole('dialog').screenshot({ path: 'artifacts/catalog-leo.local.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('textbox', { name: 'Search current view' }).fill('');
  await page.getByRole('button', { name: /^Animals / }).click();
  await expect(page.locator('main h1')).toHaveText('Animals');
  await expect(page.locator('.entity-card.animal')).toHaveCount(
    art.world.filter((e) => e.kind === 'animal').length,
  );
  await expect(page.locator('.entity-card.animal .artwork-missing')).toHaveCount(0);
  const animalSizes = await page.locator('.entity-card.animal .game-sprite').evaluateAll((es) =>
    es.map((e) => {
      const r = e.getBoundingClientRect();
      return Math.max(r.width, r.height);
    }),
  );
  expect(animalSizes.every((n) => Math.abs(n - 48) < 0.1)).toBe(true);
  await page.screenshot({ path: 'artifacts/catalog-animals.local.png' });
  await page.getByRole('button', { name: /^Locations / }).click();
  await page.getByRole('textbox', { name: 'Search current view' }).fill('Forest Farm');
  await page.locator('.encyclopedia-card').click();
  await expect(page.locator('.tile-map-viewer canvas')).toBeVisible();
  expect((await page.evaluate(() => window.__mapRequests)).at(-1)).toBe('Farm_Foraging');
  await page.getByRole('dialog').screenshot({ path: 'artifacts/catalog-forest-farm.local.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('textbox', { name: 'Search current view' }).fill('Pelican Town');
  await page.locator('.encyclopedia-card').click();
  await expect(page.locator('.tile-map-viewer canvas')).toBeVisible();
  await page.getByRole('dialog').screenshot({ path: 'artifacts/catalog-town.local.png' });
  await page.locator('.matching-wiki button').click();
  expect((await page.evaluate(() => window.__links)).at(-1)).toBe(
    'https://stardewvalleywiki.com/Pelican_Town',
  );
  await page.keyboard.press('Escape');
  await page.getByRole('textbox', { name: 'Search current view' }).fill('');
  await nav('Festivals').click();
  let missing = [];
  for (let i = 0; i < 12; i++) {
    await page.locator('.festival-index-card').nth(i).click();
    const n = await page.locator('.festival-guide .artwork-missing').count();
    if (n)
      missing.push({ festival: await page.locator('.festival-guide h2').innerText(), missing: n });
  }
  await page.locator('.festival-index-card').filter({ hasText: 'Egg Festival' }).click();
  await page.getByRole('spinbutton', { name: 'Festival guide year' }).fill('1');
  await page.getByRole('button', { name: 'Show festival map' }).click();
  await expect(page.locator('.tile-map-viewer canvas')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Tile map location' })).toHaveValue(
    'Town-EggFestival',
  );
  await page
    .locator('.tile-map-viewer')
    .screenshot({ path: 'artifacts/catalog-egg-year1.local.png' });
  await page.getByRole('spinbutton', { name: 'Festival guide year' }).fill('2');
  await expect(page.getByRole('combobox', { name: 'Tile map location' })).toHaveValue(
    'Town-EggFestival2',
  );
  await expect(page.locator('.tile-map-viewer canvas')).toBeVisible();
  await page
    .locator('.tile-map-viewer')
    .screenshot({ path: 'artifacts/catalog-egg-year2.local.png' });
  await page.getByRole('combobox', { name: 'Interface language' }).selectOption('tr');
  await expect(page.locator('.festival-guide h2')).toHaveText('Yumurta Festivali');
  await expect(page.locator('.festival-page-controls input')).toHaveValue('2');
  await page
    .locator('.festival-guide')
    .screenshot({ path: 'artifacts/catalog-festival-tr.local.png' });
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.evaluate(() => document.documentElement.style.setProperty('--text-scale', '1.3'));
  await page.screenshot({ path: 'artifacts/catalog-festival-130.local.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('combobox', { name: 'Arayüz dili' }).selectOption('en');
  await nav('Smart Planner').click();
  await page
    .getByRole('textbox', { name: 'New manual task' })
    .fill('Bring gold Cauliflower to Luau');
  await page.locator('.manual-panel').getByRole('button', { name: 'Add', exact: true }).click();
  await page.locator('.journal-transfer summary').click();
  await page
    .locator('.journal-transfer')
    .screenshot({ path: 'artifacts/catalog-journal.local.png' });
  await page.getByRole('combobox', { name: 'Interface language' }).selectOption('tr');
  const untranslated = [];
  for (let i = 0; i < 10; i++) {
    await page.locator('.sidebar .nav-item').nth(i).click();
    await expect(page.locator('main h1')).toBeVisible();
    const lines = await page.locator('.workspace').evaluate((root) => {
      const found = [],
        walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const p = node.parentElement,
          text = node.textContent.trim();
        if (
          !p ||
          p.closest('[data-l10n="off"],code,pre,script,style,option') ||
          !p.getClientRects().length ||
          text.length < 16
        )
          continue;
        if (
          /\b(the|your|this|saved|requires|from|available|progress|currently|cannot|recorded|recipe|unknown)\b/i.test(
            text,
          ) &&
          !/[ğüşıöçĞÜŞİÖÇ]/.test(text)
        )
          found.push(text);
      }
      return [...new Set(found)];
    });
    untranslated.push({ page: await page.locator('main h1').innerText(), lines });
  }
  await page.locator('.sidebar .nav-item').nth(4).click();
  for (const detail of [
    { tab: 1, query: 'Legend', card: '.fish-card', name: 'Balık rehberi' },
    { tab: 10, query: 'Leo', card: '.social-card', name: 'Leo rehberi' },
    { tab: 11, query: 'Duggy', card: '.monster-card', name: 'Canavar rehberi' },
  ]) {
    await page.locator('.filter-tabs > button').nth(detail.tab).click();
    await page.locator('.search-box input').fill(detail.query);
    await page.locator(detail.card).first().click();
    const dialog = page.getByRole('dialog');
    const lines = await dialog.evaluate((root) => {
      const found = [],
        walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const p = node.parentElement,
          text = node.textContent.trim();
        if (
          !p ||
          p.closest('[data-l10n="off"],code,pre,script,style,option') ||
          !p.getClientRects().length ||
          text.length < 16
        )
          continue;
        if (
          /\b(the|your|this|saved|requires|from|available|progress|currently|cannot|recorded|recipe|unknown)\b/i.test(
            text,
          )
        )
          found.push(text);
      }
      return [...new Set(found)];
    });
    untranslated.push({ page: detail.name, lines });
    await dialog.screenshot({
      path: `artifacts/polish-${detail.query.toLowerCase()}-tr.local.png`,
    });
    await page.keyboard.press('Escape');
    await page.locator('.search-box input').fill('');
  }
  await writeFile('artifacts/rendered-tr-audit.local.json', JSON.stringify(untranslated, null, 2));
  await page.locator('.sidebar .nav-item').nth(4).click();
  await page.locator('.filter-tabs > button').nth(2).click();
  await page.locator('.search-box input').fill('Pumpkin Soup');
  await page.locator('.encyclopedia-card').first().click();
  await page.locator('.detail-plan-action').click();
  await expect(page.locator('.workspace')).not.toContainText('Goal added to this farm');
  await page.keyboard.press('Escape');
  await page.locator('.sidebar .nav-item').nth(3).click();
  await expect(page.locator('.planner-next')).toBeVisible();
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.evaluate(() => document.documentElement.style.setProperty('--text-scale', '1'));
  await page.screenshot({ path: 'artifacts/workflow-planner-real-tr.local.png' });
  await page.locator('.journal-transfer > summary').click();
  await expect(page.locator('.journal-preview')).toContainText('Oyun bu eylemi takip eder');
  await page
    .locator('.journal-transfer')
    .screenshot({ path: 'artifacts/workflow-journal-real-tr.local.png' });
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.evaluate(() => document.documentElement.style.setProperty('--text-scale', '1.3'));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(untranslated.filter((entry) => entry.lines.length > 0)).toEqual([]);
  expect(errors).toEqual([]);
  expect(missing).toEqual([]);
  const summary = {
    leoPortrait: Boolean(art.sprites['character:Leo']),
    festivalGuides: 12,
    missingFestivalIcons: missing,
    runtimeErrors: errors,
    animalPreviews: animalSizes.length,
    animalLongestSide: [Math.min(...animalSizes), Math.max(...animalSizes)],
    mapRequests: await page.evaluate(() => window.__mapRequests),
  };
  await writeFile('artifacts/catalog-ui.local.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
} finally {
  await browser.close();
  await server.close();
}
