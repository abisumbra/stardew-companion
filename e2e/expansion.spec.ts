import { writeFile } from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';
import { syntheticSave } from '../src/domain/test-fixture';
import { emptyPlanner } from '../src/domain/models';
async function setup(page: Page) {
  const save = syntheticSave();
  save.containers = [
    {
      id: 'Farm:3,4:chest',
      name: 'Chest',
      location: 'Farm',
      tile: [3, 4],
      kind: 'chest',
      sharedGroup: null,
      items: [{ id: '(O)184', quantity: 4, quality: 2 }],
      contentsKnown: true,
    },
    {
      id: 'Farm:8,9:chest',
      name: 'Junimo Chest',
      location: 'Farm',
      tile: [8, 9],
      kind: 'junimo',
      sharedGroup: 'junimo',
      items: [{ id: '(O)388', quantity: 25, quality: 0 }],
      contentsKnown: true,
    },
    {
      id: 'Town:2,3:chest',
      name: 'Junimo Chest',
      location: 'Town',
      tile: [2, 3],
      kind: 'junimo',
      sharedGroup: 'junimo',
      items: [{ id: '(O)388', quantity: 25, quality: 0 }],
      contentsKnown: true,
    },
  ];
  save.farmObjects = [{ id: '(BC)130', tile: [3, 4] }];
  const state = emptyPlanner();
  state.goals = ['shipping:390'];
  const art = {
    root: 'Synthetic game',
    sheets: {},
    sprites: {},
    items: [
      { id: 'object:184', name: 'Milk', kind: 'object' },
      { id: 'craftable:130', name: 'Chest', kind: 'craftable' },
      { id: 'furniture:1', name: 'Oak Chair', kind: 'furniture' },
    ],
    characters: [],
    monsters: [],
    warnings: [],
    recipes: {
      'crafting:Chest': {
        name: 'Chest',
        kind: 'crafting',
        output: 'craftable:130',
        quantity: 1,
        ingredients: [{ id: '388', quantity: 50 }],
      },
    },
    gameData: {
      objects: {
        '184': { Name: 'Milk', Price: 125, Category: -6, Edibility: 10 },
        '388': { Name: 'Wood', Price: 2, Category: -16, Edibility: -300 },
      },
      buildings: {},
      furniture: { 1: 'Oak Chair/chair/-1/-1/4' },
    },
    translations: { Milk: 'Süt', Chest: 'Sandık' },
  };
  const map = {
    width: 20,
    height: 20,
    tileWidth: 16,
    tileHeight: 16,
    layers: [],
    sheets: [],
    images: {},
    walkable: Array(400).fill(true),
    properties: {},
  };
  await page.addInitScript(
    ({ save, state, art, map }) => {
      const w = window as any;
      localStorage.setItem('companion:language', 'en');
      w.isTauri = true;
      w.__requests = [];
      w.__connected = false;
      w.__liveCompleted = [];
      const states = JSON.parse(localStorage.getItem('test:expansion-states') ?? 'null') ?? {
        ['farm:' + save.id]: state,
      };
      w.__TAURI_INTERNALS__ = {
        transformCallback: () => 1,
        unregisterCallback: () => {},
        invoke: async (cmd: string, args: any = {}) => {
          w.__requests.push({ cmd, args });
          if (cmd === 'scan_saves')
            return { saves: [save], issues: [], directories: [], customDirectories: [] };
          if (cmd === 'get_artwork') return art;
          if (cmd === 'get_state') return states[args.scope] ?? null;
          if (cmd === 'set_state') {
            states[args.scope] = args.value;
            localStorage.setItem('test:expansion-states', JSON.stringify(states));
            return;
          }
          if (cmd === 'get_location_map') return map;
          if (cmd === 'get_game_translations')
            return {
              Chest:
                args.language === 'de' ? 'Truhe' : args.language === 'ja' ? 'チェスト' : 'Chest',
            };
          if (cmd === 'progress_history') return [];
          if (cmd === 'journal_receipt') return null;
          if (cmd === 'connection_status')
            return w.__connected
              ? {
                  state: 'active',
                  saveId: save.id + ':123',
                  farmerId: '123',
                  completed: w.__liveCompleted,
                }
              : { state: 'disconnected' };
          if (cmd === 'set_connection_plan') return;
          if (cmd === 'launch_connected_game') {
            w.__connected = true;
            return 9876;
          }
          if (cmd === 'steam_icons') return {};
          if (cmd === 'read_steam_profile') {
            if (w.__privateSteam) throw 'Steam profile or game details are private or unavailable';
            return {
              profileId: '76561197960287930',
              sourceUrl: 'https://steamcommunity.com/profiles/76561197960287930/stats/413150/',
              fetchedAt: 100,
              unlocked: ['achievement:greenhorn'],
              observedTotal: 49,
            };
          }
          if (cmd === 'request_farm_layout') return 'test-request';
          if (cmd === 'farm_layout_result')
            return {
              requestId: 'test-request',
              state: 'rejected',
              applied: [],
              error:
                'Not enough inventory ingredients for the complete supported layout. No placements were made.',
            };
          if (cmd === 'plugin:event|listen') return 1;
          if (['record_progress', 'plugin:event|unlisten'].includes(cmd)) return;
          throw Error(cmd);
        },
      };
      w.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
    },
    { save, state, art, map },
  );
  await page.goto('/');
}
test('storage finder uses coordinates, exact quality and shared inventory counts', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: 'Storage Finder', exact: true }).click();
  await expect(page.locator('.toolbar')).toContainText('3 containers · 29 items');
  await page.locator('.storage-card').first().click();
  await expect(page.locator('.storage-detail')).toContainText('3, 4');
  await expect(page.locator('.storage-items')).toContainText('Milk');
  await expect(page.locator('.storage-items')).toContainText('Gold quality');
  await expect(page.locator('.storage-items')).toContainText('× 4');
  await page.getByRole('textbox', { name: 'Search current view' }).fill('Milk');
  await expect(page.locator('.storage-card')).toHaveCount(1);
});
test('farm designs cover eight layouts, persist placements and support undo and redo', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: 'Farm Designer', exact: true }).click();
  await expect(page.getByLabel('Farm design type').locator('option')).toHaveCount(8);
  await page.getByLabel('Design name').fill('My layout');
  await page.locator('.palette-items button').filter({ hasText: 'Chest' }).click();
  await page.getByLabel('Placement X', { exact: true }).fill('5');
  await page.getByLabel('Placement Y', { exact: true }).fill('6');
  await page.getByRole('button', { name: 'Apply at coordinates' }).click();
  await expect(page.locator('.farm-placement')).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo design change' }).click();
  await expect(page.locator('.farm-placement')).toHaveCount(0);
  await page.getByRole('button', { name: 'Redo design change' }).click();
  await expect(page.locator('.farm-placement')).toHaveCount(1);
  await page.getByRole('button', { name: 'Save design', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Farm design saved');
  await page.reload();
  await page.getByRole('button', { name: 'Farm Designer', exact: true }).click();
  await expect(page.locator('.farm-placement')).toHaveCount(1);
  await expect(page.getByLabel('Design name')).toHaveValue('My layout');
  await page.getByLabel('Design name').fill('Last edit before leaving');
  await page.getByRole('button', { name: 'Storage Finder', exact: true }).click();
  await page.getByRole('button', { name: 'Farm Designer', exact: true }).click();
  await expect(page.getByLabel('Design name')).toHaveValue('Last edit before leaving');
});
test('live shipping completion updates the plan without claiming the old disk save confirms it', async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole('button', { name: /^Smart Planner/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Start game with Companion' }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__requests.some(
          (r: any) =>
            r.cmd === 'set_connection_plan' && r.args.goals[0]?.conditions[0]?.source === 'shipped',
        ),
      ),
    )
    .toBe(true);
  await page.evaluate(() => {
    (window as any).__liveCompleted = ['shipping:390'];
  });
  await expect(page.locator('.planner-overview').locator('div').first()).toContainText('0');
  await expect(page.locator('.planner-sync-summary')).toContainText('0 confirmed goals');
});
test('Steam public unlocks remain separate and a private-profile refusal keeps prior evidence', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: 'Steam Achievements', exact: true }).click();
  await page.getByLabel('Steam profile', { exact: true }).fill('76561197960287930');
  await page.getByRole('button', { name: 'Connect public profile' }).click();
  await page.getByLabel('Achievement state filter').selectOption('Steam Verified');
  await expect(page.locator('.achievement-card')).toHaveCount(1);
  await expect(page.locator('.achievement-card')).toContainText('Greenhorn');
  await page.evaluate(() => {
    (window as any).__privateSteam = true;
  });
  await page.getByRole('button', { name: 'Connect public profile' }).click();
  await expect(page.getByRole('alert')).toContainText('private');
  await expect(page.locator('.achievement-card')).toHaveCount(1);
});
test('all official languages can be selected and Japanese and German use the correct catalogs', async ({
  page,
}) => {
  await setup(page);
  const select = page.locator('#interface-language');
  await expect(select.locator('option')).toHaveCount(12);
  await select.selectOption('ja');
  await expect(page.getByRole('button', { name: '牧場デザイン', exact: true })).toBeVisible();
  await select.selectOption('de');
  await page.getByRole('button', { name: 'Hofgestaltung', exact: true }).click();
  await expect(page.locator('.palette-items')).toContainText('Truhe');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
});
test('farm transfer needs consent and reports a rejected request without claiming success', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: 'Farm Designer', exact: true }).click();
  await page.locator('.palette-items button').filter({ hasText: 'Chest' }).click();
  await page.getByLabel('Placement X', { exact: true }).fill('5');
  await page.getByLabel('Placement Y', { exact: true }).fill('6');
  await page.getByRole('button', { name: 'Apply at coordinates' }).click();
  const transfer = page.getByRole('button', { name: 'Send supported placements to game' });
  await expect(transfer).toBeDisabled();
  await page.locator('#design-confirm').check();
  await transfer.click();
  await expect(page.getByRole('alert')).toContainText('Not enough inventory ingredients');
  await expect(page.getByRole('alert')).toContainText('0 placements applied');
});

