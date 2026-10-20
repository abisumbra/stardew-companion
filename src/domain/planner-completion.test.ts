import { describe, it, expect } from 'vitest';
import { emptyPlanner, PlannerStateSchema } from './models';
import { syntheticSave } from './test-fixture';
import { buildPlan } from './planner';
import { reconcileGoalReceipts } from './planner-completion';
import { goalLabel, objectiveEvidence } from './objectives';
import { journalNotes } from './journal';
import type { ArtworkData } from '../components/Artwork';
const art: ArtworkData = {
  root: null,
  sheets: {},
  sprites: {},
  items: [],
  characters: [],
  monsters: [],
  recipes: {},
  warnings: [],
};
describe('completion from saved evidence', () => {
  it('reconciles progress made offline and preserves a confirmed receipt across reloads', () => {
    const save = syntheticSave(),
      state = emptyPlanner();
    state.goals = ['cooking:236'];
    expect(buildPlan(save, state).completedGoals).toEqual([]);
    save.players[0].cooked!['236'] = 1;
    save.fingerprint = 'new-night';
    save.day = 9;
    const next = reconcileGoalReceipts(save, state, buildPlan(save, state).completedGoals);
    expect(next.goalReceipts['123']['cooking:236']).toMatchObject({
      fingerprint: 'new-night',
      day: 9,
    });
    const restored = PlannerStateSchema.parse(JSON.parse(JSON.stringify(next)));
    expect(reconcileGoalReceipts(save, restored, buildPlan(save, restored).completedGoals)).toBe(
      restored,
    );
  });
  it('keeps farmers separate and never completes free-text tasks or manual action checkmarks', () => {
    const save = syntheticSave(),
      state = emptyPlanner();
    state.goals = ['cooking:194'];
    state.manual = [{ id: 'manual', title: 'Cook', done: false, priority: 'normal' }];
    const host = reconcileGoalReceipts(save, state, buildPlan(save, state).completedGoals);
    save.players.push({ ...save.players[0], id: 'other', cooked: {} });
    const guest = { ...host, farmerId: 'other' };
    const next = reconcileGoalReceipts(save, guest, buildPlan(save, guest).completedGoals);
    expect(next.goalReceipts['123']['cooking:194']).toBeDefined();
    expect(next.goalReceipts.other).toBeUndefined();
    expect(next.manual[0].done).toBe(false);
    expect(next.completedSteps).toEqual([]);
  });
  it('withdraws a receipt if later saved data no longer confirms the tracked goal', () => {
    const save = syntheticSave(),
      state = emptyPlanner();
    state.goals = ['cooking:194'];
    const first = reconcileGoalReceipts(save, state, buildPlan(save, state).completedGoals);
    save.players[0].cooked = null;
    const next = reconcileGoalReceipts(save, first, buildPlan(save, first).completedGoals);
    expect(next.goalReceipts['123']['cooking:194']).toBeUndefined();
    save.warnings.push('Latest read failed; showing the last successfully parsed disk save.');
    expect(reconcileGoalReceipts(save, first, [])).toBe(first);
  });
  it('does not confirm catalog actions on unsupported save versions', () => {
    const save = syntheticSave(),
      state = emptyPlanner();
    state.goals = ['cooking:194'];
    save.gameVersion = '1.7.0';
    expect(buildPlan(save, state).completedGoals).not.toContain('cooking:194');
  });
  it('keeps namespaced quest IDs intact in labels, evidence and completion', () => {
    const save = syntheticSave(),
      state = emptyPlanner(),
      id = 'quest:123:example:quest';
    save.players[0].quests = [
      {
        id: 'example:quest',
        kind: '1',
        title: 'Exact quest',
        description: null,
        objective: null,
        completed: true,
        daysLeft: 0,
      },
    ];
    state.goals = [id];
    expect(goalLabel(id, save, art)).toBe('Exact quest');
    expect(objectiveEvidence(id, save, art)?.done).toBe(true);
    expect(buildPlan(save, state, art).completedGoals).toContain(id);
  });
  it('exports long Unicode notes without breaking an emoji at the limit', () => {
    const state = emptyPlanner();
    state.manual = [
      { id: 'manual', title: 'a'.repeat(159) + '🌾tail', done: false, priority: 'normal' },
    ];
    const note = journalNotes(syntheticSave(), state, art, [], [])[0];
    expect([...note.title]).toHaveLength(160);
    expect(note.title.endsWith('🌾')).toBe(true);
    expect(() => encodeURIComponent(note.title)).not.toThrow();
  });
});
