import { describe, it, expect } from 'vitest';
import { syntheticSave } from './test-fixture';
import { calculateProgress, entryProgress } from './progress';
import { entryById, entriesFor, monsterGoals, stardrops, villagers, datable } from './knowledge';
describe('save evidence and versioned perfection', () => {
  it('distinguishes catching, cooking, crafting and learning from ownership', () => {
    const s = syntheticSave(),
      f = s.players[0];
    expect(entryProgress(entryById.get('fishing:143')!, f).done).toBe(false);
    const soup = entryProgress(entryById.get('cooking:236')!, f);
    expect(soup.done).toBe(false);
    expect(soup.known).toBe(true);
    expect(entryProgress(entryById.get('crafting:Chest')!, f).done).toBe(false);
  });
  it('weights sum to 100 and boolean stardrops/monster criteria earn no partial points', () => {
    const p = calculateProgress(syntheticSave());
    expect(p.criteria.reduce((s, c) => s + c.weight, 0)).toBe(100);
    expect(p.criteria.find((c) => c.id === 'stardrops')?.ratio).toBe(0);
    expect(p.criteria.find((c) => c.id === 'skills')?.ratio).toBe(0.2);
    expect(p.total).toBeCloseTo(p.natural! + 2);
  });
  it('does not union multiplayer collections', () => {
    const s = syntheticSave();
    s.players.push({
      ...structuredClone(s.players[0]),
      id: '456',
      name: 'Guest',
      fish: { '143': 1 },
    });
    const c = calculateProgress(s).criteria.find((c) => c.id === 'fishing')!;
    expect(c.current).toBe(1);
    expect(c.total).toBe(72);
  });
  it('uses the best single farmer independently for each category', () => {
    const s = syntheticSave();
    s.players.push({
      ...structuredClone(s.players[0]),
      id: '456',
      name: 'Guest',
      cooked: { '194': 1, '236': 1 },
      fish: {},
    });
    const p = calculateProgress(s);
    expect(p.criteria.find((c) => c.id === 'cooking')?.current).toBe(2);
    expect(p.criteria.find((c) => c.id === 'fishing')?.farmer).toBe('Synthetic farmer');
  });
  it('marks missing save sections unknown, including another farmer’s possible contribution', () => {
    const s = syntheticSave();
    s.players.push({ ...structuredClone(s.players[0]), id: '456', cooked: null });
    const p = calculateProgress(s);
    expect(p.criteria.find((c) => c.id === 'cooking')?.ratio).toBeNull();
    expect(p.total).toBeNull();
  });
  it('does not use rules for future versions', () => {
    const s = syntheticSave();
    s.gameVersion = '1.7.0';
    const p = calculateProgress(s);
    expect(p.supported).toBe(false);
    expect(p.natural).toBeNull();
    expect(p.total).toBeNull();
  });
  it('has exact 1.6 collection totals and excludes Wedding Ring', () => {
    const s = syntheticSave(),
      p = calculateProgress(s);
    for (const [id, total] of [
      ['shipping', 154],
      ['cooking', 81],
      ['crafting', 149],
      ['fishing', 72],
    ] as const)
      expect(p.criteria.find((c) => c.id === id)?.total).toBe(total);
    expect(entriesFor('crafting', '1.6').some((e) => e.name === 'Wedding Ring')).toBe(false);
    expect(entriesFor('shipping', '1.6').some((e) => e.key === '372')).toBe(false);
    expect(entriesFor('shipping', '1.5.6').some((e) => e.key === '372')).toBe(true);
  });
  it('can reach exactly 100 naturally and caps waiver contributions', () => {
    const s = syntheticSave(),
      f = s.players[0];
    for (const [type, field] of [
      ['cooking', 'cooked'],
      ['crafting', 'crafting'],
      ['fishing', 'fish'],
      ['shipping', 'shipped'],
    ] as const)
      f[field] = Object.fromEntries(entriesFor(type, s.gameVersion).map((e) => [e.key, 1]));
    f.friendship = Object.fromEntries(villagers.map((n) => [n, datable.has(n) ? 2000 : 2500]));
    f.skills = { farming: 10, fishing: 10, foraging: 10, mining: 10, combat: 10, luck: 0 };
    f.mail = stardrops.map((s) => s.id);
    f.monsters = Object.fromEntries(monsterGoals.map((g) => [g.types[0], g.total]));
    s.buildings = [
      'Earth Obelisk',
      'Water Obelisk',
      'Desert Obelisk',
      'Island Obelisk',
      'Gold Clock',
    ];
    s.walnutsFound = 130;
    s.waivers = 10;
    const p = calculateProgress(s);
    expect(p.natural).toBe(100);
    expect(p.total).toBe(100);
  });
  it('ignores modded collection entries in vanilla totals', () => {
    const s = syntheticSave();
    s.players[0].cooked!['Mod.Soup'] = 1;
    expect(calculateProgress(s).criteria.find((c) => c.id === 'cooking')?.current).toBe(1);
  });
  it('handles translated cooking recipe keys and mine chest stardrop flag', () => {
    const s = syntheticSave();
    s.players[0].cookingKnown!['Cookies'] = 0;
    expect(entryProgress(entryById.get('cooking:223')!, s.players[0]).known).toBe(true);
    s.players[0].mineStardrop = true;
    expect(calculateProgress(s).criteria.find((c) => c.id === 'stardrops')?.current).toBe(2);
  });
});