test('paint, drag, wheel zoom and expanded workspace preserve the design', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Farm Designer', exact: true }).click();
  await page.locator('.palette-items button').filter({ hasText: 'Chest' }).click();
  const board = page.locator('.farm-canvas'),
    box = await board.boundingBox();
  expect(box).toBeTruthy();
  const unit = box!.width / 20;
  await page.mouse.move(box!.x + 2.5 * unit, box!.y + 2.5 * unit);
  await page.mouse.down();
  await page.mouse.move(box!.x + 6.5 * unit, box!.y + 2.5 * unit, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator('.farm-placement')).toHaveCount(5);
  await page.getByRole('button', { name: 'Undo design change' }).click();
  await expect(page.locator('.farm-placement')).toHaveCount(0);
  await page.getByRole('button', { name: 'Redo design change' }).click();
  await expect(page.locator('.farm-placement')).toHaveCount(5);
  await page.getByLabel('Design tool', { exact: true }).selectOption('select');
  await page.mouse.move(box!.x + 2.5 * unit, box!.y + 2.5 * unit);
  await page.mouse.down();
  await page.mouse.move(box!.x + 2.5 * unit, box!.y + 5.5 * unit, { steps: 3 });
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Chest at 2, 5', exact: true })).toBeVisible();
  const width = await board.evaluate((e) => e.getBoundingClientRect().width);
  await page.mouse.move(box!.x + 100, box!.y + 100);
  await page.mouse.wheel(0, -150);
  await expect
    .poll(() => board.evaluate((e) => e.getBoundingClientRect().width))
    .toBeGreaterThan(width);
  await page.getByRole('button', { name: 'Expand map', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Farm Designer', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.farm-placement')).toHaveCount(5);
  await dialog.getByRole('button', { name: 'Close expanded map' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.farm-placement')).toHaveCount(5);
});
test('home furniture is saved in its own library and never offers farm transfer', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: 'Home Designer', exact: true }).click();
  await expect(page.getByLabel('Home design type').locator('option')).toHaveCount(6);
  await page.getByLabel('Design name').fill('My kitchen');
  await page.locator('.palette-items button').filter({ hasText: 'Oak Chair' }).click();
  await page.getByLabel('Placement X', { exact: true }).fill('4');
  await page.getByLabel('Placement Y', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Apply at coordinates' }).click();
  await expect(page.locator('.farm-placement')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Send supported placements to game' })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Farm Designer', exact: true }).click();
  await expect(page.locator('.farm-placement')).toHaveCount(0);
  await page.getByRole('button', { name: 'Home Designer', exact: true }).click();
  await expect(page.locator('.farm-placement')).toHaveCount(1);
  await expect(page.getByLabel('Design name')).toHaveValue('My kitchen');
});
test('Steam completion tabs separate unknown evidence from incomplete progress', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: 'Steam Achievements', exact: true }).click();
  const tabs = page.getByRole('group', { name: 'Achievement completion' });
  await tabs.getByRole('button', { name: /^Completed/ }).click();
  await expect(page.locator('.achievement-card').first()).toBeVisible();
  await tabs.getByRole('button', { name: /^Incomplete/ }).click();
  for (const card of await page.locator('.achievement-card').all())
    await expect(card.locator('.tag').first()).not.toHaveText('Unknown');
  await tabs.getByRole('button', { name: /^Unknown/ }).click();
  for (const card of await page.locator('.achievement-card').all())
    await expect(card).toContainText('Unknown');
});
test('storage maps expand above the page and wheel zoom without losing the selected container', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: 'Storage Finder', exact: true }).click();
  await page.getByRole('button', { name: 'Expand map', exact: true }).click();
  const dialog = page.locator('dialog.map-workspace-dialog');
  await expect(dialog).toBeVisible();
  const canvas = dialog.getByRole('img', { name: 'Original location map: Farm' }),
    box = await canvas.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.height).toBeGreaterThan(150);
  const scroll = dialog.locator('.tile-map-scroll'),
    area = await scroll.boundingBox();
  expect(area!.y + area!.height).toBeLessThan(900);
  await canvas.hover();
  await page.mouse.wheel(0, -150);
  await expect
    .poll(() => canvas.evaluate((e) => e.getBoundingClientRect().width))
    .toBeGreaterThan(box!.width);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.storage-detail h2')).toHaveText('Chest');
});
test('design loading prevents edits and history restores a deleted design after reload', async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(() => {
    const w = window as any,
      original = w.__TAURI_INTERNALS__.invoke;
    w.__TAURI_INTERNALS__.invoke = async (cmd: string, args: any) => {
      if (cmd === 'get_state' && args.scope === 'farm-designs')
        await new Promise((r) => setTimeout(r, 1200));
      return original(cmd, args);
    };
  });
  await page.getByRole('button', { name: 'Farm Designer', exact: true }).click();
  await expect(page.getByLabel('Design name')).toBeDisabled();
  await expect(page.getByLabel('Design name')).toBeEnabled();
  await page.getByLabel('Design name').fill('Recover me');
  await page.getByRole('button', { name: 'Save design', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Farm design saved');
  await page.getByRole('button', { name: 'Delete saved design', exact: true }).click();
  await expect(page.getByLabel('Design name')).not.toHaveValue('Recover me');
  await page.reload();
  await page.getByRole('button', { name: 'Farm Designer', exact: true }).click();
  await page.getByText('Version history and deleted designs', { exact: true }).click();
  await page.getByRole('button', { name: 'Recover deleted design: Recover me' }).click();
  await expect(page.getByLabel('Design name')).toHaveValue('Recover me');
});

test('successful transfer updates source coordinates for the next move and keeps a result history', async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(() => {
    const w = window as any,
      original = w.__TAURI_INTERNALS__.invoke;
    w.__TAURI_INTERNALS__.invoke = async (cmd: string, args: any) => {
      if (cmd === 'request_farm_layout') {
        w.__sent = args.design;
        w.__requests.push({ cmd, args });
        return 'move-result';
      }
      if (cmd === 'farm_layout_result')
        return {
          requestId: 'move-result',
          state: 'applied',
          applied: w.__sent.items.map((i: any) => i.id),
          error: null,
        };
      return original(cmd, args);
    };
  });
  await page.getByRole('button', { name: 'Farm Designer', exact: true }).click();
  await page.getByRole('button', { name: 'Import existing farm objects', exact: true }).click();
  await page.locator('.farm-placement').focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Placement X', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Apply at coordinates' }).click();
  await page.locator('#design-confirm').check();
  await page.getByRole('button', { name: 'Send supported placements to game' }).click();
  await expect(page.getByRole('status')).toContainText('1 placements applied');
  await page.getByLabel('Placement X', { exact: true }).fill('7');
  await page.getByRole('button', { name: 'Apply at coordinates' }).click();
  await page.locator('#design-confirm').check();
  await page.getByRole('button', { name: 'Send supported placements to game' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__sent.items[0].sourceTile))
    .toEqual([5, 4]);
});

