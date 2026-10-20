import { afterEach, describe, it, expect } from 'vitest';
import {
  festivals,
  festivalDistance,
  festivalMap,
  festivalSupported,
  festivalUrl,
} from './festivals';
import { syntheticSave } from './test-fixture';
import { emptyPlanner } from './models';
import { journalNotes } from './journal';
import { displayText } from './display-text';
import { locationName, locationProfile } from './locations';
import { locationMapIdentity } from './tilemap';
import { wikiReference } from './wiki';
import { sources } from './knowledge';
import { setLocale, translate } from '../lib/locale';
import type { ArtworkData } from '../components/Artwork';
import type { Task } from './planner';
const art: ArtworkData = {
  root: null,
  sheets: {},
  sprites: {},
  items: [],
  characters: [],
  monsters: [],
  recipes: {},
  warnings: [],
  gameData: {
    objects: { '276': { Name: 'Pumpkin' } },
    crops: { '490': { HarvestItemId: '276' } },
    locations: { Farm_Forest: { DisplayName: '[LocalizedText x [EscapedText [FarmName]]]' } },
  },
};
afterEach(() => setLocale('en'));
describe('festival guides', () => {
  it('covers twelve festivals with bilingual illustrated steps and individually reviewed sources', () => {
    expect(festivals).toHaveLength(12);
    expect(new Set(festivals.map((f) => f.id)).size).toBe(12);
    for (const f of festivals) {
      expect(f.steps.length).toBeGreaterThanOrEqual(3);
      expect(f.name.tr).toBeTruthy();
      expect(f.summary.tr).toBeTruthy();
      for (const s of f.steps) {
        expect(s.icon).toBeTruthy();
        expect(s.body.tr.length).toBeGreaterThan(30);
      }
      expect(Object.values(sources).some((s) => s.url === festivalUrl(f))).toBe(true);
    }
  });
  it('uses year parity only for 1.6 and excludes new festivals from 1.5 saves', () => {
    const egg = festivals.find((f) => f.id === 'egg')!;
    expect(festivalMap(egg, 1, '1.6.15')).toBe('Town-EggFestival');
    expect(festivalMap(egg, 2, '1.6.15')).toBe('Town-EggFestival2');
    expect(festivalMap(egg, 2, '1.5.6')).toBe('Town-EggFestival');
    expect(festivals.filter((f) => festivalSupported(f, '1.5.6'))).toHaveLength(9);
  });
  it('finds today inside multi-day events and wraps the year correctly', () => {
    const save = syntheticSave();
    save.season = 'winter';
    save.day = 16;
    expect(
      festivalDistance(
        festivals.find((f) => f.id === 'market')!,
        save,
      ),
    ).toBe(0);
    save.day = 28;
    expect(
      festivalDistance(
        festivals.find((f) => f.id === 'egg')!,
        save,
      ),
    ).toBe(13);
  });
});
describe('journal export payload', () => {
  it('includes pending goals and personal notes while excluding completed work', () => {
    const state = emptyPlanner();
    state.goals = ['cooking:236', 'cooking:194'];
    state.manual = [
      { id: 'manual:1', title: 'Fishing', done: false, priority: 'normal' },
      { id: 'manual:2', title: 'Done', done: true, priority: 'low' },
    ];
    const tasks: Task[] = [
      {
        id: 'a',
        title: 'Cook soup',
        goalIds: ['cooking:236'],
        dependencies: [],
        category: 'Available Now',
        reason: 'Use Pumpkin and Milk',
        sources: [],
        manualDone: false,
        discrepancy: false,
      },
    ];
    const notes = journalNotes(syntheticSave(), state, art, tasks, ['cooking:194']);
    expect(notes.map((n) => n.id)).toEqual(['cooking:236', 'manual:1']);
    expect(notes[0].objective).toBe('Cook Pumpkin Soup');
    expect(notes[0].tracking).toEqual({ mode: 'recipeCrafted', itemId: '(O)236' });
    expect(notes[0].description).toContain('No reward');
    expect(notes[0].description.length).toBeLessThan(180);
    setLocale('tr');
    expect(
      journalNotes(syntheticSave(), state, art, tasks, []).find((n) => n.id === 'manual:1')?.title,
    ).toBe('Fishing');
  });
  it('exports native cooking and crafting actions in the chosen language and keeps reminders distinct', () => {
    const state = emptyPlanner();
    state.goals = ['cooking:236', 'crafting:Chest', 'fishing:128'];
    const withRecipes = {
      ...art,
      recipes: { 'crafting:Chest': { output: 'craftable:130', quantity: 1, ingredients: [] } },
    };
    const en = journalNotes(syntheticSave(), state, withRecipes, [], []);
    expect(en[1].tracking?.itemId).toBe('(BC)130');
    expect(en[2].tracking).toBeUndefined();
    setLocale('tr');
    const tr = journalNotes(syntheticSave(), state, withRecipes, [], []);
    expect(tr[0].title).not.toContain('Cook');
    expect(tr[0].tracking).toEqual(en[0].tracking);
    expect(tr.map((n) => n.id)).toEqual(en.map((n) => n.id));
    expect(tr[0].description).not.toBe(en[0].description);
    const old = syntheticSave();
    old.gameVersion = '1.6.8';
    expect(journalNotes(old, state, withRecipes, [], []).every((n) => !n.tracking)).toBe(true);
  });
  it('bounds long notes to the native transfer limits', () => {
    const state = emptyPlanner();
    state.manual = [{ id: 'manual:1', title: 'a'.repeat(500), done: false, priority: 'normal' }];
    const note = journalNotes(syntheticSave(), state, art, [], [])[0];
    expect(note.title.length).toBeLessThanOrEqual(160);
    expect(note.objective.length).toBeLessThanOrEqual(800);
  });
});
describe('matching display names and Wiki pages', () => {
  it('removes game markup and unresolved tokens without changing canonical map identities', () => {
    expect(displayText('Line^Next\\nThird $h')).toBe('Line\nNext\nThird');
    expect(locationName('Farm_Forest', art)).toBe('Forest Farm');
    expect(locationName('Town-EggFestival2')).toBe('Egg Festival · 2');
    expect(locationProfile('UndergroundMine').maps).toEqual(['Mine']);
    expect(locationMapIdentity('Farm_Forest', 'Standard')).toBe('Farm_Foraging');
    expect(locationMapIdentity('Farm_Standard', 'Forest')).toBe('Farm');
    expect(locationMapIdentity('Farm_MeadowlandsFarm')).toBe('Farm_Ranching');
    setLocale('tr');
    expect(translate(locationProfile('IslandSouthEastCave').access)).toContain('20.00');
  });
  it('matches NPC texture aliases, monster variants, harvest products and map regions', () => {
    expect(wikiReference('character:ParrotBoy', 'Leo', art).url).toMatch(/\/Leo$/);
    expect(wikiReference('monster:Dust Spirit_dangerous', 'Dust Spirit', art).url).toMatch(
      /\/Dust_Sprite$/,
    );
    expect(wikiReference('monster:Frost Bat', 'Frost Bat', art).url).toMatch(/\/Bats$/);
    expect(wikiReference('crop:490', 'Pumpkin Seeds', art).url).toMatch(/\/Pumpkin$/);
    expect(wikiReference('object:276', 'Balkabağı', art).url).toMatch(/\/Pumpkin$/);
    expect(wikiReference('location:IslandWest', 'Island West', art).url).toMatch(
      /Ginger_Island#Island_West$/,
    );
    expect(wikiReference('location:Town', 'Town', art).verified).toBe(true);
  });
  it('labels derived individual URLs honestly instead of using a general search link', () => {
    const ref = wikiReference('object:unknown', 'Unreviewed Example', art);
    expect(ref.verified).toBe(false);
    expect(ref.url).toBe('https://stardewvalleywiki.com/Unreviewed_Example');
  });
});
