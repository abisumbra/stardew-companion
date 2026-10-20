import { afterEach, describe, it, expect } from 'vitest';
import { itemPrices, itemPriceReference } from './prices';
import { emptyPlanner } from './models';
import { syntheticSave } from './test-fixture';
import { auditArtwork } from './artwork-audit';
import { nextActions } from './next-steps';
import { setLocale, registerGameTranslations, translate } from '../lib/locale';
import type { ArtworkData } from '../components/Artwork';
import type { Task } from './planner';
const art: ArtworkData = {
  root: null,
  sheets: {},
  sprites: {},
  items: [],
  characters: [],
  monsters: [],
  world: [],
  warnings: [],
  recipes: {
    'cooking:236': { output: 'object:236', quantity: 1, kind: 'cooking', ingredients: [] },
  },
  gameData: {
    objects: {
      '24': { Name: 'Parsnip', Price: 35, Category: -75 },
      '128': { Name: 'Pufferfish', Price: 200, Category: -4 },
      '268': { Name: 'Starfruit', Price: 750, Category: -79 },
      '348': { Name: 'Wine', Price: 400, Category: -26 },
      '236': { Name: 'Pumpkin Soup', Price: 300, Category: -7 },
      '306': { Name: 'Mayonnaise', Price: 190, Category: -26 },
      SmokedFish: { Name: 'Smoked Fish', Price: 0, Category: -26 },
      DriedFruit: { Name: 'Dried Fruit', Price: 0, Category: -26 },
      '516': { Name: 'Small Glow Ring', Price: 100, Category: -96 },
    },
    boots: { '504': 'Sneakers/description/50/1/0/0/Sneakers' },
    weapons: {
      '0': {
        Name: 'Rusty Sword',
        MinDamage: 2,
        MaxDamage: 5,
        Speed: 0,
        Type: 3,
        Precision: 0,
        Defense: 0,
        CritChance: 0.02,
        CritMultiplier: 3,
      },
    },
    shirts: { '1000': { Price: 50 } },
    bigCraftables: { '130': { Price: 50 } },
  },
};
afterEach(() => {
  setLocale('en');
  registerGameTranslations({});
});
describe('quality pricing', () => {
  it('rounds quality before profession and profit margin, using the selected farmer', () => {
    const save = syntheticSave();
    save.profitMargin = 0.5;
    save.players[0].professions = [1];
    save.players.push({ ...save.players[0], id: 'guest', professions: [] });
    const host = itemPrices('shipping:24', art, save);
    expect(host.rows.map((r) => r.base)).toEqual([35, 43, 52, 70]);
    expect(host.rows.map((r) => r.adjusted)).toEqual([19, 23, 28, 38]);
    expect(itemPrices('object:24', art, save, 'guest').rows[0].adjusted).toBe(17);
  });
  it('does not invent a saved margin, professions or unsupported-version estimate', () => {
    const save = syntheticSave();
    save.players[0].professions = [];
    expect(itemPrices('object:24', art, save).rows[0].adjusted).toBeNull();
    save.profitMargin = 1;
    save.gameVersion = '1.7.0';
    expect(itemPrices('object:24', art, save).adjustedKnown).toBe(false);
  });
  it('prices wine from its actual input rather than the generic product record', () => {
    const save = syntheticSave();
    save.profitMargin = 1;
    save.players[0].professions = [1, 4];
    expect(itemPrices('object:348', art, save).base).toBeNull();
    const p = itemPrices('object:348', art, save, undefined, '268');
    expect(p.rows.map((r) => r.base)).toEqual([2250, 2812, 3375, 4500]);
    expect(p.rows[0].adjusted).toBe(3150);
    expect(p.rows[3].adjusted).toBe(6300);
  });
  it('combines artisan and angler for smoked fish while retaining quality', () => {
    const save = syntheticSave();
    save.profitMargin = 1;
    save.players[0].professions = [4, 6, 8];
    const p = itemPrices('object:SmokedFish', art, save, undefined, '128');
    expect(p.rows[0].adjusted).toBe(839);
    expect(p.rows[3].adjusted).toBe(1679);
  });
  it('restricts cooked quality to normal/gold and allows ostrich-egg mayonnaise qualities', () => {
    expect(itemPrices('cooking:236', art, null).rows.map((q) => q.available)).toEqual([
      true,
      false,
      true,
      false,
    ]);
    expect(itemPrices('object:306', art, null).rows.every((q) => q.available)).toBe(true);
  });
  it('keeps equipment resale, ring and trinket rules separate from object margins', () => {
    expect(itemPriceReference('boots:504', art).base).toBe(50);
    expect(itemPriceReference('weapon:0', art).base).toBe(50);
    expect(itemPriceReference('object:516', art).base).toBe(50);
    expect(itemPriceReference('trinket:any', art).base).toBe(1000);
    expect(itemPriceReference('shirt:1000', art).base).toBe(25);
    expect(itemPriceReference('tool:Hoe', art).base).toBeNull();
  });
});
describe('artwork matching', () => {
  it('matches all recipe references, including wildcard seeds, and separates native empty art', () => {
    const sprite = { sheet: 'sheet', x: 0, y: 0, width: 16, height: 16 };
    const data = {
      ...art,
      items: [{ id: 'object:empty', name: 'Empty', kind: 'object' }],
      sheets: { sheet: { url: 'data:', width: 16, height: 16 } },
      sprites: {
        'object:495': sprite,
        'object:24': sprite,
        'cooking:236': sprite,
        'object:236': sprite,
      },
      unavailable: { 'object:empty': 'Defined without pixels' },
      recipes: {
        'cooking:236': {
          output: 'object:236',
          quantity: 1,
          ingredients: [{ id: '-777', quantity: 1 }],
        },
      },
    };
    const result = auditArtwork(data);
    expect(result.issues.some((i) => i.id === '-777')).toBe(false);
    expect(result.unavailable.map((i) => i.id)).toContain('object:empty');
  });
});
describe('readable next steps', () => {
  const task = (id: string, deps: string[] = []): Task => ({
    id,
    title: id,
    dependencies: deps,
    goalIds: ['cooking:236'],
    category: 'Available Now',
    reason: 'Read this.',
    sources: [],
    manualDone: false,
    discrepancy: false,
  });
  it('shows prerequisites before dependent actions and retains manually completed evidence', () => {
    const state = emptyPlanner(),
      tasks = [task('cook', ['gather']), task('gather')];
    expect(nextActions(tasks, state).map((t) => t.id)).toEqual(['gather']);
    tasks[1].manualDone = true;
    expect(nextActions(tasks, state).map((t) => t.id)).toEqual(['cook']);
  });
  it('keeps current game translations ahead of authored fallbacks', () => {
    setLocale('tr');
    registerGameTranslations({ 'Pumpkin Soup': 'Oyundaki Çorba' });
    expect(translate('Pumpkin Soup')).toBe('Oyundaki Çorba');
    expect(translate('Cook Pumpkin Soup')).toBe('Oyundaki Çorba pişir');
  });
});