test('storage item totals preserve quality, shared quantities and address labels', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: 'Storage Finder', exact: true }).click();
  await page.getByLabel('Container address label').fill('Kitchen supplies');
  await page.getByRole('textbox', { name: 'Search current view' }).fill('Milk');
  await expect(page.getByRole('heading', { name: 'Matching item totals' })).toBeVisible();
  await expect(
    page
      .locator('.panel')
      .filter({ has: page.getByRole('heading', { name: 'Matching item totals' }) }),
  ).toContainText('Milk × 4');
  await page.getByLabel('Storage quality').selectOption('0');
  await expect(page.locator('.storage-card')).toHaveCount(0);
  await page.getByLabel('Storage quality').selectOption('2');
  await expect(page.getByLabel('Container address label')).toHaveValue('Kitchen supplies');
  await page.reload();
  await page.getByRole('button', { name: 'Storage Finder', exact: true }).click();
  await expect(page.getByLabel('Container address label')).toHaveValue('Kitchen supplies');
});

test('failed live status reads immediately withdraw completed live evidence', async ({ page }) => {
  await setup(page);
  await page
    .getByRole('button', { name: /^Smart Planner/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Start game with Companion' }).click();
  await page.evaluate(() => {
    (window as any).__liveCompleted = ['shipping:390'];
  });
  await expect(page.locator('.planner-overview').locator('div').first()).toContainText('0');
  await page.evaluate(() => {
    const w = window as any,
      original = w.__TAURI_INTERNALS__.invoke;
    w.__TAURI_INTERNALS__.invoke = (cmd: string, args: any) =>
      cmd === 'connection_status'
        ? Promise.reject(Error('synthetic unreadable status'))
        : original(cmd, args);
  });
  await expect(
    page.getByRole('button', { name: 'Live data unavailable', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.planner-overview').locator('div').first()).toContainText('1');
});
test('group movement, layer locks and design sharing work with keyboard controls', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: 'Farm Designer', exact: true }).click();
  await page.locator('.palette-items button').filter({ hasText: 'Chest' }).click();
  for (const x of ['5', '6']) {
    await page.getByLabel('Placement X', { exact: true }).fill(x);
    await page.getByLabel('Placement Y', { exact: true }).fill('5');
    await page.getByRole('button', { name: 'Apply at coordinates' }).click();
  }
  await page.getByText('Layers and group selection', { exact: true }).click();
  await page.getByRole('button', { name: 'Select editable items' }).click();
  await page.getByLabel('Design map workspace', { exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.farm-placement').first()).toHaveAttribute(
    'aria-label',
    'Chest at 5, 6',
  );
  await page.getByLabel('Group Y offset').fill('2');
  await page.getByLabel('Group X offset').fill('0');
  await page.getByRole('button', { name: 'Copy selected group' }).click();
  await expect(page.locator('.farm-placement')).toHaveCount(4);
  await page.getByLabel('Locked', { exact: true }).first().check();
  await expect(page.locator('.farm-placement').first()).toBeDisabled();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export this design' }).click();
  expect((await download).suggestedFilename()).toBe('companion-design.json');
});

test('scheduled recurring tasks advance on the game calendar and stay in their farm', async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole('button', { name: /^Smart Planner/ })
    .first()
    .click();
  await page.getByLabel('New manual task').fill('Check the greenhouse');
  await page.getByLabel('Game date', { exact: true }).check();
  await page.getByLabel('Task year').fill('2');
  await page.getByLabel('Task season').selectOption('winter');
  await page.getByLabel('Task day').fill('28');
  await page.getByLabel('Repeat days').fill('1');
  await page.locator('.manual-panel').getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('.agenda')).toContainText('winter 28, 2');
  await page.getByRole('button', { name: 'Toggle Check the greenhouse', exact: true }).click();
  await expect(page.locator('.agenda')).toContainText('spring 1, 3');
  await page.reload();
  await page
    .getByRole('button', { name: /^Smart Planner/ })
    .first()
    .click();
  await expect(page.locator('.agenda')).toContainText('spring 1, 3');
});

test('large designs stay editable and the new workspace fits compact Turkish at 130 percent', async ({
  page,
}, testInfo) => {
  await setup(page);
  await page.evaluate(async () => {
    const w = window as any,
      original = w.__TAURI_INTERNALS__.invoke;
    await original('set_state', {
      scope: 'farm-designs',
      value: {
        version: 1,
        designs: [
          {
            version: 1,
            id: 'stress',
            name: 'Synthetic stress layout',
            layout: 'Standard',
            updatedAt: 1,
            items: Array.from({ length: 1500 }, (_, n) => ({
              id: String(n),
              name: 'Chest',
              itemId: '(BC)130',
              kind: 'object',
              width: 1,
              height: 1,
              x: n % 60,
              y: Math.floor(n / 60) + 2,
            })),
          },
        ],
      },
    });
    w.__TAURI_INTERNALS__.invoke = async (cmd: string, args: any) =>
      cmd === 'get_location_map'
        ? {
            width: 80,
            height: 65,
            tileWidth: 16,
            tileHeight: 16,
            layers: [],
            sheets: [],
            images: {},
            walkable: Array(5200).fill(true),
            properties: {},
          }
        : original(cmd, args);
  });
  const started = Date.now();
  await page.getByRole('button', { name: 'Farm Designer', exact: true }).click();
  await expect(page.locator('.farm-placement')).toHaveCount(1500);
  const loaded = Date.now();
  await page.getByText('Layers and group selection', { exact: true }).click();
  await page.getByRole('button', { name: 'Select editable items' }).click();
  await page.getByLabel('Design map workspace', { exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.farm-placement').first()).toHaveAttribute(
    'aria-label',
    'Chest at 1, 2',
  );
  await writeFile(
    testInfo.outputPath('design-performance.json'),
    JSON.stringify({
      placements: 1500,
      loadMs: loaded - started,
      groupMoveMs: Date.now() - loaded,
    }),
  );
  await testInfo.attach('design-performance.json', {
    body: JSON.stringify({
      placements: 1500,
      loadMs: loaded - started,
      groupMoveMs: Date.now() - loaded,
    }),
    contentType: 'application/json',
  });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Text size', { exact: true }).selectOption('1.3');
  await page.getByLabel('Interface language', { exact: true }).selectOption('tr');
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.getByRole('button', { name: 'Çiftlik Tasarımı', exact: true }).click();
  await expect(page.locator('.farm-placement')).toHaveCount(1500);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath('compact-designer.png'), fullPage: true });
});
test('a hung status request expires and its late response cannot resurrect live evidence', async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole('button', { name: /^Smart Planner/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Start game with Companion' }).click();
  await expect(
    page.getByRole('button', { name: 'Live connection active', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const w = window as any,
      original = w.__TAURI_INTERNALS__.invoke;
    w.__TAURI_INTERNALS__.invoke = (cmd: string, args: any) =>
      cmd === 'connection_status'
        ? new Promise((resolve) => {
            w.__lateReply ??= resolve;
          })
        : original(cmd, args);
  });
  await expect(
    page.getByRole('button', { name: 'Live data unavailable', exact: true }),
  ).toBeVisible({ timeout: 9000 });
  await page.evaluate(() => {
    (window as any).__lateReply({ state: 'active', saveId: 'stale', completed: ['shipping:390'] });
  });
  await expect(
    page.getByRole('button', { name: 'Live data unavailable', exact: true }),
  ).toBeVisible();
});
