import { describe, it, expect } from 'vitest';
import { syntheticSave } from './test-fixture';
import { emptyPlanner, PlannerStateSchema } from './models';
import { availability, buildPlan, expandGraph, resolveMaterials } from './planner';
import { knowledge } from './knowledge';
describe('goal dependency engine', () => {
  it('deduplicates shared steps and detects cycles', () => {
    const nodes = new Map([
      ['a', { id: 'a', dependencies: ['shared'] }],
      ['b', { id: 'b', dependencies: ['shared'] }],
      ['shared', { id: 'shared', dependencies: [] }],
    ]);
    expect(expandGraph(nodes, ['a', 'b']).filter((x) => x === 'shared')).toHaveLength(1);
    nodes.set('shared', { id: 'shared', dependencies: ['a'] });
    expect(() => expandGraph(nodes, ['a'])).toThrow(/cycle/);
  });
  it('selects an alternative whose prerequisites are already met', () => {
    const nodes = new Map([
      ['goal', { id: 'goal', dependencies: [], alternatives: [['a'], ['b']] }],
      ['a', { id: 'a', dependencies: [] }],
      ['b', { id: 'b', dependencies: [] }],
    ]);
    expect(expandGraph(nodes, ['goal'], new Set(['b']))).toEqual(['goal']);
  });
  it('removes completed recipe unlocks and supplied ingredients', () => {
    const s = syntheticSave(),
      state = emptyPlanner();
    state.goals = ['cooking:236'];
    const plan = buildPlan(s, state);
    expect(plan.tasks.map((t) => t.id)).toEqual(['action:cooking:236']);
    expect(plan.materials.every((m) => m.missing === 0)).toBe(true);
  });
  it('merges milk across recipes and reserves each unit only once', () => {
    const state = emptyPlanner();
    state.goals = ['cooking:236', 'cooking:195'];
    const plan = buildPlan(syntheticSave(), state),
      milk = plan.materials.find((m) => m.id === 'milk')!;
    expect(milk.required).toBe(2);
    expect(milk.available).toBe(1);
    expect(milk.missing).toBe(1);
    expect(plan.tasks.filter((t) => t.id === 'material:milk')).toHaveLength(1);
    expect(plan.tasks.find((t) => t.id === 'material:milk')?.goalIds).toHaveLength(2);
  });
  it('does not count a goal twice when an achievement also requires it', () => {
    const state = emptyPlanner();
    state.goals = [
      'cooking:236',
      knowledge.steam.achievements.find((a) => a.name === 'Gourmet Chef')!.id,
    ];
    const plan = buildPlan(syntheticSave(), state);
    expect(plan.tasks.filter((t) => t.id === 'action:cooking:236')).toHaveLength(1);
    expect(plan.tasks.find((t) => t.id === 'action:cooking:236')?.goalIds).toHaveLength(2);
  });
  it('preserves manual completion and flags a conflicting saved action', () => {
    const state = emptyPlanner();
    state.goals = ['cooking:236'];
    state.completedSteps = ['action:cooking:236'];
    const plan = buildPlan(syntheticSave(), state);
    expect(plan.tasks[0].manualDone).toBe(true);
    expect(plan.tasks[0].discrepancy).toBe(true);
  });
  it('regenerates completed goals without deleting preferences', () => {
    const s = syntheticSave(),
      state = emptyPlanner();
    state.goals = ['cooking:236'];
    state.pinned = ['cooking:236'];
    s.players[0].cooked!['236'] = 1;
    const plan = buildPlan(s, state);
    expect(plan.tasks).toHaveLength(0);
    expect(plan.completedGoals).toContain('cooking:236');
    expect(state.pinned).toContain('cooking:236');
  });
  it('retains manual resource totals independently of the save', () => {
    const s = syntheticSave(),
      state = emptyPlanner();
    state.goals = ['cooking:236', 'cooking:195'];
    state.resources.milk = 3;
    const plan = buildPlan(s, state);
    expect(plan.materials.find((m) => m.id === 'milk')?.missing).toBe(0);
    expect(s.players[0].inventory['184']).toBe(1);
    expect(PlannerStateSchema.parse(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
  it('never invents weather and exposes seasonal uncertainty', () => {
    expect(availability(['fall'], 'spring', 'rain').state).toBe('seasonal');
    expect(availability(['fall'], 'fall', 'rain').reason).toContain('unknown');
  });
  it('expands multi-step crafting and accumulates shared demands before consuming stock', () => {
    const result = resolveMaterials({ chest: 1, torch: 1 }, { wood: 40 }, [
      { output: 'chest', quantity: 1, ingredients: [{ id: 'wood', quantity: 50 }] },
      {
        output: 'torch',
        quantity: 1,
        ingredients: [
          { id: 'wood', quantity: 1 },
          { id: 'sap', quantity: 2 },
        ],
      },
    ]);
    expect(result.shortages).toEqual({ wood: 11, sap: 2 });
  });
  it('supports recipe output quantities and cycle rejection', () => {
    expect(
      resolveMaterials({ fence: 3 }, {}, [
        { output: 'fence', quantity: 2, ingredients: [{ id: 'wood', quantity: 1 }] },
      ]).shortages.wood,
    ).toBe(2);
    expect(() =>
      resolveMaterials({ a: 1 }, {}, [
        { output: 'a', quantity: 1, ingredients: [{ id: 'b', quantity: 1 }] },
        { output: 'b', quantity: 1, ingredients: [{ id: 'a', quantity: 1 }] },
      ]),
    ).toThrow(/cycle/);
  });
});
