import { describe, expect, it } from 'vitest';
import { buildPlan } from './planner';
import { emptyPlanner } from './models';
import { syntheticSave } from './test-fixture';
import { detectedSupply, buildingCount } from './supplies';
import { remainingOfferings, bundleProgress } from './completion';
import { monsterGroup, monsterData } from './monsters';
import { locationMapIdentity, mapExits, withObstacles, walkingPath } from './tilemap';
import { queryConditions } from './conditions';
import { objectiveEvidence } from './objectives';
import { giftPoints, teaPoints } from './gifts';
import { validateArtwork } from './artwork-schema';
import type { ArtworkData } from '../components/Artwork';
const art: ArtworkData = {
  root: 'synthetic',
  sheets: {},
  sprites: {},
  items: [],
  characters: [],
  monsters: [],
  recipes: {},
  warnings: [],
  gameData: {
    objects: { '184': { Category: -6, Price: 125 }, '176': { Category: -5, Price: 50 } },
    buildings: {
      'Deluxe Coop': { BuildingToUpgrade: 'Big Coop' },
      'Big Coop': { BuildingToUpgrade: 'Coop' },
      Coop: { Name: 'Coop', BuildCost: 4000, BuildMaterials: [] },
    },
  },
};
describe('audit regression scenarios', () => {
  it('shares a root cooking action with an intermediate dish without duplicating corn', () => {
    const save = syntheticSave();
    save.players[0].cooked = {};
    const data = {
      ...art,
      recipes: {
        'cooking:229': {
          name: 'Tortilla',
          kind: 'cooking',
          output: 'object:229',
          quantity: 1,
          ingredients: [{ id: '270', quantity: 1 }],
        },
        'cooking:204': {
          name: 'Lucky Lunch',
          kind: 'cooking',
          output: 'object:204',
          quantity: 1,
          ingredients: [{ id: '229', quantity: 1 }],
        },
      },
    };
    const plan = buildPlan(
      save,
      { ...emptyPlanner(), goals: ['cooking:229', 'cooking:204'] },
      data,
    );
    expect(plan.materials.find((m) => m.id === '270')?.required).toBe(1);
    expect(
      plan.tasks.filter((t) => t.entryId === 'cooking:229' && /^(produce|action):/.test(t.id)),
    ).toHaveLength(1);
    expect(plan.tasks.find((t) => t.id === 'action:cooking:204')?.dependencies).toContain(
      'action:cooking:229',
    );
  });
  it('keeps shortages and their actual owners through intermediate productions', () => {
    const save = syntheticSave();
    save.storage = {};
    save.players[0].inventory = {};
    save.players[0].crafting!['Quality Sprinkler'] = 0;
    const data = {
      ...art,
      recipes: {
        'crafting:Quality Sprinkler': {
          name: 'Quality Sprinkler',
          kind: 'crafting',
          output: 'object:621',
          quantity: 1,
          ingredients: [{ id: '335', quantity: 1 }],
        },
        iron: {
          name: 'Iron',
          kind: 'machine',
          output: 'object:335',
          quantity: 1,
          ingredients: [{ id: '380', quantity: 5 }],
        },
        'crafting:Chest': {
          name: 'Chest',
          kind: 'crafting',
          output: '(BC)130',
          quantity: 1,
          ingredients: [{ id: '388', quantity: 50 }],
        },
      },
    };
    const p = buildPlan(
      save,
      { ...emptyPlanner(), goals: ['crafting:Chest', 'crafting:Quality Sprinkler'] },
      data,
    );
    expect(p.tasks.find((t) => t.id === 'action:crafting:Quality Sprinkler')?.category).not.toBe(
      'Available Now',
    );
    expect(p.materials.find((m) => m.id === '380')?.goals).toEqual(['crafting:Quality Sprinkler']);
  });
  it('does not complete a guest achievement because the host cooked ten dishes', () => {
    const save = syntheticSave(),
      guest = structuredClone(save.players[0]);
    guest.id = 'guest';
    guest.cooked = {};
    save.players.push(guest);
    save.players[0].cooked = Object.fromEntries(
      ['194', '195', '196', '197', '198', '199', '200', '201', '202', '203'].map((id) => [id, 1]),
    );
    const p = buildPlan(save, {
      ...emptyPlanner(),
      farmerId: 'guest',
      goals: ['achievement:cook'],
    });
    expect(p.completedGoals).not.toContain('achievement:cook');
    expect(p.tasks.length).toBeGreaterThan(0);
  });
  it('records completed special objectives and preserves upgraded predecessor buildings', () => {
    const save = syntheticSave();
    save.players[0].skills.farming = 10;
    save.buildings = ['Deluxe Coop'];
    expect(buildingCount(save, 'Coop', art)).toBe(1);
    const p = buildPlan(
      save,
      { ...emptyPlanner(), goals: ['skill:farming', 'building:Coop'] },
      art,
    );
    expect(p.completedGoals).toEqual(['skill:farming', 'building:Coop']);
    expect(
      buildPlan(
        save,
        { ...emptyPlanner(), buildingTargets: { Coop: 2 }, goals: ['building:Coop'] },
        art,
      ).completedGoals,
    ).toEqual([]);
  });
  it('cleans donated, duplicate and invalid bundle selections after a save refresh', () => {
    const save = syntheticSave();
    save.completion = {
      museum: null,
      bundles: { '7': [true, false, false] },
      bundleDefinitions: { 'Pantry/7': 'Test/Reward/24 1 0 188 1 0 190 1 0/0/3' },
      collectedNuts: null,
      limitedNuts: null,
      goldenCoconutCracked: null,
      goldenParrotUsed: null,
      worldFlags: null,
    };
    const b = bundleProgress(save, art)[0];
    expect(remainingOfferings(b, [0, 1, 1, 99])).toEqual([1]);
    const p = buildPlan(
      save,
      { ...emptyPlanner(), goals: ['bundle:7'], bundleChoices: { '7': [0, 1] } },
      art,
    );
    expect(p.tasks.some((t) => t.title.startsWith('Choose offerings'))).toBe(true);
    expect(p.materials).toHaveLength(0);
  });
  it('counts category ingredients and keeps unknown stock uncertain', () => {
    const save = syntheticSave();
    expect(detectedSupply(save, save.players[0], 'milk', art)).toEqual({ count: 1, known: true });
    save.players[0].inventoryKnown = false;
    save.players[0].inventory = {};
    save.storage = {};
    const p = buildPlan(save, { ...emptyPlanner(), goals: ['cooking:236'] }, art);
    expect(p.tasks.find((t) => t.id === 'material:milk')?.title).toContain('Verify stock');
  });
  it('counts only eligible quality stacks for bundle evidence', () => {
    const save = syntheticSave();
    save.players[0].inventoryStacks = [
      { id: '24', quantity: 2, quality: 0 },
      { id: '24', quantity: 3, quality: 2 },
    ];
    save.storageStacks = [{ id: '24', quantity: 1, quality: 4 }];
    expect(detectedSupply(save, save.players[0], '24', art, 2)).toEqual({ count: 4, known: true });
  });
  it('resolves eradication display names and uses versioned insect totals', () => {
    const data = {
      ...art,
      gameData: {
        ...art.gameData,
        monsterGoals: {
          Insects: { DisplayName: 'Cave Insects', Targets: ['Bug'], Count: 80 },
          Shadows: { DisplayName: 'Void Spirits', Targets: ['Shadow Brute'], Count: 150 },
        },
        monsters: { 'Green Slime': '24/5/0/0/false/1000/766 .75/1/.01/4/2/.00/true/3/Green Slime' },
      },
    };
    expect(monsterGroup('Cave Insects', data, '1.5.6')?.Count).toBe(125);
    expect(monsterGroup('Void Spirits', data, '1.6.15')?.Targets).toEqual(['Shadow Brute']);
    expect(monsterData('Green Slime_dangerous', data)?.location).toBe('Dangerous Mines');
  });
  it('selects original farm-specific maps and refuses an unconfirmed custom farm', () => {
    expect(locationMapIdentity('Farm', 'Meadowlands')).toBe('Farm_Ranching');
    expect(locationMapIdentity('Farm', 'Riverland')).toBe('Farm_Fishing');
    expect(locationMapIdentity('Farm', 'Custom / unknown')).toBe(null);
  });
  it('plans every required predecessor when two upgraded buildings are requested', () => {
    const save = syntheticSave();
    save.buildings = ['Coop'];
    const data = {
      ...art,
      gameData: {
        ...art.gameData,
        buildings: {
          ...art.gameData!.buildings,
          'Big Coop': {
            Name: 'Big Coop',
            BuildingToUpgrade: 'Coop',
            BuildCost: 100,
            BuildMaterials: [],
          },
          'Deluxe Coop': {
            Name: 'Deluxe Coop',
            BuildingToUpgrade: 'Big Coop',
            BuildCost: 200,
            BuildMaterials: [],
          },
        },
      },
    };
    const plan = buildPlan(
      save,
      { ...emptyPlanner(), goals: ['building:Deluxe Coop'], buildingTargets: { 'Deluxe Coop': 2 } },
      data,
    );
    expect(plan.tasks.find((t) => t.id === 'action:building:Coop')?.title).toBe(
      'Construct 1 × Coop',
    );
    expect(plan.tasks.find((t) => t.id === 'action:building:Big Coop')?.title).toBe(
      'Construct 2 × Big Coop',
    );
    expect(plan.materials.find((m) => m.id === 'currency:gold')?.required).toBe(4600);
  });
  it('negates an aggregate player condition after evaluating Any, retaining quoted names', () => {
    const save = syntheticSave();
    const guest = structuredClone(save.players[0]);
    guest.id = 'guest';
    guest.cookingKnown = {};
    save.players.push(guest);
    expect(queryConditions('!PLAYER_HAS_COOKING_RECIPE Any "Pumpkin Soup"', save)[0].met).toBe(
      false,
    );
    expect(queryConditions('PLAYER_HAS_COOKING_RECIPE All "Pumpkin Soup"', save)[0].met).toBe(
      false,
    );
    save.players.forEach((p) => (p.mail = []));
    expect(queryConditions('PLAYER_HAS_MAIL Any Unreceived', save)[0].met).toBe(null);
  });
  it('keeps objective evidence and sources tied to the saved journal or donation', () => {
    const save = syntheticSave();
    save.players[0].quests = [
      {
        id: '7',
        kind: 'Quest',
        completed: true,
        title: 'Test',
        description: null,
        objective: null,
        daysLeft: null,
      },
    ];
    expect(objectiveEvidence('quest:123:7', save, art)?.done).toBe(true);
    expect(objectiveEvidence('quest:123:8', save, art)?.done).toBe(null);
    expect(objectiveEvidence('walnut:unavailable', save, art)?.source).toBe('wiki-walnut');
  });
  it('keeps obstacle routes separate from immutable original map grids and parses explicit exits', () => {
    const map = { width: 3, height: 1, walkable: [true, true, true] };
    const updated = withObstacles(map, [{ x: 1, y: 0, width: 1, height: 1 }]);
    expect(walkingPath(updated, [0, 0], [2, 0])).toBe(null);
    expect(map.walkable).toEqual([true, true, true]);
    expect(mapExits({ properties: { Warp: '0 1 Town 2 3 4 5 Woods 6 7' } })).toHaveLength(2);
    expect(mapExits({ properties: { Warp: '0 x Town 2 3' } })).toEqual([]);
  });
  it('uses normal gift quality modifiers and separate Stardrop Tea rules', () => {
    expect(giftPoints('love', 4, 'birthday')).toBe(960);
    expect(giftPoints('hate', 4, 'normal')).toBe(-40);
    expect(teaPoints('birthday')).toBe(750);
    expect(teaPoints('normal')).toBe(250);
  });
  it('rejects malformed native metadata before a guide can dereference it', () => {
    const checked = validateArtwork({
      ...art,
      gameData: { crops: { broken: { HarvestItemId: '24' } } },
    });
    expect(checked.gameData?.crops.broken).toBeUndefined();
    expect(checked.warnings.length).toBeGreaterThan(0);
    expect(() =>
      validateArtwork({
        ...art,
        sheets: { bad: { url: 'https://example.com', width: 1, height: 1 } },
      }),
    ).toThrow();
  });
});
