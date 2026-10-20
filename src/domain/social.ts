import type { Farmer, SaveProfile, Season } from './models';
import { datable } from './knowledge';
export type VillagerProfile = {
  name: string;
  birthday: { season: Season; day: number };
  home: string;
  notes: string[];
  source: string;
};
const rows: [string, Season, number, string, string?][] = [
  ['Abigail', 'fall', 13, 'Pierre’s General Store'],
  ['Alex', 'summer', 13, '1 River Road'],
  ['Elliott', 'fall', 5, 'Elliott’s Cabin, Beach'],
  ['Emily', 'spring', 27, '2 Willow Lane'],
  ['Haley', 'spring', 14, '2 Willow Lane'],
  ['Harvey', 'winter', 14, 'Medical Clinic'],
  ['Leah', 'winter', 23, 'Leah’s Cottage, Forest'],
  ['Maru', 'summer', 10, '24 Mountain Road'],
  ['Penny', 'fall', 2, 'Trailer / upgraded community house'],
  ['Sam', 'summer', 17, '1 Willow Lane'],
  ['Sebastian', 'winter', 10, '24 Mountain Road'],
  ['Shane', 'spring', 20, 'Marnie’s Ranch'],
  ['Caroline', 'winter', 7, 'Pierre’s General Store'],
  ['Clint', 'winter', 26, 'Blacksmith'],
  ['Demetrius', 'summer', 19, '24 Mountain Road'],
  [
    'Dwarf',
    'summer',
    22,
    'Eastern cave inside the Mines',
    'Learn Dwarvish before expecting gifts to increase friendship.',
  ],
  ['Evelyn', 'winter', 20, '1 River Road'],
  ['George', 'fall', 24, '1 River Road'],
  ['Gus', 'summer', 8, 'Stardrop Saloon'],
  ['Jas', 'summer', 4, 'Marnie’s Ranch'],
  ['Jodi', 'fall', 11, '1 Willow Lane'],
  ['Kent', 'spring', 4, '1 Willow Lane', 'Returns to the valley at the start of Year 2.'],
  [
    'Krobus',
    'winter',
    1,
    'Shop in the Sewers',
    'Can become a roommate through the Void Ghost Pendant route.',
  ],
  ['Lewis', 'spring', 7, 'Mayor’s Manor'],
  ['Linus', 'winter', 3, 'Tent in the Mountain'],
  ['Marnie', 'fall', 18, 'Marnie’s Ranch'],
  ['Pam', 'spring', 18, 'Trailer / upgraded community house'],
  ['Pierre', 'spring', 26, 'Pierre’s General Store'],
  ['Robin', 'fall', 21, '24 Mountain Road'],
  ['Sandy', 'fall', 15, 'Oasis, Calico Desert'],
  ['Vincent', 'spring', 10, '1 Willow Lane'],
  ['Willy', 'summer', 24, 'Fish Shop, Beach'],
  ['Wizard', 'winter', 17, 'Wizard’s Tower, Forest'],
  [
    'Leo',
    'summer',
    26,
    'Island hut / Mountain treehouse',
    'Moves to the Mountain after the relevant six-heart event.',
  ],
];
export const villagerProfiles: Record<string, VillagerProfile> = Object.fromEntries(
  rows.map(([name, season, day, home, note]) => [
    name,
    {
      name,
      birthday: { season, day },
      home,
      notes: note ? [note] : [],
      source: `wiki-npc-${name}`,
    },
  ]),
);
export function socialState(name: string, farmer: Farmer | null) {
  const friendable = Boolean(villagerProfiles[name]);
  const details = farmer?.friendshipDetails?.[name];
  const sectionKnown =
    friendable && farmer?.friendship !== null && farmer?.friendship !== undefined;
  const recorded = sectionKnown && Object.prototype.hasOwnProperty.call(farmer!.friendship!, name);
  const met = recorded || Boolean(details) || farmer?.spouse === name;
  const points = sectionKnown ? (recorded ? farmer!.friendship![name] : met ? null : 0) : null;
  const known = points !== null;
  const status = details?.status ?? null;
  const married = farmer?.spouse === name || status === 'Married' || details?.roommate === true;
  const slots = married ? 14 : 10;
  const cap = married
    ? 14
    : !datable.has(name)
      ? 10
      : status === 'Dating' || status === 'Engaged'
        ? 10
        : status === null
          ? null
          : 8;
  return {
    friendable,
    known,
    met,
    points,
    details,
    status,
    slots,
    cap,
    hearts: points === null ? null : Math.min(cap ?? slots, Math.floor(points / 250)),
    next: points === null ? null : points % 250,
    relationship: married
      ? details?.roommate
        ? 'Roommate'
        : 'Married'
      : !met && sectionKnown
        ? 'Not met in saved social list'
        : (status ?? (known ? 'Relationship status unavailable' : 'Unknown')),
    perfectionTarget: datable.has(name) ? 8 : 10,
  };
}
const order: Season[] = ['spring', 'summer', 'fall', 'winter'];
export function birthdayDistance(profile: VillagerProfile, save: SaveProfile) {
  return (
    (order.indexOf(profile.birthday.season) * 28 +
      profile.birthday.day -
      (order.indexOf(save.season) * 28 + save.day) +
      112) %
    112
  );
}
export const birthdayLabel = (p: VillagerProfile) => `${p.birthday.season} ${p.birthday.day}`;
