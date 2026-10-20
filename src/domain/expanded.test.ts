import { describe, it, expect } from 'vitest';
import { giftRules, giftTaste } from './gifts';
import { parseSchedule, scheduleKeys } from './schedules';
import { installedMaterials } from './materials';
import { walnutEntries, walnutProgress, bundleProgress, museumProgress } from './completion';
import { recipeUnlock } from './installed';
import { syntheticSave } from './test-fixture';
import { emptyPlanner } from './models';
import { buildPlan } from './planner';
import { processingRecipes } from './machines';
import type { ArtworkData } from '../components/Artwork';
const art: ArtworkData = {
  root: 'synthetic',
  sheets: {},
  sprites: {},
  items: [],
  characters: [],
  monsters: [],
  recipes: {},
  gameData: {
    objects: {
      '176': { Category: -5, Price: 50 },
      '24': { Category: -75, Type: 'Basic' },
      '66': { Category: -2, Type: 'Minerals' },
    },
  },
  warnings: [],
};
const neutral = { love: [], like: [], neutral: [], dislike: [], hate: [] };
describe('complete gift rules', () => {
  it('resolves explicit exceptions over universal tastes and conflicting personal IDs', () => {
    const item = { id: '74', category: -2, tags: [], price: 2000, edibility: -300 };
    const universal = { ...neutral, love: ['74'] };
    expect(giftTaste(item, giftRules('/ / / / / / /74/ /'), universal).taste).toBe('hate');
    expect(giftTaste(item, { ...neutral, hate: ['74', '-2'] }, universal).taste).toBe('hate');
    expect(giftTaste({ ...item, id: '18' }, giftRules('///18////18//'), neutral).taste).toBe(
      'hate',
    );
  });
  it('supports context tags, category preferences and unpalatable defaults', () => {
    expect(
      giftTaste(
        { id: 'Book_Test', category: 0, tags: ['book_item'], price: 1000, edibility: -300 },
        { ...neutral, love: ['book_item'] },
        { ...neutral, neutral: ['book_item'] },
      ).taste,
    ).toBe('love');
    expect(
      giftTaste(
        { id: '176', category: -5, tags: [], price: 50, edibility: 20 },
        { ...neutral, dislike: ['-5'] },
        neutral,
      ).taste,
    ).toBe('dislike');
    expect(
      giftTaste({ id: 'test', category: 0, tags: [], price: 50, edibility: -20 }, neutral, neutral)
        .taste,
    ).toBe('hate');
  });
});
describe('schedule reference', () => {
  it('uses the saved date and resolves redirects without running game scripts', () => {
    const save = syntheticSave();
    save.day = 1;
    save.season = 'spring';
    const data = { Mon: 'GOTO spring', spring: '900 Town 12 3 0/1200 Forest 4 5 2' };
    expect(scheduleKeys('Robin', data, save, 'dry')[0]).toBe('Mon');
    expect(parseSchedule(data, 'Mon', save).points.map((p) => p.location)).toEqual([
      'Town',
      'Forest',
    ]);
    expect(parseSchedule({ a: 'GOTO a' }, 'a', save).notes.join()).toContain('cycle');
  });
  it('keeps unknown letter conditions and rain alternatives explicit', () => {
    const save = syntheticSave();
    save.players[0].mail = null;
    expect(
      parseSchedule(
        { spring: 'MAIL unlock/GOTO dry/GOTO rain', dry: '900 Town 1 1', rain: '900 Forest 1 1' },
        'spring',
        save,
      ).points,
    ).toEqual([]);
    expect(
      scheduleKeys('Robin', { spring: '', rain: '', rain2: '' }, save, 'rain').slice(0, 2),
    ).toEqual(['rain2', 'rain']);
  });
});
describe('installed recipe material planning', () => {
  it('expands deterministic furnace inputs and fuel but excludes random outputs', () => {
    const data = {
      ...art,
      gameData: {
        ...art.gameData,
        machines: {
          '(BC)13': {
            AdditionalConsumedItems: [{ ItemId: '(O)382', RequiredCount: 1 }],
            OutputRules: [
              {
                Triggers: [{ Trigger: 1, RequiredItemId: '(O)378', RequiredCount: 5 }],
                OutputItem: [{ ItemId: '(O)334', MinStack: -1, MaxStack: -1 }],
              },
              {
                Triggers: [{ Trigger: 1, RequiredItemId: '(O)80', RequiredCount: 1 }],
                OutputItem: [{ ItemId: '(O)338', MinStack: 1, MaxStack: 3 }],
              },
            ],
          },
        },
      },
    };
    expect(processingRecipes(data)).toHaveLength(1);
    const result = installedMaterials({ '334': 3 }, { '334': 1, '378': 5 }, data);
    expect(result.crafts['334']).toBe(2);
    expect(result.leaves['378'].missing).toBe(5);
    expect(result.leaves['382'].required).toBe(2);
  });
  it('uses the selected farmhand’s profession, money and inventory for planning', () => {
    const save = syntheticSave(),
      guest = {
        ...syntheticSave().players[0],
        id: 'guest',
        professions: [7],
        inventory: { '388': 25, '334': 2 },
        money: 100,
      };
    save.players.push(guest);
    const state = emptyPlanner();
    state.farmerId = 'guest';
    state.resolveIntermediate = false;
    state.goals = ['crafting:Crab Pot'];
    const id = state.goals[0];
    const data = {
      ...art,
      recipes: {
        [id]: {
          name: 'Crab Pot',
          kind: 'crafting',
          output: 'object:710',
          quantity: 1,
          ingredients: [
            { id: '388', quantity: 40 },
            { id: '335', quantity: 3 },
          ],
        },
      },
      gameData: {
        ...art.gameData,
        buildings: {
          Coop: {
            Name: 'Coop',
            BuildCost: 4000,
            BuildDays: 3,
            BuildMaterials: [{ ItemId: '(O)388', Amount: 300 }],
          },
        },
      },
    };
    const plan = buildPlan(save, state, data);
    expect(plan.materials.find((m) => m.id === '388')?.required).toBe(25);
    expect(plan.materials.find((m) => m.id === '335')).toBeUndefined();
    state.goals = ['building:Coop'];
    const building = buildPlan(save, state, data);
    expect(building.materials.find((m) => m.id === 'currency:gold')?.missing).toBe(3900);
  });
  it('reserves concrete items before overlapping category pools', () => {
    const result = installedMaterials({ '176': 1, egg: 1 }, { '176': 1 }, art);
    expect(result.leaves['176'].available).toBe(1);
    expect(result.leaves.egg.missing).toBe(1);
  });
  it('merges intermediate demands and accounts for yield and existing output', () => {
    const data = {
      ...art,
      recipes: {
        a: { output: 'object:100', quantity: 3, ingredients: [{ id: '388', quantity: 2 }] },
      },
    };
    const result = installedMaterials({ '100': 7, '388': 1 }, { '100': 1, '388': 2 }, data);
    expect(result.crafts['100']).toBe(2);
    expect(result.leaves['388']).toEqual({ required: 5, available: 2, missing: 3 });
  });
  it('preserves a Magic Bait route in the generated plan', () => {
    const save = syntheticSave(),
      state = emptyPlanner();
    state.goals = ['fishing:163'];
    state.fishing['fishing:163'] = { routeIndex: 0, magicBait: true };
    const plan = buildPlan(save, state);
    expect(plan.tasks[0].reason).toContain('Equip Magic Bait');
    expect(plan.tasks[0].category).toBe('Check Conditions');
  });
  it('uses native TV episodes and recipe shops rather than invented level-code unlocks', () => {
    const data = {
      ...art,
      gameData: {
        tvRecipes: { '17': 'A meal/Unused' },
        shops: {
          Shop: {
            Items: [{ IsRecipe: true, ItemId: '(O)100', Price: 500, Condition: 'SEASON summer' }],
          },
        },
      },
    };
    const text = recipeUnlock(
      {
        name: 'A meal',
        kind: 'cooking',
        unlock: 'l 100',
        output: 'object:100',
        quantity: 1,
        ingredients: [],
      },
      data,
    ).join(' ');
    expect(text).toContain('year 2, spring 7');
    expect(text).toContain('500g');
    expect(text).not.toContain('level 100');
  });
});
describe('optional collection evidence', () => {
  it('covers 130 walnuts and distinguishes unknown from known missing markers', () => {
    expect(walnutEntries.reduce((n, w) => n + w.count, 0)).toBe(130);
    const save = syntheticSave();
    expect(walnutProgress(save).every((w) => w.done === null)).toBe(true);
    save.completion = {
      museum: [],
      bundles: {},
      bundleDefinitions: {},
      collectedNuts: [],
      limitedNuts: {},
      goldenCoconutCracked: false,
      goldenParrotUsed: false,
      worldFlags: [],
    };
    expect(walnutProgress(save).every((w) => w.done === false)).toBe(true);
    save.completion.collectedNuts = [walnutEntries[0].id];
    expect(walnutProgress(save)[0].done).toBe(true);
  });
  it('uses saved remixed definitions and donation flags', () => {
    const save = syntheticSave();
    save.completion = {
      museum: ['66'],
      bundles: { '7': [true, false] },
      bundleDefinitions: { 'Pantry/7': 'Remixed/O 1 1/24 2 2 176 1 0/0/1' },
      collectedNuts: null,
      limitedNuts: null,
      goldenCoconutCracked: null,
      goldenParrotUsed: null,
      worldFlags: null,
    };
    const bundle = bundleProgress(save, art)[0];
    expect(bundle.required).toBe(1);
    expect(bundle.done).toBe(true);
    expect(bundle.items[0].quantity).toBe(2);
    expect(museumProgress(save, art)).toEqual([{ id: '66', name: '66', done: true }]);
  });
});
