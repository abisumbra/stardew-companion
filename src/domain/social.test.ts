import { describe, it, expect } from 'vitest';
import { socialState, villagerProfiles, birthdayDistance } from './social';
import { villagers, sources } from './knowledge';
import { syntheticSave } from './test-fixture';
describe('saved social view', () => {
  it('covers the tracked roster with sourced birthdays', () => {
    expect(Object.keys(villagerProfiles).sort()).toEqual([...villagers].sort());
    for (const p of Object.values(villagerProfiles)) {
      expect(p.birthday.day).toBeGreaterThan(0);
      expect(p.birthday.day).toBeLessThanOrEqual(28);
      expect(sources[p.source]).toBeDefined();
    }
  });
  it('distinguishes unknown friendship, an unmet villager and recorded zero', () => {
    const f = syntheticSave().players[0];
    expect(socialState('Robin', null).points).toBe(null);
    expect(socialState('Alex', f).met).toBe(false);
    f.friendship!.Alex = 0;
    expect(socialState('Alex', f).met).toBe(true);
    expect(socialState('Alex', f).points).toBe(0);
  });
  it('shows locked romantic hearts, dating unlocks and a 14-heart spouse meter', () => {
    const f = syntheticSave().players[0];
    f.friendship!.Abigail = 2250;
    f.friendshipDetails = {
      Abigail: {
        status: 'Friendly',
        giftsToday: null,
        giftsThisWeek: null,
        talkedToToday: null,
        roommate: false,
      },
    };
    expect(socialState('Abigail', f).cap).toBe(8);
    f.friendshipDetails.Abigail.status = 'Dating';
    expect(socialState('Abigail', f).cap).toBe(10);
    f.friendshipDetails.Abigail.status = 'Married';
    f.spouse = 'Abigail';
    expect(socialState('Abigail', f).slots).toBe(14);
  });
  it('keeps ordinary friendship at ten hearts and does not invent daily counters', () => {
    const f = syntheticSave().players[0];
    const s = socialState('Robin', f);
    expect(s.slots).toBe(10);
    expect(s.hearts).toBe(7);
    expect(s.details?.giftsToday).toBeUndefined();
    expect(socialState('Morris', f).friendable).toBe(false);
  });
  it('handles roommates and year-boundary birthdays', () => {
    const s = syntheticSave();
    const f = s.players[0];
    f.spouse = 'Krobus';
    f.friendshipDetails = {
      Krobus: {
        status: 'Married',
        giftsToday: 0,
        giftsThisWeek: 1,
        talkedToToday: false,
        roommate: true,
      },
    };
    expect(socialState('Krobus', f).relationship).toBe('Roommate');
    expect(socialState('Krobus', f).slots).toBe(14);
    s.season = 'winter';
    s.day = 28;
    expect(birthdayDistance(villagerProfiles.Lewis, s)).toBe(7);
  });
});
