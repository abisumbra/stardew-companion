import { test, expect, type Page } from '@playwright/test';
import { syntheticSave } from '../src/domain/test-fixture';
import { emptyPlanner } from '../src/domain/models';
async function setup(page: Page) {
  const save = syntheticSave();
  save.profitMargin = 0.5;
  save.players[0].professions = [1];
  save.players[0].quests = [
    {
      id: '6',
      kind: '9',
      title: 'Getting Started',
      description: 'Grow something.',
      objective: 'Harvest a parsnip.',
      completed: false,
      daysLeft: 0,
    },
    {
      id: '8',
      kind: '2',
      title: 'Advancement',
      description: 'Craft something.',
      objective: 'Craft a scarecrow.',
      completed: true,
      daysLeft: 0,
    },
    {
      id: 'unknown',
      kind: '1',
      title: 'Uncertain quest',
      description: null,
      objective: null,
      completed: null,
      daysLeft: null,
    },
  ];
  const state = emptyPlanner();
  state.goals = ['cooking:236', 'crafting:Chest'];
  const art = {
    root: 'Synthetic installation',
    sheets: {},
    sprites: {},
    items: [{ id: 'object:24', name: 'Parsnip', kind: 'object' }],
    characters: [],
    monsters: [],
    world: [],
    warnings: [],
    translations: { Parsnip: 'Yaban Havucu', 'Pumpkin Soup': 'Balkabağı Çorbası', Chest: 'Sandık' },
    gameData: {
      objects: {
        '24': { Name: 'Parsnip', DisplayName: 'Parsnip', Price: 35, Edibility: 10, Category: -75 },
        '268': { Name: 'Starfruit', Price: 750, Edibility: 25, Category: -79 },
        '348': { Name: 'Wine', Price: 400, Edibility: 25, Category: -26 },
      },
      quests: {
        '6': 'ItemHarvest/Getting Started/Grow something./Harvest a parsnip./(O)24/-1/100/-1/true',
      },
    },
    recipes: {
      'cooking:236': {
        name: 'Pumpkin Soup',
        kind: 'cooking',
        output: 'object:236',
        quantity: 1,
        ingredients: [
          { id: '276', quantity: 1 },
          { id: '184', quantity: 1 },
        ],
      },
      'crafting:Chest': {
        name: 'Chest',
        kind: 'crafting',
        output: 'craftable:130',
        quantity: 1,
        ingredients: [{ id: '388', quantity: 50 }],
      },
    },
  };
  await page.addInitScript(
    ({ save, state, art }) => {
      localStorage.setItem('companion:language', 'en');
      (window as any).isTauri = true;
      const states: Record<string, unknown> = { ['farm:' + save.id]: state };
      (window as any).__requests = [];
      (window as any).__TAURI_INTERNALS__ = {
        transformCallback: () => 1,
        unregisterCallback: () => {},
        invoke: async (cmd: string, args: any = {}) => {
          (window as any).__requests.push({ cmd, args });
          if (cmd === 'get_artwork') return art;
          if (cmd === 'scan_saves')
            return { saves: [save], issues: [], directories: [], customDirectories: [] };
          if (cmd === 'get_state') return states[args.scope] ?? null;
          if (cmd === 'set_state') {
            states[args.scope] = args.value;
            return;
          }
          if (cmd === 'journal_receipt') return null;
          if (cmd === 'sync_journal')
            return {
              backupId: 'synthetic.xml',
              appliedFingerprint: save.fingerprint,
              originalFingerprint: 'original',
              saveId: save.id,
              farmerId: '123',
              count: args.tasks.length,
            };
          if (cmd === 'progress_history') return [];
          if (['record_progress', 'plugin:event|unlisten'].includes(cmd)) return;
          if (cmd === 'plugin:event|listen') return 1;
          throw Error(cmd);
        },
      };
      (window as any).__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
    },
    { save, state, art },
  );
  await page.goto('/');
}
test('quality table uses saved profession/margin and product input prices', async ({ page }) => {
  await setup(page);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Encyclopedia', exact: true })
    .click();
  await page.locator('.filter-tabs button').filter({ hasText: 'Shipping' }).click();
  await page.locator('.search-box input').fill('Parsnip');
  await page.locator('.encyclopedia-card').first().click();
  const prices = page.locator('.item-prices');
  await expect(prices).toContainText('35g');
  await expect(prices).toContainText('23g');
  await expect(prices.locator('tbody tr')).toHaveCount(4);
  await page.keyboard.press('Escape');
  await page.locator('.search-box input').fill('Wine');
  await page.locator('.encyclopedia-card').first().click();
  await page.getByLabel('Price input ingredient').selectOption('268');
  await expect(page.locator('.item-prices')).toContainText('2,250g');
  await expect(page.locator('.item-prices')).toContainText('4,500g');
});
test('saved quests have explicit status filters and no Planner actions', async ({ page }) => {
  await setup(page);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Completionist', exact: true })
    .click();
  const panel = page.locator('.completion-collections');
  await panel.locator('.panel-tabs button').filter({ hasText: 'Quests' }).click();
  await expect(panel.getByRole('button', { name: 'Add to Planner', exact: true })).toHaveCount(0);
  const filters = panel.getByRole('group', { name: 'Collection status filter' });
  await filters.getByRole('button', { name: /^Complete / }).click();
  await expect(panel.locator('.quest-card').filter({ visible: true })).toHaveCount(1);
  await expect(panel).toContainText('Advancement');
  await filters.getByRole('button', { name: /^Unknown / }).click();
  await expect(panel.locator('.quest-card').filter({ visible: true })).toHaveCount(1);
  await expect(panel).toContainText('Uncertain quest');
});
test('offline native tasks keep font-safe English and stable identities in a Turkish interface', async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: /^Smart Planner/ })
    .click();
  const panel = page.locator('.journal-transfer');
  await panel.locator('summary').click();
  await expect(panel).toContainText('Game tracks this action');
  await page.getByRole('combobox', { name: 'Interface language' }).selectOption('tr');
  await expect(panel).toContainText('Cook Pumpkin Soup');
  await panel.locator('input[type=checkbox]').last().check();
  await panel.locator('.journal-actions .button').first().click();
  const payload = await page.evaluate(
    () => (window as any).__requests.find((r: any) => r.cmd === 'sync_journal').args.tasks,
  );
  expect(payload).toHaveLength(2);
  expect(payload[0].tracking).toEqual({ mode: 'recipeCrafted', itemId: '(O)236' });
  expect(payload[1].tracking.itemId).toBe('(BC)130');
  expect(payload[0].description.length).toBeLessThan(180);
  expect(payload[0].title).toBe('Cook Pumpkin Soup');
});
test('planner overview and next steps remain readable at large text in a compact window', async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 1000, height: 800 });
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: /^Smart Planner/ })
    .click();
  await page.evaluate(() => document.documentElement.style.setProperty('--text-scale', '1.3'));
  await expect(page.locator('.planner-overview')).toContainText('Open goals');
  await expect(page.locator('.planner-next .next-step-list > li')).not.toHaveCount(0);
  await page.getByLabel('Filter by goal').selectOption('cooking:236');
  await expect(page.locator('.task-list .task')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/workflow-planner-compact.local.png' });
});
