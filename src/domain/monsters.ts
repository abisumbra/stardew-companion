import type { ArtworkData } from '../components/Artwork';
import { monsterGoals } from './knowledge';
const mine = 'The Mines',
  skull = 'Skull Cavern',
  volcano = 'Volcano Dungeon',
  danger = 'Dangerous Mines';
const clusters: [string[], string, string?][] = [
  [['Green Slime', 'Frost Jelly', 'Sludge'], mine],
  [
    [
      'Bat',
      'Frost Bat',
      'Lava Bat',
      'Bug',
      'Fly',
      'Grub',
      'Duggy',
      'Dust Spirit',
      'Ghost',
      'Rock Crab',
      'Lava Crab',
      'Metal Head',
      'Shadow Brute',
      'Shadow Shaman',
      'Skeleton',
      'Squid Kid',
      'Stone Golem',
    ],
    mine,
  ],
  [
    [
      'Big Slime',
      'Armored Bug',
      'Carbon Ghost',
      'Iridium Bat',
      'Iridium Crab',
      'Mummy',
      'Pepper Rex',
      'Purple Slime',
      'Serpent',
    ],
    skull,
  ],
  [['Blue Squid', 'Putrid Ghost', 'Spider', 'Stick Bug', 'Skeleton Mage', 'Shadow Sniper'], danger],
  [['Royal Serpent'], 'Dangerous Skull Cavern'],
  [
    [
      'Magma Duggy',
      'Magma Sparker',
      'Magma Sprite',
      'Dwarvish Sentry',
      'False Magma Cap',
      'Hot Head',
      'Lava Lurk',
      'Tiger Slime',
    ],
    volcano,
  ],
  [['Haunted Skull', 'Copper Slime', 'Iron Slime'], 'Quarry Mine'],
  [['Mutant Fly', 'Mutant Grub'], 'Mutant Bug Lair'],
  [['Truffle Crab', 'Wilderness Golem', 'Iridium Golem'], 'Farm'],
];
export const monsterLocations = Object.fromEntries(
  clusters.flatMap(([names, location]) => names.map((n) => [n, location])),
);
export const monsterAliases: Record<string, string> = {
  'Dust Sprite': 'Dust Spirit',
  'Cave Fly': 'Fly',
  BigSlime: 'Big Slime',
  'Dino Monster': 'Pepper Rex',
  'Frost Jelly': 'Green Slime',
  Sludge: 'Green Slime',
  'Tiger Slime': 'Green Slime',
  'Frost Bat': 'Bat',
  'Lava Bat': 'Bat',
  'Iridium Bat': 'Bat',
  'Armored Bug': 'Bug',
  'Mutant Fly': 'Fly',
  'Mutant Grub': 'Grub',
  'Haunted Skull': 'Bat',
  'Copper Slime': 'Green Slime',
  'Iron Slime': 'Green Slime',
  'Purple Slime': 'Green Slime',
};
export const monsterName = (name: string) => name.replace(/_dangerous$/i, '').replace(/_/g, ' ');
export function eradicationGroups(art: ArtworkData, version?: string | null) {
  const installed = Object.entries(art.gameData?.monsterGoals ?? {});
  return (
    installed.length
      ? installed.map(([key, g]) => ({
          key,
          name: g.DisplayName ?? key,
          Targets: g.Targets as string[],
          Count: g.Count as number,
          RewardItemId: g.RewardItemId as string | null,
        }))
      : monsterGoals.map((g) => ({
          key: g.name,
          name: g.name,
          Targets: g.types,
          Count: g.total,
          RewardItemId: null,
        }))
  ).map((g) => ({
    ...g,
    Count: version?.startsWith('1.5') && g.Targets.includes('Bug') ? 125 : g.Count,
  }));
}
export function monsterGroup(name: string, art: ArtworkData, version?: string | null) {
  const normalize = (s: string) => s.replace(/\W/g, '').toLowerCase();
  const alias: Record<string, string> = { 'Void Spirits': 'Shadows' };
  return eradicationGroups(art, version).find((g) =>
    [g.key, g.name].some((key) => normalize(key) === normalize(alias[name] ?? name)),
  );
}
export function monsterData(name: string, art: ArtworkData) {
  const base = monsterName(name),
    text = art.gameData?.monsters?.[base] ?? art.gameData?.monsters?.[monsterAliases[base]];
  if (typeof text !== 'string') return null;
  const p = text.split('/'),
    rolls = (p[6] ?? '').trim().split(/\s+/),
    drops = [];
  for (let i = 0; i + 1 < rolls.length; i += 2)
    if (Number.isFinite(Number(rolls[i + 1])))
      drops.push({ id: rolls[i], chance: Number(rolls[i + 1]) });
  return {
    health: Number(p[0]),
    damage: Number(p[1]),
    flying: p[4] === 'true',
    defense: Number(p[7]),
    speed: Number(p[10]),
    experience: Number(p[13]),
    drops,
    reference: base in (art.gameData?.monsters ?? {}),
    location: /dangerous$/i.test(name)
      ? monsterLocations[base] === skull
        ? 'Dangerous Skull Cavern'
        : danger
      : (monsterLocations[base] ?? 'Special / unused data entry'),
  };
}
export function monsterSprite(name: string, art: ArtworkData) {
  for (const n of [
    name,
    name.replace(/ /g, ''),
    monsterAliases[name],
    monsterName(name),
    monsterAliases[monsterName(name)],
  ])
    if (art.sprites[`monster:${n}`]) return `monster:${n}`;
  return `monster:${name}`;
}
export const combatNotes: Record<string, string[]> = {
  Mummy: [
    'Knock it down, then use a bomb to finish it. A Crusader-enchanted weapon prevents revival.',
  ],
  'Armored Bug': ['Ordinary weapons cannot kill it. Use a weapon with the Bug Killer enchantment.'],
  'Hot Head': ['At low health it turns into an explosive threat. Move away from the blast.'],
  'Lava Lurk': [
    'Watch for fireballs across the lava. Attack when it surfaces close enough to the edge.',
  ],
  'Magma Sparker': ['Its contact attack can apply Burnt. Leave room to retreat.'],
};
// Region bands, not a guarantee that an individual generated floor contains this monster.
const floorBands: [string[], string, string][] = [
  [['Green Slime'], mine, '1–119'],
  [['Bug'], mine, '1–39'],
  [['Fly'], mine, '11–29'],
  [['Grub'], mine, '15–29'],
  [['Duggy'], mine, '2–29'],
  [['Rock Crab'], mine, '1–29'],
  [['Bat', 'Stone Golem'], mine, '31–39'],
  [['Dust Spirit', 'Frost Bat', 'Frost Jelly'], mine, '41–79'],
  [['Ghost'], mine, '51–79'],
  [['Skeleton'], mine, '71–79'],
  [
    ['Lava Bat', 'Lava Crab', 'Metal Head', 'Sludge', 'Shadow Brute', 'Shadow Shaman', 'Squid Kid'],
    mine,
    '81–119',
  ],
  [['Blue Squid'], danger, '11–29'],
  [['Bug_dangerous', 'Duggy_dangerous', 'Rock Crab_dangerous'], danger, '1–29'],
  [['Bat_dangerous', 'Stone Golem_dangerous'], danger, '31–39'],
  [
    [
      'Grub_dangerous',
      'Fly_dangerous',
      'Dust Spirit_dangerous',
      'Frost Bat_dangerous',
      'Stick Bug',
    ],
    danger,
    '41–69',
  ],
  [['Putrid Ghost', 'Spider'], danger, '51–69'],
  [['Carbon Ghost'], danger, '31–39'],
  [['Skeleton_dangerous', 'Skeleton Mage'], danger, '71–79'],
  [
    [
      'Lava Crab_dangerous',
      'Metal Head_dangerous',
      'Shadow Brute_dangerous',
      'Shadow Shaman_dangerous',
      'Shadow Sniper',
      'Squid Kid_dangerous',
    ],
    danger,
    '81–119',
  ],
  [['Green Slime_dangerous'], danger, '1–119'],
];
export function monsterFloors(name: string) {
  name = name === 'Dust Sprite' ? 'Dust Spirit' : name === 'Cave Fly' ? 'Fly' : name;
  return floorBands
    .filter(([names]) => names.includes(name))
    .map(([, region, floors]) => ({ region, floors }));
}
