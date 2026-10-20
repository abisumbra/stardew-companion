import raw from '../../data/catalog.json';
import sourceData from '../../data/sources.json';
import { CatalogSchema, type Entry, type Guide, type Ingredient } from './models';
import { fishProfiles, fishToGuide } from './fishing';
export const knowledge = CatalogSchema.parse(raw);
export const sources: Record<
  string,
  {
    title: string;
    url: string;
    license: string;
    verifiedAt: string;
    verification: string;
    revision?: string;
  }
> = sourceData;
export const entryById = new Map(knowledge.entries.map((e) => [e.id, e]));
export const versionFamily = (v: string | null): '1.5' | '1.6' | null =>
  v && /^1\.[56](?:\.\d+)*$/.test(v) ? (v.startsWith('1.6') ? '1.6' : '1.5') : null;
export const entriesFor = (type: Entry['type'], version: string | null) =>
  knowledge.entries.filter(
    (e) => e.type === type && e.versions.includes(versionFamily(version) ?? '1.6'),
  );
const ingredient = (
  id: string,
  name: string,
  quantity: number,
  acquire: string,
  source: string,
  alternatives?: string[],
): Ingredient => ({
  id,
  name,
  quantity,
  acquire,
  sources: [source],
  ...(alternatives ? { alternatives } : {}),
});
const milk = (n = 1) =>
  ingredient(
    'milk',
    'Milk (any)',
    n,
    'Collect milk from a cow or goat with a Milk Pail or Auto-Grabber. Any size is accepted.',
    'wiki-cooking',
    ['184', '186', '436', '438'],
  );
const egg = () =>
  ingredient(
    'egg',
    'Egg (any)',
    1,
    'Collect an egg from your poultry. Chicken, duck, void, golden and ostrich eggs are accepted.',
    'wiki-cooking',
    ['176', '174', '180', '182', '442', '305', '928', '289'],
  );
