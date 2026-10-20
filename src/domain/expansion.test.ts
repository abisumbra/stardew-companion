import { describe, it, expect, afterEach } from 'vitest';
import {
  blankDesign,
  designMaterials,
  farmLayouts,
  placementIssue,
  FarmDesignsSchema,
  qualifiedDesignItem,
  type DesignItem,
} from './farm-design';
import { spriteKey } from './artwork-identity';
import { liveGoals } from './connection';
import { syntheticSave } from './test-fixture';
import { emptyPlanner, AccountSchema } from './models';
import { achievementProgress } from './achievements';
import { knowledge } from './knowledge';
import { setLocale, registerGameTranslations, translate, formatNumber } from '../lib/locale';
import { languages } from '../locales/languages';
import { BackupSchema } from './backup';
import type { ArtworkData } from '../components/Artwork';
import { offlineJournalNotes } from './journal';
const art: ArtworkData = {
  root: null,
  sheets: {},
  sprites: {},
  items: [],
  characters: [],
  monsters: [],
  recipes: {
    'crafting:Fence': {
      name: 'Fence',
      kind: 'crafting',
      output: 'object:322',
      quantity: 2,
      ingredients: [{ id: '388', quantity: 3 }],
    },
  },
  warnings: [],
};
const item = (id: string, x = 1, y = 1): DesignItem => ({
  id,
  name: 'Fence',
  itemId: '(O)322',
  kind: 'object',
  recipe: 'crafting:Fence',
  x,
  y,
  width: 1,
  height: 1,
});
afterEach(() => setLocale('en'));
describe('farm planning and storage identities', () => {
  it('offers all original farm layouts and keeps saved designs independent of game saves', () => {
    expect(farmLayouts).toHaveLength(8);
    const design = blankDesign('Meadowlands');
    design.items = [item('one')];
    const backup = BackupSchema.parse({
      format: 'stardew-companion-backup',
      version: 1,
      states: { 'farm-designs': { version: 1, designs: [design] } },
    });
    expect(FarmDesignsSchema.parse(backup.states['farm-designs']).designs[0].layout).toBe(
      'Meadowlands',
    );
  });
  it('calculates complete recipe batches rather than dividing each ingredient independently', () => {
    const design = blankDesign();
    design.items = [item('a'), item('b', 2), item('c', 3)];
    expect(designMaterials(design, art).materials['388']).toBe(6);
    design.items[0].sourceTile = [4, 4];
    expect(designMaterials(design, art).materials['388']).toBe(3);
  });
  it('rejects overlap, negative coordinates and edges but reports terrain uncertainty separately', () => {
    const first = item('a'),
      second = item('b');
    const map = { width: 8, height: 8, walkable: Array(64).fill(true) };
    expect(placementIssue(second, [first], map)).toContain('overlaps');
    expect(placementIssue(item('a', -1), [], map)).toContain('outside');
    expect(placementIssue(item('a', 8), [], map)).toContain('outside');
    map.walkable[9] = false;
    expect(placementIssue(first, [], map)).toContain('blocked');
    expect(placementIssue(item('a', 2), [], map)).toBeNull();
  });
  it('resolves qualified machine and equipment artwork rather than treating them as ordinary objects', () => {
    const sprite = { sheet: 'x', x: 0, y: 0, width: 16, height: 16 };
    expect(spriteKey('(BC)130', { 'craftable:130': sprite })).toBe('craftable:130');
    expect(spriteKey('(W)4', { 'weapon:4': sprite })).toBe('weapon:4');
    expect(qualifiedDesignItem('craftable:130')).toBe('(BC)130');
  });
});
describe('measured live tasks and public Steam evidence', () => {
  it('does not export untracked reminders through the legacy offline screen', async () => {
    const state = emptyPlanner();
    state.goals = ['shipping:390', 'fishing:128', 'cooking:236'];
    state.manual = [{ id: 'x', title: 'Personal', done: false, priority: 'normal' }];
    await setLocale('ja');
    const notes = offlineJournalNotes(syntheticSave(), state, art, [], []);
    expect(notes.map((n) => n.id)).toEqual(['cooking:236']);
    expect(notes[0].title).toBe('Cook Pumpkin Soup');
  });
  it('exports shipping as a real measured condition and keeps free text out of the game journal', () => {
    const state = emptyPlanner();
    state.goals = ['shipping:390'];
    state.manual = [{ id: 'note', title: 'Something personal', done: false, priority: 'normal' }];
    const result = liveGoals(syntheticSave(), state, art);
    expect(result.goals[0].conditions).toEqual([{ source: 'shipped', key: '390', minimum: 1 }]);
    expect(result.unsupported).toContain('note');
  });
  it('uses native language terms inside action templates without leaking Turkish into other languages', async () => {
    registerGameTranslations({ Stone: 'Taş' }, 'tr');
    registerGameTranslations({ Stone: 'Stein' }, 'de');
    await setLocale('de');
    const state = emptyPlanner();
    state.goals = ['shipping:390'];
    expect(liveGoals(syntheticSave(), state, art).goals[0].title).toBe('Stein versenden');
    setLocale('en');
    expect(translate('Stone')).toBe('Stone');
  });
  it('provides all twelve official language choices and localized number formatting', async () => {
    expect(Object.keys(languages)).toHaveLength(12);
    await setLocale('ja');
    expect(translate('Farm Designer')).toBe('牧場デザイン');
    await setLocale('de');
    expect(formatNumber(1234.5)).toBe('1.234,5');
  });
  it('never substitutes farm progress or manual marks for an explicit public Steam unlock', () => {
    const achievement = knowledge.steam.achievements.find((a) => a.name === 'Greenhorn')!;
    const account = AccountSchema.parse({
      version: 1,
      manuallyMarked: [],
      steam: {
        profileId: '76561197960287930',
        sourceUrl: 'https://steamcommunity.com/profiles/76561197960287930/stats/413150/',
        fetchedAt: 100,
        unlocked: [achievement.id],
        observedTotal: 49,
      },
    });
    const p = achievementProgress(achievement, null, account);
    expect(p.status).toBe('Steam Verified');
    expect(p.evidence.reason).toContain('Public Steam');
    expect(
      achievementProgress(achievement, syntheticSave(), { version: 1, manuallyMarked: [] }).status,
    ).toBe('Save Requirements Met');
  });
});
