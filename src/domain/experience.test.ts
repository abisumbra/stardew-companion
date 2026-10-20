import { describe, it, expect } from 'vitest';
import { syntheticSave } from './test-fixture';
import { scheduleKeys, parseSchedule, scheduleActivity } from './schedules';
import { monsterFloors } from './monsters';
import { monsterHunting } from './monster-hunting';
import {
  matchesCompletion,
  completionLabel,
  completionHint,
  criterionCounts,
} from './perfection-display';
import { calculateProgress } from './progress';
import { sources } from './knowledge';
describe('readable schedule routes', () => {
  it('preserves quoted dialogue, arrival times and omitted locations', () => {
    const r = parseSchedule(
      {
        spring:
          '0 Town 1 2 0/a1200 4 5 3 abigail_read "Strings\\schedules\\Abigail:key with spaces"/2300 bed',
      },
      'SPRING',
      syntheticSave(),
      'SeedShop',
      { homeTile: [7, 8] },
    );
    expect(r.points.map((p) => [p.time, p.location, p.x, p.y])).toEqual([
      [600, 'Town', 1, 2],
      [1200, 'Town', 4, 5],
      [2300, 'Town', 1, 2],
    ]);
    expect(r.points[1].arrival).toBe(true);
    expect(r.points[1].activity).toBe('abigail_read');
    expect(r.points[1].dialogue).toContain('key with spaces');
    expect(scheduleActivity(r.points[1])).toBe('Reads');
    expect(scheduleActivity(r.points[2])).toBe('Returns home to sleep');
  });
  it('resolves bed from the default route and does not invent a married bed tile', () => {
    const data = {
      rain: '1900 Town 5 8/2200 bed',
      spring: '900 Town 4 7/2100 SeedShop 1 9 3 abigail_sleep',
    };
    const route = parseSchedule(data, 'rain', syntheticSave(), 'SeedShop');
    expect(route.points[1]).toMatchObject({ location: 'SeedShop', x: 1, y: 9, home: true });
    expect(
      parseSchedule(data, 'rain', syntheticSave(), 'SeedShop', { married: true }).points[1],
    ).toMatchObject({ location: 'Farm', x: -1, y: -1 });
  });
  it('chooses case-insensitive spouse job before weekdays and uses any farmer friendship', () => {
    const s = syntheticSave();
    s.day = 2;
    s.players[0].spouse = 'Maru';
    expect(
      scheduleKeys('Maru', { marriage_Tue: '', MARRIAGEJOB: '', spring: '' }, s, 'dry'),
    ).toEqual(['MARRIAGEJOB', 'marriage_Tue']);
    s.players.push({ ...s.players[0], id: 'other', spouse: null, friendship: { Abigail: 2000 } });
    s.day = 1;
    expect(
      scheduleKeys(
        'Abigail',
        { Tue: '', Mon_6: '', Mon: '', fall_Mon_8: '', fall_Mon: '' },
        s,
        'dry',
      )[0],
    ).toBe('fall_Mon_8');
  });
  it('does not guess unknown conditional branches or accept malformed clock values', () => {
    expect(
      parseSchedule({ spring: 'NOT friendship Robin 4/900 Town 1 2' }, 'spring', null).points,
    ).toEqual([]);
    const s = syntheticSave();
    s.players[0].friendship = null;
    expect(
      parseSchedule({ spring: 'NOT friendship Robin 4/900 Town 1 2' }, 'spring', s).points,
    ).toEqual([]);
    expect(
      parseSchedule({ spring: '1265 Town 1 2/2700 Town 1 2/900 Town 3 4' }, 'spring', s).points,
    ).toHaveLength(1);
  });
});
describe('hunting references', () => {
  it('keeps normal and dangerous precise floor bands separate', () => {
    expect(monsterFloors('Duggy')[0].floors).toBe('2–29');
    expect(monsterFloors('Ghost')[0].floors).toBe('51–79');
    expect(monsterFloors('Skeleton')[0].floors).toBe('71–79');
    expect(monsterFloors('Blue Squid')[0]).toEqual({ region: 'Dangerous Mines', floors: '11–29' });
    expect(monsterHunting('Mummy_dangerous')?.routes[0].name).toBe('Dangerous Skull Cavern');
  });
  it('offers entrances instead of inventing generated monster coordinates', () => {
    expect(monsterHunting('Duggy')?.routes[0].maps).toEqual(['Mountain', 'Mine']);
    expect(monsterHunting('Carbon Ghost')?.routes.map((r) => r.name)).toEqual([
      'Skull Cavern',
      'Dangerous Mines',
    ]);
    expect(monsterHunting('Tiger Slime')?.routes).toHaveLength(2);
    expect(monsterHunting('unused')).toBeNull();
    for (const name of [
      'Duggy',
      'Tiger Slime',
      'Mummy',
      'Grub',
      'Fly',
      'Ghost',
      'Mutant Fly',
      'Copper Slime',
      'Truffle Crab',
    ])
      for (const id of monsterHunting(name)!.sources)
        expect(sources[id]?.url).toMatch(/^https:\/\//);
  });
});
describe('perfection evidence and actions', () => {
  it('distinguishes learned recipes from cooked actions and unknown evidence', () => {
    const c = calculateProgress(syntheticSave()).criteria.find((c) => c.id === 'cooking')!;
    const recipe = c.items.find((i) => i.name === 'Pumpkin Soup')!;
    expect(recipe.known).toBe(true);
    expect(recipe.done).toBe(false);
    expect(completionLabel(recipe, 'cooking')).toBe('Not cooked yet');
    expect(completionHint(recipe, 'cooking')).toContain('recipe is learned');
    expect(matchesCompletion({ ...recipe, done: null }, 'incomplete')).toBe(false);
    expect(matchesCompletion({ ...recipe, done: null }, 'unknown')).toBe(true);
    const counts = criterionCounts(c);
    expect(counts.complete + counts.incomplete + counts.unknown).toBe(c.items.length);
  });
  it('retains the best farmer identity even when names are identical', () => {
    const s = syntheticSave(),
      guest = { ...s.players[0], id: 'guest', cooked: { '194': 1, '195': 1 } };
    s.players.push(guest);
    expect(calculateProgress(s).criteria.find((c) => c.id === 'cooking')?.farmerId).toBe('guest');
  });
});
