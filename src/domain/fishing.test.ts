import { describe, it, expect } from 'vitest';
import { fishProfiles, routesFor, routeChecks, timeLabel } from './fishing';
import { knowledge, sources } from './knowledge';
import { syntheticSave } from './test-fixture';
import { buildPlan } from './planner';
import { emptyPlanner } from './models';
describe('fishing field guide', () => {
  it('covers every versioned fish entry with cited, usable routes', () => {
    const entries = knowledge.entries.filter((e) => e.type === 'fishing');
    expect(entries).toHaveLength(72);
    for (const e of entries) {
      const p = fishProfiles[e.id];
      expect(p).toBeDefined();
      expect(p.versions).toEqual(e.versions);
      expect(p.routes.length).toBeGreaterThan(0);
      expect(sources[p.sources[0]].url).toContain('stardewvalleywiki.com/');
      for (const r of p.routes) {
        expect(r.directions.length).toBeGreaterThan(0);
        expect(r.seasons.length).toBeGreaterThan(0);
        for (const [a, b] of r.times) {
          expect(a).toBeGreaterThanOrEqual(600);
          expect(b).toBeGreaterThan(a);
          expect(b).toBeLessThanOrEqual(2600);
        }
      }
    }
  });
  it('keeps the winter Carp alternatives separate from the mountain route', () => {
    const p = fishProfiles['fishing:142'];
    expect(p.routes.find((r) => r.region === 'mountain')!.seasons).not.toContain('winter');
    expect(p.routes.filter((r) => r.seasons.includes('winter')).map((r) => r.region)).toContain(
      'woods',
    );
  });
  it('preserves split time windows and after-midnight labels', () => {
    const r = fishProfiles['fishing:705'].routes[0];
    expect(r.times).toEqual([
      [600, 1100],
      [1800, 2600],
    ]);
    expect(timeLabel(r)).toContain('02:00 (+1 day)');
  });
  it('checks festival dates without pretending weather or access is known', () => {
    const s = syntheticSave();
    s.season = 'winter';
    s.day = 14;
    const p = fishProfiles['fishing:798'];
    expect(routeChecks(p, p.routes[0], s).date).toBe(false);
    s.day = 15;
    expect(routeChecks(p, p.routes[0], s).date).toBe(true);
    expect(routeChecks(p, p.routes[1], s).magicRequired).toBe(true);
  });
  it('Magic Bait changes season/date checks without removing level requirements', () => {
    const s = syntheticSave();
    s.season = 'summer';
    const p = fishProfiles['fishing:163'];
    expect(routeChecks(p, p.routes[0], s).season).toBe(false);
    const c = routeChecks(p, p.routes[0], s, true);
    expect(c.season).toBe(true);
    expect(c.level).toBe(10);
    expect(c.levelMet).toBe(false);
  });
  it('does not apply 1.6 festival exceptions to 1.5 saves', () => {
    expect(routesFor(fishProfiles['fishing:138'], '1.5.6').some((r) => r.days)).toBe(false);
    expect(routesFor(fishProfiles['fishing:138'], '1.6.15').some((r) => r.days)).toBe(true);
  });
  it('does not turn Magic Bait into out-of-season submarine access', () => {
    const s = syntheticSave();
    s.season = 'winter';
    s.day = 14;
    const p = fishProfiles['fishing:798'];
    expect(routeChecks(p, p.routes[0], s, true).date).toBe(false);
    s.day = 15;
    s.season = 'summer';
    expect(routeChecks(p, p.routes[0], s, true).season).toBe(false);
  });
  it('uses year-round alternatives and labels fishing tasks as condition checks', () => {
    const s = syntheticSave();
    s.season = 'winter';
    s.players[0].fish = {};
    const state = emptyPlanner();
    state.goals = ['fishing:128'];
    const t = buildPlan(s, state).tasks[0];
    expect(t.category).toBe('Check Conditions');
    expect(t.reason).toContain('Island');
    expect(t.reason).toContain('sun required');
  });
  it('distinguishes trapping from rod catching in planner instructions', () => {
    const state = emptyPlanner();
    state.goals = ['fishing:715'];
    const t = buildPlan(syntheticSave(), state).tasks[0];
    expect(t.title).toBe('Trap Lobster');
    expect(t.reason).toContain('next day');
    expect(fishProfiles['fishing:SeaJelly'].method).toBe('rod-collectible');
  });
});
