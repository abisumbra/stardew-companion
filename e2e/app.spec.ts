// These tests mock native IPC with explicitly synthetic farms. No private saves enter fixtures.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { syntheticSave } from '../src/domain/test-fixture';
import { emptyPlanner } from '../src/domain/models';
async function nativeFixture(page: Page, social = false, withMaps = false) {
  const a = syntheticSave(),
    b = syntheticSave();
  b.id = 'synthetic:456';
  b.farmName = 'Second Synthetic';
  b.players[0].name = 'Second Farmer';
  b.players[0].cooked = {};
  if (social) {
    const f = a.players[0];
    f.friendship!.Abigail = 2000;
    f.friendshipDetails = {
      Robin: {
        status: 'Friendly',
        giftsToday: 0,
        giftsThisWeek: 1,
        talkedToToday: false,
        roommate: false,
      },
      Abigail: {
        status: 'Friendly',
        giftsToday: 0,
        giftsThisWeek: 0,
        talkedToToday: false,
        roommate: false,
      },
    };
    const guest = syntheticSave().players[0];
    guest.id = '789';
    guest.name = 'Synthetic Farmhand';
    guest.friendship = { Robin: 500 };
    a.players.push(guest);
  }
  await page.addInitScript(
    ({ saves, withMaps }) => {
      const w = window as unknown as {
        isTauri: boolean;
        __TAURI_INTERNALS__: unknown;
        __TAURI_EVENT_PLUGIN_INTERNALS__: unknown;
        __testRefresh: () => void;
      };
      w.isTauri = true;
      let id = 0;
      const callbacks = new Map<number, (v: unknown) => void>();
      const listeners = new Map<number, number>();
      w.__TAURI_INTERNALS__ = {
        transformCallback: (cb: (v: unknown) => void) => {
          callbacks.set(++id, cb);
          return id;
        },
        unregisterCallback: (n: number) => callbacks.delete(n),
        invoke: async (cmd: string, args: Record<string, unknown> = {}) => {
          if (cmd === 'scan_saves') return { saves, issues: [], directories: ['synthetic-only'] };
          if (cmd === 'get_state') {
            const raw = localStorage.getItem(String(args.scope));
            return raw ? JSON.parse(raw) : null;
          }
          if (cmd === 'set_state') {
            localStorage.setItem(String(args.scope), JSON.stringify(args.value));
            return;
          }
          if (cmd === 'progress_history') return [];
          if (cmd === 'journal_receipt') return null;
          if (cmd === 'record_progress') return;
          if (cmd === 'get_artwork')
            return {
              root: null,
              sheets: withMaps
                ? Object.fromEntries(
                    [
                      'LooseSprites/map',
                      'LooseSprites/map_summer',
                      'LooseSprites/map_fall',
                      'LooseSprites/map_winter',
                    ].map((name) => [
                      name,
                      {
                        width: 1,
                        height: 1,
                        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
                      },
                    ]),
                  )
                : {},
              maps: withMaps
                ? {
                    Valley: {
                      width: 300,
                      height: 180,
                      layers: [
                        {
                          sheet: 'LooseSprites/map',
                          source: { x: 0, y: 0, width: 1, height: 1 },
                          area: { x: 0, y: 0, width: 300, height: 180 },
                          condition: null,
                        },
                      ],
                      areas: {
                        SecretWoods: { x: 20, y: 40, width: 30, height: 20 },
                        Mountain: { x: 180, y: 20, width: 50, height: 30 },
                      },
                      locations: {},
                    },
                  }
                : {},
              sprites: {},
              items: [],
              characters: [],
              monsters: [],
              recipes: {},
              warnings: [],
            };
          if (cmd === 'plugin:event|listen') {
            listeners.set(++id, Number(args.handler));
            return id;
          }
          if (cmd === 'plugin:event|unlisten') {
            listeners.delete(Number(args.eventId));
            return;
          }
          throw new Error(`Unexpected mock IPC command: ${cmd}`);
        },
      };
      w.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
      w.__testRefresh = () => {
        saves[0].day = 9;
        saves[0].syncedAt += 100;
        for (const handler of listeners.values())
          callbacks.get(handler)?.({ event: 'saves-changed', payload: null });
      };
    },
    { saves: [a, b], withMaps },
  );
}
test('Perfection separates learned recipes from saved actions and keeps planning at the top right', async ({
  page,
}) => {
  await nativeFixture(page, true);
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Active farmer' }).selectOption('789');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Perfection', exact: true })
    .click();
  await page.locator('.criteria-strip button').filter({ hasText: 'Cooking' }).click();
  await page
    .getByRole('group', { name: 'Perfection status filter' })
    .getByRole('button', { name: 'All', exact: true })
    .click();
  const soup = page
    .locator('.perfection-row')
    .filter({ has: page.locator('strong', { hasText: 'Pumpkin Soup' }) });
  await expect(soup).toContainText('Not cooked yet');
  await expect(soup).toContainText('Recipe learned');
  const egg = page
    .locator('.perfection-row')
    .filter({ has: page.locator('strong', { hasText: 'Fried Egg' }) });
  await expect(egg).toContainText('Cooked at least once');
  await page
    .getByRole('group', { name: 'Perfection status filter' })
    .getByRole('button', { name: 'Complete', exact: true })
    .click();
  await expect(soup).toHaveCount(0);
  await expect(egg).toBeVisible();
  await page
    .getByRole('group', { name: 'Perfection status filter' })
    .getByRole('button', { name: 'Incomplete', exact: true })
    .click();
  await soup.click();
  await expect(page.getByRole('combobox', { name: 'Detail farmer' })).toHaveValue('123');
  await expect(page.getByRole('combobox', { name: 'Active farmer' })).toHaveValue('789');
  const action = page
    .getByRole('dialog')
    .getByRole('button', { name: 'Add to Planner', exact: true });
  const button = await action.boundingBox(),
    dialog = await page.getByRole('dialog').boundingBox();
  expect(button!.y).toBeLessThan(dialog!.y + 90);
  expect(button!.x).toBeGreaterThan(dialog!.x + dialog!.width / 3);
  await action.click();
  await expect(page.getByRole('combobox', { name: 'Active farmer' })).toHaveValue('123');
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'Interface language' }).selectOption('tr');
  await expect(soup).toContainText('Henüz pişirilmedi');
  await expect(page.getByRole('button', { name: 'Tamamlanmadı', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.setViewportSize({ width: 1000, height: 800 });
  await expect(page.getByRole('combobox', { name: 'Mükemmellik ölçütü' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Mükemmellik ölçütü' }).selectOption('fishing');
  await expect(page.locator('.perfection-panel h2')).toContainText('balık');
});
test('NPC timeline uses readable stops and a fitted draggable map with location-specific markers', async ({
  page,
}) => {
  await nativeFixture(page, true);
  await page.addInitScript(() => {
    const w = window as any,
      original = w.__TAURI_INTERNALS__.invoke;
    w.__TAURI_INTERNALS__.invoke = async (cmd: string, args: any) => {
      if (cmd === 'get_location_map')
        return {
          width: 100,
          height: 80,
          tileWidth: 16,
          tileHeight: 16,
          layers: [],
          sheets: [],
          images: {},
          walkable: Array(8000).fill(true),
          properties: { Warp: '1 2 Forest 3 4 2 2 Forest 3 4' },
        };
      const value = await original(cmd, args);
      if (cmd === 'get_artwork')
        return {
          ...value,
          gameData: {
            characters: {
              Robin: {
                CanBeRomanced: false,
                Home: [{ Location: 'ScienceHouse', Tile: { X: 4, Y: 5 } }],
              },
            },
          },
          schedules: {
            Robin: {
              fall: '900 Town 12 8 0/1300 Forest 6 7 2 robin_read/2200 bed',
              spring: '900 ScienceHouse 4 5 2/2200 ScienceHouse 4 5 2 robin_sleep',
              rain: '900 ScienceHouse 4 5 2/2300 bed',
            },
          },
        };
      return value;
    };
  });
  await page.goto('/');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Encyclopedia', exact: true })
    .click();
  await page.getByRole('button', { name: /^Characters / }).click();
  await page.getByRole('textbox', { name: 'Search current view' }).fill('Robin');
  await page.locator('.social-card').click();
  await page
    .getByRole('navigation', { name: 'Character details sections' })
    .getByRole('button', { name: 'Daily schedules' })
    .click();
  await expect(page.locator('.schedule-timeline li')).toHaveCount(3);
  await expect(page.locator('.schedule-timeline li').last()).toContainText(
    'Robin’s Carpenter Shop',
  );
  await expect(page.locator('.schedule-timeline li').last()).toContainText('Returns home to sleep');
  await page.getByRole('button', { name: 'Show daily route map' }).click();
  const map = page.locator('.tile-map-viewer');
  await expect(map.locator('canvas')).toBeVisible();
  expect(await map.locator('canvas').evaluate((c) => c.getBoundingClientRect().width)).toBeLessThan(
    700,
  );
  await expect(map.locator('.map-marker-list button')).toHaveCount(1);
  await map.getByRole('combobox', { name: 'Tile map location' }).selectOption('Forest');
  await expect(map.locator('.map-marker-list button')).toHaveText('2 · 13:00');
  await expect(map.getByRole('button', { name: 'Focus destination' })).toHaveCount(0);
  await map.getByRole('button', { name: 'Zoom in map' }).click();
  expect(await map.getByRole('combobox', { name: 'Tile map zoom' }).inputValue()).not.toBe('');
  await map.getByRole('combobox', { name: 'Tile map zoom' }).selectOption('2');
  await map.locator('.tile-map-scroll').scrollIntoViewIfNeeded();
  const box = await map.locator('.tile-map-scroll').boundingBox();
  await page.mouse.move(box!.x + 160, box!.y + 120);
  await page.mouse.down();
  await page.mouse.move(box!.x + 50, box!.y + 50, { steps: 5 });
  await page.mouse.up();
  expect(await map.locator('.tile-map-scroll').evaluate((e) => e.scrollLeft)).toBeGreaterThan(0);
  await map.getByRole('button', { name: 'Fit map', exact: true }).click();
  await expect(map.getByRole('combobox', { name: 'Tile map zoom' })).toHaveValue('0');
  await page.getByRole('combobox', { name: 'Schedule weather' }).selectOption('rain');
  await expect(page.locator('.schedule-timeline li')).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Interface language' }).selectOption('tr');
  await expect(page.locator('.schedule-timeline')).toContainText('Uyumak için eve döner');
  await expect(page.locator('.tile-map-viewer canvas')).toHaveCSS('width', /^[2-9]\d\d/);
});
test('monster groups expose each member and concrete entrance guidance', async ({ page }) => {
  await nativeFixture(page);
  await page.addInitScript(() => {
    const w = window as any,
      original = w.__TAURI_INTERNALS__.invoke;
    w.__TAURI_INTERNALS__.invoke = async (cmd: string, args: any) => {
      const result = await original(cmd, args);
      return cmd === 'get_artwork'
        ? {
            ...result,
            gameData: { monsters: { Duggy: '40/6/0/0/false/0/382 0.5/0/0/0/1/0/0/10' } },
          }
        : result;
    };
  });
  await page.goto('/');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Perfection', exact: true })
    .click();
  await page.locator('.criteria-strip button').filter({ hasText: 'Monster Slayer Hero' }).click();
  await page
    .locator('.perfection-row')
    .filter({ has: page.locator('strong', { hasText: /^Duggies$/ }) })
    .click();
  await expect(page.getByRole('heading', { name: 'Where to find this monster' })).toBeVisible();
  await expect(page.locator('.monster-hunting')).toContainText('Floors 2–29');
  await expect(page.locator('.monster-hunting')).toContainText('northeast Mountain');
  await expect(page.locator('.monster-hunting')).toContainText('dirt patches');
  await expect(page.getByRole('button', { name: 'Show entrance map' })).toBeVisible();
});
test('failed saved-state reads never enable destructive edits and can be retried', async ({
  page,
}) => {
  await nativeFixture(page);
  await page.addInitScript(() => {
    const w = window as any,
      original = w.__TAURI_INTERNALS__.invoke;
    w.__failState = true;
    w.__stateWrites = [];
    w.__TAURI_INTERNALS__.invoke = async (cmd: string, args: any = {}) => {
      if (cmd === 'get_state' && args.scope !== 'preferences' && w.__failState)
        throw Error('Simulated read failure');
      if (cmd === 'set_state') w.__stateWrites.push(args);
      return original(cmd, args);
    };
  });
  await page.goto('/');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /^Smart Planner/ })
    .click();
  await expect(
    page.getByText('Your saved plan could not be loaded. Editing is paused to protect it.'),
  ).toBeVisible();
  await expect(page.getByLabel('New manual task')).toHaveCount(0);
  await page.getByRole('navigation').getByRole('button', { name: 'Steam Achievements' }).click();
  await expect(page.getByRole('checkbox', { name: 'Manual', exact: true }).first()).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__stateWrites)).toEqual([]);
  await page.evaluate(() => {
    (window as any).__failState = false;
  });
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /^Smart Planner/ })
    .click();
  await page.getByRole('button', { name: 'Retry saved data' }).click();
  await expect(page.getByLabel('New manual task')).toBeVisible();
});

