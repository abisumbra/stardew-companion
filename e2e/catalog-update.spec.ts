// Browser-only IPC simulation. Native backup safety is tested with temporary synthetic XML.
import { test, expect } from '@playwright/test';
import { syntheticSave } from '../src/domain/test-fixture';
import { emptyPlanner } from '../src/domain/models';
async function fixture(page: import('@playwright/test').Page, goal = false) {
  const save = syntheticSave(),
    state = emptyPlanner();
  state.farmerId = '123';
  if (goal) state.goals = ['cooking:236'];
  state.manual = [
    { id: 'manual:one', title: 'Bring Cauliflower to Luau', done: false, priority: 'normal' },
  ];
  await page.addInitScript(
    ({ save, state }) => {
      localStorage.setItem('companion:language', 'en');
      const w = window as any,
        states: Record<string, unknown> = {};
      let receipt: any = null;
      w.isTauri = true;
      w.__requests = [];
      w.__rejectJournal = false;
      w.__progressWhileClosed = () => {
        save.players[0].cooked!['236'] = 1;
        save.fingerprint = 'next-night';
        save.day = 9;
        save.players[0].quests = [
          {
            id: 'StardewCompanion:synthetic-note',
            kind: '1',
            title: 'Companion: Pumpkin Soup',
            description: 'Personal note',
            objective: 'Cook',
            completed: false,
            daysLeft: 0,
          },
        ];
        localStorage.setItem('synthetic:latest-save', JSON.stringify(save));
      };
      w.__TAURI_INTERNALS__ = {
        transformCallback: () => 1,
        unregisterCallback: () => {},
        invoke: async (cmd: string, args: any = {}) => {
          w.__requests.push({ cmd, args });
          if (cmd === 'scan_saves')
            return {
              saves: [JSON.parse(localStorage.getItem('synthetic:latest-save') ?? 'null') ?? save],
              issues: [],
              directories: [],
              customDirectories: [],
            };
          if (cmd === 'get_state')
            return (
              states[args.scope] ??
              JSON.parse(localStorage.getItem(String(args.scope)) ?? 'null') ??
              (String(args.scope).startsWith('farm:') ? state : null)
            );
          if (cmd === 'set_state') {
            states[args.scope] = args.value;
            localStorage.setItem(String(args.scope), JSON.stringify(args.value));
            return;
          }
          if (cmd === 'get_artwork')
            return {
              root: null,
              sheets: {},
              sprites: {},
              items: [],
              characters: [],
              monsters: [],
              recipes: {},
              warnings: [],
            };
          if (cmd === 'journal_receipt') return receipt;
          if (cmd === 'sync_journal') {
            if (w.__staleJournal) throw 'The save changed. Rescan before transferring tasks';
            if (w.__rejectJournal)
              throw Error('Close Stardew Valley before transferring journal tasks');
            receipt = {
              backupId: 'journal-synthetic.xml',
              appliedFingerprint: 'after-test',
              originalFingerprint: save.fingerprint,
              saveId: save.id,
              farmerId: args.farmerId,
              count: args.tasks.length,
            };
            save.fingerprint = 'after-test';
            return receipt;
          }
          if (cmd === 'undo_journal') {
            save.fingerprint = receipt.originalFingerprint;
            receipt = null;
            return;
          }
          if (cmd === 'progress_history') return [];
          if (['record_progress', 'plugin:event|unlisten', 'plugin:opener|open_url'].includes(cmd))
            return;
          if (cmd === 'plugin:event|listen') return 1;
          throw Error('Unexpected mock IPC: ' + cmd);
        },
      };
      w.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
    },
    { save, state },
  );
  await page.goto('/');
}
test('offline transfer exports only native action tasks with acknowledgement and undo', async ({
  page,
}) => {
  await fixture(page, true);
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /^Smart Planner/ })
    .click();
  const panel = page.locator('.journal-transfer');
  await panel.locator('summary').click();
  await expect(panel).toContainText('Cook Pumpkin Soup');
  await expect(panel).not.toContainText('Bring Cauliflower to Luau');
  const transfer = panel.getByRole('button', { name: 'Transfer selected notes' });
  await expect(transfer).toBeDisabled();
  await panel.getByLabel('I have closed Stardew Valley').check();
  await transfer.click();
  await expect(panel.getByRole('status')).toContainText('Load this save');
  await expect(panel).toContainText('journal-synthetic.xml');
  const call = await page.evaluate(() =>
    (window as any).__requests.find((r: any) => r.cmd === 'sync_journal'),
  );
  expect(call.args.farmerId).toBe('123');
  expect(call.args.fingerprint).toBe('test-only');
  expect(call.args.tasks).toHaveLength(1);
  expect(call.args.tasks[0].title).toBe('Cook Pumpkin Soup');
  expect(call.args.tasks[0].tracking).toEqual({ mode: 'recipeCrafted', itemId: '(O)236' });
  expect(call.args.tasks[0].description).toContain('No reward');
  await panel.getByLabel('I have closed Stardew Valley').check();
  await panel.getByRole('button', { name: 'Undo last transfer' }).click();
  await expect(panel.getByRole('status')).toContainText('previous save was restored');
});
test('journal native refusal is visible and does not claim success', async ({ page }) => {
  await fixture(page, true);
  await page.evaluate(() => ((window as any).__rejectJournal = true));
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /^Smart Planner/ })
    .click();
  const panel = page.locator('.journal-transfer');
  await panel.locator('summary').click();
  await panel.getByLabel('I have closed Stardew Valley').check();
  await panel.getByRole('button', { name: 'Transfer selected notes' }).click();
  await expect(panel.getByRole('alert')).toContainText('Close Stardew Valley');
  await expect(panel.getByRole('status')).toHaveCount(0);
});
test('festival guides filter seasons and add preparation once with Turkish navigation', async ({
  page,
}) => {
  await fixture(page);
  await page.getByRole('button', { name: 'Festivals', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('Festivals');
  await expect(page.locator('.festival-index-card')).toHaveCount(12);
  await page
    .locator('.festival-page-controls')
    .getByRole('button', { name: 'Winter', exact: true })
    .click();
  await expect(page.locator('.festival-index-card')).toHaveCount(4);
  await page.locator('.festival-index-card').filter({ hasText: 'Night Market' }).click();
  await expect(page.locator('.festival-guide h2')).toHaveText('Night Market');
  await expect(page.locator('.festival-guide')).toContainText('1–5–4–2–3');
  await page.getByRole('button', { name: 'Plan festival preparation' }).click();
  await expect(page.getByRole('button', { name: 'In your planner' })).toBeDisabled();
  await page.getByRole('spinbutton', { name: 'Festival guide year' }).fill('7');
  await page.getByRole('combobox', { name: 'Interface language' }).selectOption('tr');
  await expect(page.locator('.festival-guide h2')).toHaveText('Gece Pazarı');
  await expect(page.locator('.festival-page-controls input')).toHaveValue('7');
  await page.getByRole('combobox', { name: 'Arayüz dili' }).selectOption('en');
  await page.getByRole('button', { name: 'Smart Planner', exact: true }).click();
  await expect(page.locator('.manual-row')).toHaveCount(5);
  await page.getByRole('combobox', { name: 'Interface language' }).selectOption('tr');
  await page.getByRole('button', { name: 'Festivaller', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('Festivaller');
  await page.locator('.festival-index-card').filter({ hasText: 'Luau' }).click();
  await expect(page.locator('.festival-guide')).toContainText('Altın kaliteli Karnabahar');
});
test('a stale journal error explains the refusal and provides a read-only rescan without automatic transfer', async ({
  page,
}) => {
  await fixture(page, true);
  await page.evaluate(() => ((window as any).__staleJournal = true));
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /^Smart Planner/ })
    .click();
  const panel = page.locator('.journal-transfer');
  await panel.locator('summary').click();
  await panel.getByLabel('I have closed Stardew Valley').check();
  await panel.getByRole('button', { name: 'Transfer selected notes' }).click();
  await expect(panel.getByRole('alert')).toContainText('nothing was written');
  const before = await page.evaluate(
    () => (window as any).__requests.filter((r: any) => r.cmd === 'scan_saves').length,
  );
  await panel.getByRole('button', { name: 'Rescan saves' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__requests.filter((r: any) => r.cmd === 'scan_saves').length,
      ),
    )
    .toBeGreaterThan(before);
  expect(
    await page.evaluate(
      () => (window as any).__requests.filter((r: any) => r.cmd === 'sync_journal').length,
    ),
  ).toBe(1);
  await page.getByRole('combobox', { name: 'Interface language' }).selectOption('tr');
  await expect(panel.getByRole('alert')).toContainText('Yeni ilerlemeni korumak');
  await expect(panel.getByRole('button', { name: 'Kayıtları yeniden tara' })).toBeVisible();
  await panel.getByRole('alert').screenshot({ path: 'artifacts/journal-rescan-0.7.1.local.png' });
});
test('encyclopedia category titles match selection and Animals has its own category', async ({
  page,
}) => {
  await fixture(page);
  await page.getByRole('button', { name: 'Encyclopedia', exact: true }).click();
  for (const name of ['Fishing', 'Cooking', 'Locations', 'Animals']) {
    await page
      .locator('main .filter-tabs')
      .getByRole('button', { name: new RegExp('^' + name + ' ') })
      .click();
    await expect(page.locator('main h1')).toHaveText(name);
  }
  await expect(page.locator('main')).not.toContainText('Animals & buildings');
});
test('saved progress made while closed is reconciled on launch and completed game reminders can be cleared without an undo receipt', async ({
  page,
}) => {
  await fixture(page, true);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: /^Smart Planner/ })
    .click();
  await expect(page.locator('.planner-sync-summary')).toContainText('0 confirmed goals');
  await page.evaluate(() => (window as any).__progressWhileClosed());
  await page.reload();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: /^Smart Planner/ })
    .click();
  await expect(page.locator('.planner-sync-summary')).toContainText('1 confirmed goals');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('farm:synthetic:123') ?? '{}').goalReceipts?.['123']?.[
            'cooking:236'
          ]?.fingerprint,
      ),
    )
    .toBe('next-night');
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('farm:synthetic:123')!));
  expect(state.manual[0].done).toBe(false);
  const panel = page.locator('.journal-transfer');
  await panel.locator('summary').click();
  await expect(panel).toContainText('1 existing game notes');
  await expect(panel.locator('.journal-preview')).not.toContainText('Pumpkin Soup');
  await panel.getByRole('button', { name: 'Clear selection' }).click();
  await panel.getByLabel('I have closed Stardew Valley').check();
  await expect(panel.getByRole('button', { name: 'Undo last transfer' })).toBeDisabled();
  await panel.getByRole('button', { name: 'Remove Companion notes' }).click();
  const call = await page.evaluate(() =>
    (window as any).__requests.find((r: any) => r.cmd === 'sync_journal'),
  );
  expect(call.args.tasks).toEqual([]);
});
