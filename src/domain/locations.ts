import type { ArtworkData } from '../components/Artwork';
import { displayText } from './display-text';
export const catalogLocations = (art: ArtworkData) =>
  Object.entries(art.gameData?.locations ?? {}).filter(
    ([id]) => !['Default', 'Temp', 'fishingGame'].includes(id),
  );
const names: Record<string, string> = {
  Town: 'Pelican Town',
  SeedShop: 'Pierre’s General Store',
  ScienceHouse: 'Robin’s Carpenter Shop',
  ArchaeologyHouse: 'Museum & Library',
  Saloon: 'Stardrop Saloon',
  Hospital: 'Clinic',
  HarveyRoom: 'Harvey’s Room',
  SebastianRoom: 'Sebastian’s Room',
  Beach: 'Beach',
  Mountain: 'Mountain',
  Forest: 'Cindersap Forest',
  BusStop: 'Bus Stop',
  Backwoods: 'Backwoods',
  Railroad: 'Railroad & Spa',
  BathHouse_Pool: 'Spa Pool',
  BathHouse_Entry: 'Spa Entrance',
  HaleyHouse: 'Haley & Emily’s House',
  JoshHouse: 'Sam’s House',
  SamHouse: 'Sam’s House',
  ManorHouse: 'Mayor’s Manor',
  Trailer: 'Pam & Penny’s Trailer',
  Trailer_Big: 'Pam & Penny’s House',
  Tent: 'Linus’s Tent',
  WizardHouse: 'Wizard’s Tower',
  AnimalShop: 'Marnie’s Ranch',
  LeahHouse: 'Leah’s Cottage',
  ElliottHouse: 'Elliott’s Cabin',
  FishShop: 'Willy’s Fish Shop',
  Mine: 'Mine Entrance',
  Mines: 'The Mines',
  Club: 'Casino',
  Desert: 'Calico Desert',
  Woods: 'Secret Woods',
  Sewer: 'Sewers',
  BugLand: 'Mutant Bug Lair',
  IslandNorth: 'Ginger Island North',
  IslandWest: 'Ginger Island West',
  IslandSouth: 'Ginger Island South',
  IslandEast: 'Ginger Island East',
  IslandSouthEast: 'Island Southeast',
  IslandSouthEastCave: 'Pirate Cove',
  IslandHut: 'Leo’s Island Hut',
  LeoTreeHouse: 'Leo’s Treehouse',
  VolcanoDungeon: 'Volcano Dungeon',
  AdventureGuild: 'Adventurer’s Guild',
  Farm: 'Farm',
  FarmHouse: 'Farmhouse',
  FarmCave: 'Farm Cave',
  CommunityCenter: 'Community Center',
  JojaMart: 'JojaMart',
  MovieTheater: 'Movie Theater',
  SkullCave: 'Skull Cavern Entrance',
  Caldera: 'Volcano Forge',
  BeachNightMarket: 'Night Market Beach',
  Blacksmith: 'Blacksmith',
  BoatTunnel: 'Boat Dock',
  CaptainRoom: 'Boat Cabin',
  Cellar: 'Cellar',
  DesertFestival: 'Desert Festival',
  Greenhouse: 'Greenhouse',
  IslandFarmCave: 'Gourmand Frog Cave',
  IslandFarmHouse: 'Island Farmhouse',
  IslandFieldOffice: 'Island Field Office',
  IslandNorthCave1: 'Island Dig Site Cave',
  IslandShrine: 'Gem Bird Shrine',
  IslandWestCave1: 'Simon Says Cave',
  LewisBasement: 'Mayor’s Basement',
  MasteryCave: 'Mastery Cave',
  MermaidHouse: 'Mermaid Boat',
  QiNutRoom: 'Qi’s Walnut Room',
  SandyHouse: 'Oasis',
  Submarine: 'Fishing Submarine',
  Summit: 'Summit',
  Sunroom: 'Caroline’s Sunroom',
  Tunnel: 'Tunnel',
  UndergroundMine: 'The Mines',
  WitchHut: 'Witch’s Hut',
  WitchSwamp: 'Witch’s Swamp',
  WitchWarpCave: 'Witch’s Swamp Entrance',
  WizardHouseBasement: 'Wizard’s Basement',
  Farm_Standard: 'Standard Farm',
  Farm_Riverland: 'Riverland Farm',
  Farm_Forest: 'Forest Farm',
  Farm_Hilltop: 'Hill-top Farm',
  Farm_Wilderness: 'Wilderness Farm',
  Farm_FourCorners: 'Four Corners Farm',
  Farm_Beach: 'Beach Farm',
  Farm_MeadowlandsFarm: 'Meadowlands Farm',
};
export function locationName(id: string, art?: ArtworkData) {
  const festival = festivalNames[id.replace(/2$/, '')];
  if (festival) return `${festival}${id.endsWith('2') ? ' · 2' : ''}`;
  return (
    (names[id] ?? displayText(art?.gameData?.locations?.[id]?.DisplayName)) ||
    id.replaceAll('_', ' ')
  );
}
const festivalNames: Record<string, string> = {
  'Town-EggFestival': 'Egg Festival',
  'Forest-FlowerFestival': 'Flower Dance',
  'Beach-Luau': 'Luau',
  'Beach-Jellies': 'Dance of the Moonlight Jellies',
  'Town-Fair': 'Stardew Valley Fair',
  'Town-Halloween': 'Spirit’s Eve',
  'Forest-IceFestival': 'Festival of Ice',
  'Town-Christmas': 'Feast of the Winter Star',
  'Desert-Festival': 'Desert Festival',
  'Beach-NightMarket': 'Night Market',
};
const notes: Record<string, [string, string]> = {
  Town: [
    'The central village: shops, homes, the river, museum and festival square.',
    'Arrive from the Bus Stop to the west, Mountain to the north, Forest to the southwest or Beach to the south.',
  ],
  Mountain: [
    'The lake, mine entrance, Carpenter’s Shop and Adventurer’s Guild share this northern region.',
    'Walk north from Pelican Town or east from the Backwoods. The Quarry is across the eastern bridge once repaired.',
  ],
  Forest: [
    'A large southern woodland with Marnie’s Ranch, Leah’s cottage, river fishing and seasonal forage.',
    'Leave the farm to the south or walk southwest out of Pelican Town. The Secret Woods entrance is in the northwest.',
  ],
  Beach: [
    'Ocean fishing, tide pools, Willy’s shop and the summer festival shoreline.',
    'Walk south from Pelican Town. The eastern tide-pool bridge requires 300 Wood to repair.',
  ],
  Woods: [
    'A secluded woodland with hardwood stumps and a small fishing pond.',
    'Enter through the northwest Forest; a Steel Axe or better is needed to remove the blocking log.',
  ],
  Desert: [
    'Calico Desert contains the Oasis, Desert Trader, Skull Cavern and spring’s Desert Festival.',
    'Repair the bus through the Vault bundles or Joja project, then travel from the Bus Stop.',
  ],
  Mine: [
    'The entrance to the regular Mines and its elevator.',
    'Enter the cave in the northeast Mountain. The Mines open on Spring 5 in year 1.',
  ],
  UndergroundMine: [
    'Generated mine floors contain ore, enemies, treasure floors and underground fishing areas.',
    'The map below shows the fixed entrance. Individual dungeon floors change and are not reconstructed from the save.',
  ],
  SkullCave: [
    'The entrance to Skull Cavern, a dungeon with no elevator.',
    'Travel to the northwest Desert. The door requires the Skull Key from floor 120 of the regular Mines.',
  ],
  Sewer: [
    'An underground area containing Krobus, fishing water and the Statue of Uncertainty.',
    'Obtain the Rusty Key from Gunther after 60 museum donations; enter through Town or Forest.',
  ],
  BugLand: [
    'An overgrown underground passage with mutant insects and Slimejack fishing.',
    'During Dark Talisman, talk to Krobus to open the northwest passage from the Sewers.',
  ],
  IslandSouth: [
    'The Ginger Island boat landing, resort beach and routes to other island regions.',
    'Travel on Willy’s repaired boat. Island access and parrot unlocks are separate from the normal Valley.',
  ],
  IslandNorth: [
    'The volcano approach, dig site and Island Trader region.',
    'Walk north from the island boat landing; some side routes require parrot unlocks.',
  ],
  IslandWest: [
    'The island farm, Tiger Slime Grove, river and western shoreline.',
    'Unlock the western passage with 10 Golden Walnuts. Check other parrot upgrades separately.',
  ],
  IslandEast: [
    'The jungle containing Leo’s hut and a path to the Gem Bird Shrine.',
    'Walk east from the island boat landing. The shrine passage is farther east through the jungle.',
  ],
  IslandSouthEastCave: [
    'A pirate hideout with a darts minigame on eligible evenings.',
    'After opening the island resort, visit the southeast cove. Pirates appear after 20:00 on even-numbered, non-rainy days.',
  ],
  Caldera: [
    'The forge at the top of the Volcano Dungeon.',
    'Reach volcano floor 10. Forging and enchantments consume their required materials.',
  ],
  Railroad: [
    'The railway, bathhouse and northern mountain paths.',
    'Walk north from the Mountain after the early-summer earthquake clears the path.',
  ],
  ScienceHouse: [
    'Robin’s Carpenter Shop and her family home.',
    'Visit the building west of the Mountain lake; construction and upgrade availability follows shop hours.',
  ],
  ArchaeologyHouse: [
    'The museum and library display donated artifacts and minerals.',
    'Visit the southeast of Pelican Town. Donations and collection rewards are tracked separately.',
  ],
  FishShop: [
    'Willy’s fishing shop and the route to his boat dock.',
    'Visit the southwest Beach. Shop hours and the boat repair requirements are separate checks.',
  ],
  AnimalShop: [
    'Marnie’s Ranch sells livestock and animal supplies.',
    'Visit the northeast Forest. Purchasing an animal also requires a suitable building.',
  ],
  SeedShop: [
    'Pierre’s General Store and his family home.',
    'Visit the north side of the Town square. Stock and opening days affect availability.',
  ],
  Saloon: [
    'Gus’s saloon, cooking sales and evening gathering area.',
    'Visit central Pelican Town; check the day’s stock and the character schedule before planning a visit.',
  ],
  WizardHouse: [
    'The Wizard’s tower on the west side of Cindersap Forest.',
    'Follow the western Forest path. Some services and the basement require additional progress.',
  ],
  BusStop: [
    'The junction linking the farm, Town, repaired bus and western tunnel.',
    'Leave the farm to the east. Desert travel becomes available after repairing the bus.',
  ],
  FarmCave: [
    'The small cave on your farm with its chosen mushroom or fruit-bat setup.',
    'Its produce depends on the choice offered by Demetrius; owning the cave does not prove current contents.',
  ],
  CommunityCenter: [
    'The bundle rooms used for Community Center restoration.',
    'Enter from northern Pelican Town. Bundle requirements are read from the save, including remixed bundles.',
  ],
  QiNutRoom: [
    'Qi’s challenges, Perfection tracker and special shop.',
    'Enter the room on northwest Island West after finding 100 Golden Walnuts.',
  ],
  MasteryCave: [
    'A late-game progression area for mastery rewards.',
    'Visit the southern Forest after reaching level 10 in all five main skills.',
  ],
  FarmHouse: [
    'Your home, kitchen and upgrade-dependent rooms.',
    'The layout depends on house upgrades; fixed map previews do not show every live renovation or decoration.',
  ],
  DesertFestival: [
    'The spring Desert Festival area with races, shops and Skull Cavern challenges.',
    'Visit the repaired-bus Desert on Spring 15–17. See the festival guide for daily priorities.',
  ],
};
export function locationProfile(id: string) {
  const pair =
    notes[id] ??
    (id.startsWith('Farm_')
      ? [
          'A selectable vanilla farm layout with its own terrain and resource rules.',
          'This is a layout preview. Saved objects and buildings belong to the currently selected farm.',
        ]
      : [
          'An explorable area from the installed game’s location catalog.',
          'Use the original map and its connecting exits to find the entrance. Access, opening hours and story conditions still need checking.',
        ]);
  return {
    description: pair[0],
    access: pair[1],
    maps: id === 'UndergroundMine' ? ['Mine'] : [id],
  };
}