const pumpkin = () => ({
  ...ingredient(
    '276',
    'Pumpkin',
    1,
    'Grow a Pumpkin in fall. Protected growing areas can provide an alternative; their readiness is not inferred.',
    'wiki-pumpkin',
  ),
  seasons: ['fall'] as const as ['fall'],
});
const guide = (
  entryId: string,
  sources: string[],
  steps: string[],
  extra: Partial<Guide> = {},
): Guide => ({
  entryId,
  sources,
  steps,
  versions: ['1.5', '1.6'],
  verifiedAt: '2026-10-15',
  ...extra,
});
export const guides: Record<string, Guide> = Object.fromEntries(
  [
    guide(
      'cooking:236',
      ['wiki-pumpkin', 'wiki-robin', 'wiki-cooking'],
      [
        'Reach 7 hearts with Robin and read her recipe letter.',
        'Bring 1 Pumpkin and 1 milk to a kitchen or an available Cookout Kit.',
        'Cook Pumpkin Soup yourself, then save the game overnight.',
      ],
      {
        unlock: 'Robin sends the recipe after reaching 7 hearts.',
        ingredients: [pumpkin(), milk()],
        location: 'Farmhouse kitchen or Cookout Kit',
      },
    ),
    guide(
      'cooking:907',
      ['wiki-curry'],
      [
        'Buy the recipe from Gus at the Ginger Island Resort for 2,000g when he visits.',
        'Gather a Coconut, a Pineapple and a Hot Pepper.',
        'Use a kitchen or Cookout Kit to cook the dish yourself.',
      ],
      {
        unlock: 'Gus at the Ginger Island Resort, 2,000g. His visit is not guaranteed.',
        ingredients: [
          ingredient(
            '88',
            'Coconut',
            1,
            'Forage a Coconut in the Calico Desert. Region access is not confirmed by this guide.',
            'wiki-curry',
          ),
          ingredient(
            '832',
            'Pineapple',
            1,
            'Grow a Pineapple; verify your growing location and crop readiness in game.',
            'wiki-curry',
          ),
          ingredient(
            '260',
            'Hot Pepper',
            1,
            'Grow a Hot Pepper during summer, or use a protected growing area.',
            'wiki-curry',
          ),
        ],
        location: 'Ginger Island Resort → kitchen',
      },
    ),
    guide(
      'cooking:194',
      ['wiki-egg', 'wiki-cooking'],
      [
        'The Fried Egg recipe is a starter recipe.',
        'Use one egg at a kitchen or available Cookout Kit. Cooking the egg is required.',
      ],
      { unlock: 'Starter recipe.', ingredients: [egg()] },
    ),
    guide(
      'cooking:195',
      ['wiki-egg', 'wiki-cooking'],
      [
        'Learn Omelet from The Queen of Sauce on Spring 28, Year 1, or buy the recipe from Gus for 100g.',
        'Bring an egg and any milk to a kitchen or available Cookout Kit.',
        'Cook an Omelet yourself.',
      ],
      {
        unlock: 'The Queen of Sauce, Spring 28 Year 1; or Gus, 100g.',
        ingredients: [egg(), milk()],
      },
    ),
    guide(
      'crafting:Chest',
      ['wiki-crafting'],
      [
        'Use the starter Chest recipe in the crafting menu.',
        'Gather 50 Wood and craft a Chest yourself.',
      ],
      {
        unlock: 'Starter recipe.',
        ingredients: [
          ingredient('388', 'Wood', 50, 'Chop trees, branches or stumps.', 'wiki-crafting'),
        ],
      },
    ),
    ...Object.values(fishProfiles).map(fishToGuide),
  ].map((g) => [g.entryId, g]),
);
export function guideFor(e: Entry, version: string | null) {
  const g = guides[e.id];
  const family = versionFamily(version);
  return family && g?.versions.includes(family) ? g : undefined;
}
export const stardrops = [
  {
    id: 'CF_Fair',
    name: 'Stardew Valley Fair',
    steps: 'Earn 2,000 Star Tokens at the Fair and purchase the Stardrop.',
  },
  {
    id: 'CF_Mines',
    name: 'Mines floor 100',
    steps: 'Reach floor 100 and collect the treasure chest reward.',
  },
  {
    id: 'CF_Spouse',
    name: 'Spouse or roommate',
    steps:
      'Reach 12.5 hearts with your spouse or roommate. Player marriages have a separate giftbox route.',
  },
  {
    id: 'CF_Sewer',
    name: 'Krobus’s shop',
    steps: 'Unlock the Sewers and purchase the Stardrop from Krobus for 20,000g.',
  },
  {
    id: 'CF_Statue',
    name: 'Old Master Cannoli',
    steps: 'Bring a Sweet Gem Berry to Old Master Cannoli in the Secret Woods.',
  },
  {
    id: 'CF_Fish',
    name: 'Willy’s fishing reward',
    steps: 'Catch every required fish, then read the reward letter the next day.',
  },
  {
    id: 'museumComplete',
    name: 'Museum collection reward',
    steps: 'Complete the Museum donation collection and claim the reward.',
  },
];
export const villagers = [
  'Abigail',
  'Alex',
  'Elliott',
  'Emily',
  'Haley',
  'Harvey',
  'Leah',
  'Maru',
  'Penny',
  'Sam',
  'Sebastian',
  'Shane',
  'Caroline',
  'Clint',
  'Demetrius',
  'Dwarf',
  'Evelyn',
  'George',
  'Gus',
  'Jas',
  'Jodi',
  'Kent',
  'Krobus',
  'Lewis',
  'Linus',
  'Marnie',
  'Pam',
  'Pierre',
  'Robin',
  'Sandy',
  'Vincent',
  'Willy',
  'Wizard',
  'Leo',
];
export const datable = new Set(villagers.slice(0, 12));
export const monsterGoals = [
  { name: 'Slimes', total: 1000, types: ['Green Slime', 'Frost Jelly', 'Sludge', 'Tiger Slime'] },
  {
    name: 'Void Spirits',
    total: 150,
    types: ['Shadow Brute', 'Shadow Shaman', 'Shadow Sniper', 'Shadow Guy', 'Shadow Girl'],
  },
  { name: 'Bats', total: 200, types: ['Bat', 'Frost Bat', 'Lava Bat', 'Iridium Bat'] },
  { name: 'Skeletons', total: 50, types: ['Skeleton', 'Skeleton Mage'] },
  { name: 'Cave Insects', total: 80, types: ['Bug', 'Fly', 'Grub'] },
  { name: 'Duggies', total: 30, types: ['Duggy', 'Magma Duggy'] },
  { name: 'Dust Sprites', total: 500, types: ['Dust Spirit'] },
  { name: 'Rock Crabs', total: 60, types: ['Rock Crab', 'Lava Crab', 'Iridium Crab'] },
  { name: 'Mummies', total: 100, types: ['Mummy'] },
  { name: 'Pepper Rex', total: 50, types: ['Pepper Rex'] },
  { name: 'Serpents', total: 250, types: ['Serpent', 'Royal Serpent'] },
  { name: 'Flame Spirits', total: 150, types: ['Magma Sprite', 'Magma Sparker'] },
];
