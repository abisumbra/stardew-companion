import type { ArtworkData } from '../components/Artwork';
import { sources, entryById } from './knowledge';
import { locationName } from './locations';
import { displayText } from './display-text';
const aliases: Record<string, string> = {
  'Dust Spirit': 'Dust Sprite',
  Fly: 'Cave Fly',
  'Frost Jelly': 'Slimes',
  Sludge: 'Slimes',
  'Green Slime': 'Slimes',
  'Big Slime': 'Slimes',
  'Purple Slime': 'Slimes',
  'Copper Slime': 'Slimes',
  'Iron Slime': 'Slimes',
  'Tiger Slime': 'Slimes',
  'Frost Bat': 'Bats',
  'Lava Bat': 'Bats',
  'Iridium Bat': 'Bats',
  Bat: 'Bats',
  Slimes: 'Slimes',
  'Void Spirits': 'Shadow Brute',
  Shadows: 'Shadow Brute',
  Skeletons: 'Skeleton',
  Duggies: 'Duggy',
  'Dust Sprites': 'Dust Sprite',
  'Rock Crabs': 'Rock Crab',
  Mummies: 'Mummy',
  Serpents: 'Serpent',
  'Flame Spirits': 'Magma Sprite',
  'Pelican Beach': 'The Beach',
  Beach: 'The Beach',
  BeachNightMarket: 'Night Market',
  Mountain: 'The Mountain',
  Mine: 'The Mines',
  Mines: 'The Mines',
  SkullCave: 'Skull Cavern',
  'Pierre’s General Store': "Pierre's General Store",
  'Robin’s Carpenter Shop': "Carpenter's Shop",
  ScienceHouse: "Carpenter's Shop",
  ArchaeologyHouse: 'Museum',
  Hospital: "Harvey's Clinic",
  AnimalShop: "Marnie's Ranch",
  FishShop: 'Fish Shop',
  ManorHouse: "Mayor's Manor",
  JoshHouse: '1 Willow Lane',
  HaleyHouse: '2 Willow Lane',
  LeahHouse: "Leah's Cottage",
  ElliottHouse: "Elliott's Cabin",
  Tent: 'Linus',
  Trailer_Big: 'Trailer',
  Sewer: 'The Sewers',
  BugLand: 'Mutant Bug Lair',
  Woods: 'Secret Woods',
  BathHouse_Entry: 'Spa',
  BathHouse_Pool: 'Spa',
  BathHouse_MensLocker: 'Spa',
  BathHouse_WomensLocker: 'Spa',
  Desert: 'Calico Desert',
  DesertFestival: 'Desert Festival',
  IslandNorth: 'Island North',
  IslandWest: 'Island West',
  IslandEast: 'Island East',
  IslandSouth: 'Island South',
  IslandSouthEast: 'Island Southeast',
  IslandSouthEastCave: 'Pirate Cove',
  IslandHut: 'Leo',
  LeoTreeHouse: 'Treehouse',
  BoatTunnel: "Willy's Boat",
  CaptainRoom: "Willy's Boat",
  Caldera: 'Forge',
  FarmHouse: 'Farmhouse',
  FarmCave: 'The Cave',
  Farm_Standard: 'Farm',
  Farm_Riverland: 'Farm',
  Farm_Forest: 'Farm',
  Farm_Hilltop: 'Farm',
  Farm_Wilderness: 'Farm',
  Farm_FourCorners: 'Farm',
  Farm_Beach: 'Farm',
  Farm_MeadowlandsFarm: 'Farm',
  AdventureGuild: "Adventurer's Guild",
  AbandonedJojaMart: 'Abandoned JojaMart',
  SeedShop: "Pierre's General Store",
  Saloon: 'The Stardrop Saloon',
  Club: 'Casino',
  SandyHouse: 'Oasis',
  UndergroundMine: 'The Mines',
  IslandFieldOffice: 'Island Field Office',
  IslandFarmCave: 'Gourmand Frog',
  IslandWestCave1: 'Ginger Island',
  IslandNorthCave1: 'Professor Snail',
  IslandShrine: 'Ginger Island',
  QiNutRoom: "Qi's Walnut Room",
  MasteryCave: 'Mastery Cave',
  WitchHut: "Witch's Hut",
  WitchSwamp: "Witch's Swamp",
  WitchWarpCave: "Witch's Swamp",
  MermaidHouse: 'Night Market',
  Submarine: 'Night Market',
  'Brown Chicken': 'Chicken',
  'White Chicken': 'Chicken',
  'Blue Chicken': 'Chicken',
  'Brown Cow': 'Cow',
  'White Cow': 'Cow',
  ParrotBoy: 'Leo',
};
const normalize = (s: string) => s.replaceAll('_', ' ').replaceAll('’', "'").toLowerCase();
const islandSections: Record<string, string> = {
  IslandNorth: 'Island_North',
  IslandWest: 'Island_West',
  IslandEast: 'Island_East',
  IslandSouth: 'Island_South',
  IslandSouthEast: 'Island_Southeast',
  IslandSouthEastCave: 'Pirate_Cove',
  IslandShrine: 'Gem_Birds',
  IslandWestCave1: 'Colored_Crystals_Puzzle',
};
const verified = new Map(
  Object.values(sources)
    .filter(
      (s) =>
        s.url.startsWith('https://stardewvalleywiki.com/') &&
        !s.url.includes('mediawiki/index.php'),
    )
    .map((s) => [normalize(decodeURIComponent(s.url.split('/').pop()!.split('#')[0])), s.url]),
);
export function wikiReference(id: string, name: string, art?: ArtworkData) {
  const [kind, ...rest] = id.split(':'),
    key = rest.join(':');
  let title = entryById.get(id)?.name ?? name;
  if (kind === 'location') title = aliases[key] ?? locationName(key, art);
  if (kind === 'crop')
    title = art?.gameData?.objects?.[art.gameData?.crops?.[key]?.HarvestItemId]?.Name ?? name;
  if (kind === 'object')
    title =
      art?.gameData?.objects?.[key]?.Name ?? art?.items.find((e) => e.id === id)?.name ?? name;
  if (kind === 'monster') title = key.replace(/_dangerous$/i, '');
  if (kind === 'animal')
    title = /^(cat|dog|turtle)\d*$/.test(key)
      ? 'Animals'
      : key === 'horse'
        ? 'Horse'
        : key.replace(/^Baby/, '').replace(/^ShearedSheep$/, 'Sheep');
  if (kind === 'character' || kind === 'friendship' || kind === 'walking') title = key;
  if (kind === 'location' && key === 'Railroad') title = 'Railroad';
  const section =
    kind === 'location'
      ? islandSections[key]
      : kind === 'animal' && /^(cat|dog|turtle)\d*$/.test(key)
        ? 'Pets'
        : kind === 'animal' && key === 'horse'
          ? 'Horse'
          : undefined;
  if (section && kind === 'location') title = 'Ginger Island';
  if (section && kind === 'animal') title = 'Animals';
  title = aliases[title] ?? displayText(title, name);
  title = title.replaceAll('’', "'");
  const known = verified.get(normalize(title));
  return {
    title,
    url:
      (known ?? `https://stardewvalleywiki.com/${encodeURIComponent(title.replaceAll(' ', '_'))}`) +
      (section ? `#${section}` : ''),
    verified: Boolean(known),
  };
}