test('every scanned farm receives a detailed progress summary', async ({ page }) => {
  await nativeFixture(page);
  await page.addInitScript(() => {
    const w = window as any,
      original = w.__TAURI_INTERNALS__.invoke;
    w.__summaries = {};
    w.__TAURI_INTERNALS__.invoke = async (cmd: string, args: any = {}) => {
      if (cmd === 'record_progress') w.__summaries[args.id] = args.summary;
      return original(cmd, args);
    };
  });
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => Object.keys((window as any).__summaries).length))
    .toBe(2);
  const summaries = await page.evaluate(() => Object.values((window as any).__summaries) as any[]);
  expect(summaries.every((s) => s.criteria.length === 11 && 'perfection' in s)).toBe(true);
});
test('backup preview restores validated plans and can export them', async ({ page }) => {
  await nativeFixture(page);
  const backup = {
    format: 'stardew-companion-backup',
    version: 1,
    states: {
      'farm:synthetic:123': {
        ...emptyPlanner(),
        manual: [{ id: 'backup-note', title: 'Restored note', done: false, priority: 'high' }],
      },
    },
  };
  await page.addInitScript((backup) => {
    const w = window as any,
      original = w.__TAURI_INTERNALS__.invoke;
    w.__backupWrites = 0;
    w.__TAURI_INTERNALS__.invoke = async (cmd: string, args: any = {}) => {
      if (cmd === 'plugin:dialog|open' || cmd === 'plugin:dialog|save')
        return 'synthetic-backup.json';
      if (cmd === 'read_backup' || cmd === 'export_backup') return backup;
      if (cmd === 'write_backup') {
        w.__backupWrites++;
        return;
      }
      if (cmd === 'restore_backup') {
        for (const [key, value] of Object.entries(args.backup.states))
          localStorage.setItem(key, JSON.stringify(value));
        return;
      }
      return original(cmd, args);
    };
  }, backup);
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Choose backup' }).click();
  await expect(page.getByText('1 farm plans')).toBeVisible();
  await page.getByRole('button', { name: 'Restore this backup' }).click();
  await expect(page.getByText('Backup restored.')).toBeVisible();
  await page.getByRole('button', { name: 'Export backup' }).click();
  await expect(page.getByText('Backup saved.')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__backupWrites)).toBe(1);
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /^Smart Planner/ })
    .click();
  await expect(
    page.locator('.manual-row').getByText('Restored note', { exact: true }),
  ).toBeVisible();
});
test('guest details, fractional stock and initial reverse tab keep correct state', async ({
  page,
}) => {
  await nativeFixture(page, true);
  await page.addInitScript(
    ({ planner }) => {
      const native = (window as any).__TAURI_INTERNALS__,
        original = native.invoke;
      native.invoke = async (cmd: string, args: any = {}) => {
        const result = await original(cmd, args);
        if (cmd === 'scan_saves') {
          result.saves[0].players[0].cooked = { '236': 1 };
          result.saves[0].players[0].name = 'Fishing';
          result.saves[0].players[1].cooked = {};
        }
        if (cmd === 'get_state' && args.scope.startsWith('farm:')) return planner;
        return result;
      };
    },
    { planner: { ...emptyPlanner(), farmerId: '789', goals: ['cooking:236', 'crafting:Chest'] } },
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /^Smart Planner/ })
    .click();
  await expect(page.getByLabel('Planner farmer', { exact: true })).toHaveValue('789');
  await page.getByRole('button', { name: 'Pumpkin Soup', exact: true }).click();
  await expect(page.locator('.detail-status')).toContainText('Missing from saved progress');
  await page.keyboard.press('Shift+Tab');
  expect(await page.getByRole('dialog').evaluate((el) => el.contains(document.activeElement))).toBe(
    true,
  );
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Materials \d/ }).click();
  const stock = page.getByRole('spinbutton', { name: 'Override Wood availability' });
  await stock.fill('1.5');
  await expect(stock).toHaveValue('1');
  await page.getByLabel('Interface language', { exact: true }).selectOption('tr');
  await expect(
    page.getByLabel('Planın çiftçisi', { exact: true }).locator('option').first(),
  ).toHaveText('Fishing');
  expect(errors).toEqual([]);
});
test('readability preference enlarges text and survives a reload', async ({ page }) => {
  await nativeFixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const label = page.getByRole('heading', { name: 'Your privacy' }),
    before = await label.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  await page.getByLabel('Text size', { exact: true }).selectOption('1.3');
  expect(await label.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(
    before * 1.3,
    1,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Text size', { exact: true })).toHaveValue('1.3');
});

test('fish guides keep alternate locations separate and show readable route maps and conditions', async ({
  page,
}) => {
  await nativeFixture(page, false, true);
  await page.goto('/');
  await page.getByRole('button', { name: 'Encyclopedia', exact: true }).click();
  await page.getByRole('button', { name: /^Fishing 72/ }).click();
  await page.getByLabel('Fish season', { exact: true }).selectOption('winter');
  await page.getByLabel('Fish location', { exact: true }).selectOption('mountain');
  await page.getByRole('textbox', { name: 'Search current view' }).fill('Carp');
  await expect(page.locator('.fish-card strong').filter({ hasText: /^Carp$/ })).toHaveCount(0);
  await page.getByLabel('Fish location', { exact: true }).selectOption('all');
  await page
    .locator('.fish-card')
    .filter({ has: page.locator('strong').filter({ hasText: /^Carp$/ }) })
    .click();
  await page.getByRole('button', { name: 'Secret Woods pond', exact: true }).click();
  await expect(
    page.getByRole('img', { name: 'Fishing area guide: Secret Woods pond' }),
  ).toBeVisible();
  await expect(page.locator('[data-game-sheet="LooseSprites/map_fall"]')).toBeVisible();
  await page.getByLabel('Map season', { exact: true }).selectOption('winter');
  await expect(page.locator('[data-game-sheet="LooseSprites/map_winter"]')).toBeVisible();
  await page.getByRole('button', { name: 'Focus on area', exact: true }).click();
  await expect(
    page.getByRole('img', { name: 'Fishing area guide: Secret Woods pond' }),
  ).not.toHaveAttribute('viewBox', '0 0 300 180');
  const size = await page
    .locator('.fish-dossier section p')
    .first()
    .evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(size).toBeGreaterThanOrEqual(14);
  await page.screenshot({ path: 'artifacts/fishing-guide-preview.png' });
  await page.keyboard.press('Escape');
  await page.getByLabel('Fish season', { exact: true }).selectOption('all');
  await page.getByRole('textbox', { name: 'Search current view' }).fill('Legend');
  await page.locator('.fish-card').click();
  await expect(page.getByText('Outside this route’s normal season', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: /Plan with Magic Bait/ }).check();
  await expect(page.getByText('Saved season matches this route', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Check Fishing buffs or raise your level', { exact: true }),
  ).toBeVisible();
});

test('fish directions remain available when the local game map is missing', async ({ page }) => {
  await nativeFixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Encyclopedia', exact: true }).click();
  await page.getByRole('button', { name: /^Fishing 72/ }).click();
  await page.getByRole('textbox', { name: 'Search current view' }).fill('Carp');
  await page
    .locator('.fish-card')
    .filter({ has: page.locator('strong').filter({ hasText: /^Carp$/ }) })
    .click();
  await expect(page.getByText('In-game map unavailable', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How to get there & catch it' })).toBeVisible();
});

test('social hearts use the selected farmer and keep romantic hearts locked until dating', async ({
  page,
}) => {
  await nativeFixture(page, true);
  await page.goto('/');
  await page.getByRole('button', { name: 'Encyclopedia', exact: true }).click();
  await page.getByRole('button', { name: /^Characters/ }).click();
  await page.getByRole('textbox', { name: 'Search current view' }).fill('Robin');
  await expect(page.getByRole('img', { name: 'Robin: 7 of 10 hearts', exact: true })).toBeVisible();
  await page.locator('.social-card').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Saved daily interactions' })).toBeVisible();
  await dialog.getByLabel('Social view farmer', { exact: true }).selectOption('789');
  await expect(
    dialog.getByRole('img', { name: 'Robin: 2 of 10 hearts', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByLabel('Social view farmer', { exact: true }).selectOption('123');
  await page.getByRole('textbox', { name: 'Search current view' }).fill('Abigail');
  await expect(page.locator('.social-card .pixel-heart.locked')).toHaveCount(2);
  await page.locator('.social-card').click();
  await page.screenshot({ path: 'artifacts/social-hearts-preview.png' });
  await expect(
    dialog.getByRole('img', { name: 'Abigail: 8 of 10 hearts; 2 hearts locked', exact: true }),
  ).toBeVisible();
});

test('seasonal fishing picks an actual winter alternative and includes the birthday calendar', async ({
  page,
}) => {
  await nativeFixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Seasonal Planner', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Birthdays this season' })).toBeVisible();
  await page.getByLabel('Planning season', { exact: true }).selectOption('winter');
  await page.getByRole('textbox', { name: 'Search current view' }).fill('Carp');
  const carp = page
    .locator('.collection-row')
    .filter({ has: page.locator('strong').filter({ hasText: /^Carp$/ }) });
  await expect(carp).toContainText('Secret Woods pond');
  await expect(carp).not.toContainText('Mountain lake');
});

test('original-art gallery renders sprites, portraits, monsters and recipe materials from native metadata', async ({
  page,
}) => {
  // The image is an original synthetic checkerboard, not Stardew Valley artwork.
  const url =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAADpSURBVHhe7dAhFQNRAAPBr+WU1U9tVGJ5j4+APdCAIUH7cq739XvS9/N61DGoZlBtBxhUM6i2AwyqGVTbAQbVDKrtAINqBtV2gEE1g2o7wKCaQbUdYFDNoNoOMKhmUG0HGFQzqLYDDKoZVNsBBtUMqu0Ag2oG1XaAQTWDajvAoJpBtR1gUM2g2nGoeUhtBxhUM6i2AwyqGVTbAQbVDKrtAINqBtV2gEE1g2o7wKCaQbUdYFDNoNoOMKhmUG0HGFQzqLYDDKoZVNsBBtUMqu0Ag2oG1XaAQTWDajvAoJpBtR1gUM2g2t8fcAPqfCo7KaMOQwAAAABJRU5ErkJggg==';
  await nativeFixture(page);
  await page.addInitScript(
    ({ url }) => {
      const internal = (
        window as unknown as {
          __TAURI_INTERNALS__: { invoke: (cmd: string, args?: unknown) => Promise<unknown> };
        }
      ).__TAURI_INTERNALS__;
      const original = internal.invoke;
      internal.invoke = async (cmd, args) => {
        if (cmd !== 'get_artwork') return original(cmd, args);
        const rect = { sheet: 'synthetic', x: 0, y: 0, width: 16, height: 16 };
        return {
          root: 'synthetic-game',
          sheets: { synthetic: { url, width: 64, height: 64 } },
          sprites: {
            'cooking:196': rect,
            'object:176': rect,
            'object:196': rect,
            'character:Robin': { ...rect, width: 64, height: 64 },
            'walking:Robin': { ...rect, height: 32 },
            'monster:Green Slime': rect,
            'ui:heart-filled': { ...rect, width: 7, height: 6 },
            'ui:heart-empty': { ...rect, width: 7, height: 6 },
          },
          items: [{ id: 'object:176', name: 'Synthetic Egg', kind: 'object' }],
          characters: [{ id: 'character:Robin', name: 'Robin', kind: 'character' }],
          monsters: [{ id: 'monster:Green Slime', name: 'Green Slime', kind: 'monster' }],
          recipes: {
            'cooking:196': {
              output: 'object:196',
              quantity: 1,
              ingredients: [{ id: '176', quantity: 1 }],
            },
          },
          warnings: [],
        };
      };
    },
    { url },
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Encyclopedia', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search current view' }).fill('Salad');
  const egg = page
    .locator('button.encyclopedia-card')
    .filter({ has: page.getByText('Salad', { exact: true }) });
  await expect(egg.locator('.game-sprite')).toHaveCSS('background-size', '128px 128px');
  await egg.click();
  await expect(
    page.getByRole('heading', { name: /^(Recipe ingredients|Required ingredients)$/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('dialog').getByText('1 × Synthetic Egg', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('dialog').locator('.ingredient-list .game-sprite')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.getByRole('textbox', { name: 'Search current view' }).fill('');
  await page.getByRole('button', { name: /^Characters/ }).click();
  await page.locator('.entity-card').filter({ hasText: 'Robin' }).click();
  await expect(page.getByRole('dialog').locator('.heart-slots')).toHaveCSS('height', '18px');
  for (const heart of await page.getByRole('dialog').locator('.pixel-heart').all())
    await expect(heart).toHaveCSS('padding', '0px');
  await expect(
    page.getByRole('img', { name: 'Robin character sprite', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Monsters/ }).click();
  await expect(page.locator('.monster-card .game-sprite')).toHaveCount(1);
  await page.locator('.monster-card').click();
  await expect(page.getByRole('heading', { name: 'Green Slime', exact: true })).toBeVisible();
});
test('browser preview is honest and encyclopedia details work', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'A little help for your next harvest.' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose save folder' })).toBeDisabled();
  await page.getByRole('button', { name: 'Encyclopedia', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search current view' }).fill('Pumpkin Soup');
  await page.getByRole('button', { name: 'Pumpkin Soup', exact: false }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select a farm to plan' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('two farms switch real view state and persist isolated manual tasks', async ({ page }) => {
  await nativeFixture(page);
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Welcome back, Synthetic farmer.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Smart Planner', exact: true }).click();
  await page.getByRole('textbox', { name: 'New manual task' }).fill('Synthetic task for farm A');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(
    page.locator('.manual-row').getByText('Synthetic task for farm A', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('YOUR FARM', { exact: true }).selectOption('synthetic:456');
  await expect(
    page.locator('.manual-row').getByText('Synthetic task for farm A', { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel('YOUR FARM', { exact: true }).selectOption('synthetic:123');
  await expect(
    page.locator('.manual-row').getByText('Synthetic task for farm A', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /^Smart Planner/ }).click();
  await expect(
    page.locator('.manual-row').getByText('Synthetic task for farm A', { exact: true }),
  ).toBeVisible();
});
test('save refresh preserves navigation and manual task preferences', async ({ page }) => {
  await nativeFixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Smart Planner', exact: true }).click();
  await page.getByRole('textbox', { name: 'New manual task' }).fill('Keep this manual record');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.evaluate(() => {
    (window as unknown as { __testRefresh: () => void }).__testRefresh();
  });
  await expect(page.getByRole('heading', { name: 'Smart Planner', exact: true })).toBeVisible();
  await expect(
    page.locator('.manual-row').getByText('Keep this manual record', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(
    page.getByText('Fall 9, Year 2 · Stardew Valley 1.6.15', { exact: true }),
  ).toBeVisible();
});
test('guide goals merge milk and remain actionable', async ({ page }) => {
  await nativeFixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Encyclopedia', exact: true }).click();
  for (const name of ['Pumpkin Soup', 'Omelet']) {
    await page.getByRole('textbox', { name: 'Search current view' }).fill(name);
    await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
    await page.getByRole('button', { name: 'Add to Planner', exact: true }).click();
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', { name: /^Smart Planner/ }).click();
  await page.getByRole('button', { name: /^Materials/ }).click();
  const row = page.getByRole('row').filter({ hasText: 'Milk (any)' });
  await expect(row).toHaveCount(1);
  await expect(row.getByRole('cell').nth(1)).toHaveText('2');
  await expect(row.getByRole('cell').nth(3)).toHaveText('1');
});
test('Steam requirements and account manual marks remain distinct', async ({ page }) => {
  await nativeFixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Steam Achievements', exact: true }).click();
  const card = page
    .locator('article')
    .filter({ has: page.getByRole('button', { name: 'Greenhorn', exact: false }) });
  await expect(card.getByText('Save Requirements Met')).toBeVisible();
  await card.getByRole('checkbox', { name: 'Manual' }).check();
  await expect(card.getByText('Manually Marked')).toBeVisible();
  await page.getByLabel('YOUR FARM', { exact: true }).selectOption('synthetic:456');
  await expect(card.getByText('Manually Marked')).toBeVisible();
  await expect(page.getByText(/0 Steam verified/)).toBeVisible();
});
test('dashboard meets basic accessibility and has no runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await nativeFixture(page);
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Welcome back, Synthetic farmer.' }),
  ).toBeVisible();
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'artifacts/dashboard-synthetic.png', fullPage: true });
});
test('every application section opens without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await nativeFixture(page);
  await page.goto('/');
  for (const name of [
    'Perfection',
    'Steam Achievements',
    'Smart Planner',
    'Encyclopedia',
    'Seasonal Planner',
    'Festivals',
    'Completionist',
    'Save Manager',
    'Settings',
    'Dashboard',
  ]) {
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name, exact: true })
      .click();
    await expect(page.locator('main h1')).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test('fishing route and Magic Bait persist into the planner and can be revised', async ({
  page,
}) => {
  await nativeFixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Encyclopedia', exact: true }).click();
  await page.getByRole('button', { name: /^Fishing 72/ }).click();
  await page.getByRole('textbox', { name: 'Search current view' }).fill('Carp');
  await page
    .locator('.fish-card')
    .filter({ has: page.locator('strong').filter({ hasText: /^Carp$/ }) })
    .click();
  await page.getByRole('button', { name: 'Secret Woods pond', exact: true }).click();
  await page.locator('.magic-bait input').check();
  await page.getByRole('button', { name: 'Add to Planner', exact: true }).click();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: /Smart Planner/ })
    .first()
    .click();
  const routeDetails = page
    .locator('.task-list .task-explanation')
    .filter({ hasText: /Route: Secret Woods pond/ });
  await routeDetails.locator('summary').click();
  await expect(routeDetails).toContainText('Equip Magic Bait');
  await page
    .locator('.task-list')
    .getByRole('button', { name: 'Open field notes', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('button', { name: 'Secret Woods pond', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.magic-bait input')).toBeChecked();
  await page.locator('.magic-bait input').uncheck();
  await page.getByRole('button', { name: 'Update fishing plan' }).click();
  await page.keyboard.press('Escape');
  await expect(routeDetails).not.toContainText('Equip Magic Bait');
});
test('Turkish navigation keeps canonical controls and saved farmer names intact', async ({
  page,
}) => {
  await nativeFixture(page, true);
  await page.addInitScript(() => {
    const api = (
        window as unknown as {
          __TAURI_INTERNALS__: { invoke: (cmd: string, args?: unknown) => Promise<any> };
        }
      ).__TAURI_INTERNALS__,
      original = api.invoke;
    api.invoke = async (cmd, args) => {
      const result = await original(cmd, args);
      return cmd === 'get_artwork' ? { ...result, translations: { Carp: 'Sazan' } } : result;
    };
  });
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Interface language' }).selectOption('tr');
  await expect(
    page.getByRole('heading', { name: 'Tekrar hoş geldin, Synthetic farmer.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Ansiklopedi', exact: true }).click();
  await page.getByRole('button', { name: /^Karakterler / }).click();
  await page.getByRole('textbox', { name: 'Bu sayfada ara' }).fill('Robin');
  await page.locator('.social-card').click();
  await expect(page.getByRole('heading', { name: 'Tüm hediye tercihleri' })).toBeVisible();
  await expect(page.getByRole('dialog').locator('.hearts-caption')).toContainText('7 / 10 kalp');
  await page.getByRole('combobox', { name: 'Arayüz dili' }).selectOption('en');
  await expect(page.getByRole('heading', { name: 'All gift preferences' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'Interface language' }).selectOption('tr');
  await page.getByRole('button', { name: /^Balıklar 72/ }).click();
  await page.getByRole('textbox', { name: 'Bu sayfada ara' }).fill('Sazan');
  await expect(page.locator('.fish-card strong')).toHaveText('Sazan');
});
test('backup sections are selectable and appearance restore can be undone', async ({ page }) => {
  await nativeFixture(page);
  await page.addInitScript(() => {
    const w = window as any,
      original = w.__TAURI_INTERNALS__.invoke;
    const farm = 'farm:synthetic:123';
    w.__TAURI_INTERNALS__.invoke = async (cmd: string, args: any = {}) => {
      if (cmd === 'plugin:dialog|open') return 'synthetic-backup.json';
      if (cmd === 'read_backup')
        return {
          format: 'stardew-companion-backup',
          version: 1,
          states: {
            appearance: { version: 1, language: 'tr', textScale: 1.3 },
            [farm]: {
              version: 1,
              goals: [],
              pinned: [],
              priorities: {},
              manual: [],
              completedSteps: [],
              resources: {},
              resolveIntermediate: true,
            },
          },
        };
      if (cmd === 'export_backup')
        return {
          format: 'stardew-companion-backup',
          version: 1,
          states: { appearance: JSON.parse(localStorage.getItem('appearance')!) },
        };
      if (cmd === 'restore_backup') {
        w.__restoredScopes = Object.keys(args.backup.states);
        w.__recovery = {};
        for (const [key, value] of Object.entries(args.backup.states)) {
          w.__recovery[key] = localStorage.getItem(key);
          localStorage.setItem(key, JSON.stringify(value));
        }
        return;
      }
      if (cmd === 'undo_restore') {
        for (const [key, value] of Object.entries(w.__recovery)) {
          if (value === null) localStorage.removeItem(key);
          else localStorage.setItem(key, value as string);
        }
        return;
      }
      return original(cmd, args);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Choose backup', exact: true }).click();
  await page
    .locator('label')
    .filter({ hasText: 'farm:synthetic:123' })
    .getByRole('checkbox')
    .uncheck();
  await page.getByRole('button', { name: 'Restore this backup', exact: true }).click();
  await expect(page.locator('#interface-language')).toHaveValue('tr');
  expect(await page.evaluate(() => (window as any).__restoredScopes)).toEqual(['appearance']);
  await page
    .getByRole('button', { name: 'Son yedek geri yüklemesini geri al', exact: true })
    .click();
  await expect(page.locator('#interface-language')).toHaveValue('en');
  await expect(page.getByLabel('Text size', { exact: true })).toHaveValue('1');
});
