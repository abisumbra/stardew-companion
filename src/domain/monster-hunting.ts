import { monsterFloors, monsterLocations, monsterName } from './monsters';
type HuntingRegion = {
  name: string;
  maps: string[];
  access: string;
  search: string;
  source: string;
};
const regions: Record<string, HuntingRegion> = {
  'The Mines': {
    name: 'The Mines',
    maps: ['Mountain', 'Mine'],
    access:
      'Enter the cave in the northeast Mountain, past Robin’s house. The entrance opens on Spring 5 of year 1.',
    search:
      'Use the elevator to a previously reached multiple of five, then descend into the listed floor band. Leave through the entrance before trying another run.',
    source: 'wiki-mines',
  },
  'Dangerous Mines': {
    name: 'Dangerous Mines',
    maps: ['Mountain', 'Mine'],
    access:
      'Activate Danger in the Deep from Qi’s Walnut Room, or use the Shrine of Challenge after completing that challenge.',
    search:
      'The elevator still helps you reach the required band. Confirm dangerous mode in game; the ordinary Mines do not contain these encounters.',
    source: 'wiki-mines',
  },
  'Skull Cavern': {
    name: 'Skull Cavern',
    maps: ['Desert', 'SkullCave'],
    access:
      'Take the repaired bus to Calico Desert and enter the northwest cave. The door requires the Skull Key from floor 120 of the Mines.',
    search:
      'There is no elevator. Start a new descent from the entrance; floor layouts and encounters change between runs.',
    source: 'wiki-skull-cavern',
  },
  'Dangerous Skull Cavern': {
    name: 'Dangerous Skull Cavern',
    maps: ['Desert', 'SkullCave'],
    access:
      'Enter Skull Cavern with its key while Skull Cavern Invasion is active, or enable its dangerous-mode statue after unlocking it.',
    search:
      'This encounter requires dangerous mode. Ordinary Skull Cavern runs will not substitute for it.',
    source: 'wiki-skull-cavern',
  },
  'Volcano Dungeon': {
    name: 'Volcano Dungeon',
    maps: ['IslandNorth'],
    access:
      'Reach Ginger Island through Willy’s repaired boat, then walk north to the volcano. Bring a watering can to make paths over lava.',
    search:
      'Explore the combat floors between the entrance and the forge. Generated rooms change daily; floors 5 and 10 serve special purposes.',
    source: 'wiki-volcano',
  },
  'Quarry Mine': {
    name: 'Quarry Mine',
    maps: ['Mountain'],
    access:
      'Unlock the Quarry bridge through the Crafts Room bundles or the Joja bridge project. The cave entrance is north of the bridge.',
    search:
      'Explore the single Quarry Mine floor. This cave repopulates overnight, not when you re-enter it. Quarry-style dungeon floors in the regular Mines can also contain these enemies.',
    source: 'wiki-quarry-mine',
  },
  'Mutant Bug Lair': {
    name: 'Mutant Bug Lair',
    maps: ['Sewer', 'BugLand'],
    access:
      'Obtain the Rusty Key to enter the Sewers. During Dark Talisman, speak to Krobus to open the passage in the northwest Sewers.',
    search:
      'Follow the overgrown passage and check both sides for larvae and flying insects. Return through the Sewers for another visit.',
    source: 'wiki-bug-lair',
  },
  Farm: {
    name: 'Farm',
    maps: ['Farm'],
    access:
      'Night enemies require the farm monster-spawn option, except Truffle Crabs. The option is on by default on the Wilderness Farm and can be changed at the Dark Shrine of Night Terrors.',
    search:
      'Explore open ground after dark. Enemy types depend on combat level. Truffle Crabs instead appear when pigs uncover truffles.',
    source: 'wiki-monsters',
  },
};
const encounters: Record<string, string> = {
  Duggy:
    'Walk near dirt patches and wait for it to emerge. Strike the exposed body before it burrows again.',
  'Magma Duggy':
    'Check dirt patches inside volcano rooms. Approach carefully and attack while it is above ground.',
  'Dust Spirit':
    'Look for groups of small bouncing creatures on the frozen floors. Check the whole room before moving on.',
  Grub: 'Look for groups of crawling larvae. Defeat them before they enter an invulnerable cocoon and become Cave Flies.',
  Fly: 'Listen for flying insects and inspect rooms with Grubs. An escaping Grub can transform into a Cave Fly.',
  Ghost:
    'Wait near the entrance after entering a suitable floor; ghosts move toward you through rocks and walls.',
  'Rock Crab':
    'Approach suspicious rocks. A hidden crab reveals its legs when it moves; attack while its shell is raised.',
  'Lava Crab':
    'Check rock-like enemies in the hot mine floors. Wait for movement or expose the shell with a pickaxe.',
  'Iridium Crab': 'Check apparent iridium nodes carefully; some begin moving when approached.',
  'Truffle Crab':
    'Check truffles uncovered by pigs. A small chance turns a newly uncovered truffle into a moving crab; night monster spawning is not required.',
  Mummy:
    'Search sandy rooms in Skull Cavern. Knock the mummy down, then use an explosion, or finish it with a Crusader weapon.',
  'Pepper Rex':
    'Prioritize prehistoric floors in Skull Cavern. Fight outside the fire-breath cone and move between its attacks.',
  'Iridium Bat':
    'Search Skull Cavern from floor 51 onward. Give yourself clear ground when a flying group approaches.',
  'Magma Sparker':
    'Search the deeper volcano combat floors, especially 6–9. Avoid repeated contact and leave room to retreat.',
  'Lava Lurk':
    'Watch lava pools for a head surfacing and firing projectiles. Stand near a reachable edge to attack.',
  'False Magma Cap':
    'Inspect mushroom-like shapes in volcano rooms. Some are disguised monsters rather than forage.',
  'Stick Bug':
    'Look closely at wooden debris on dangerous forest floors. Move near suspicious sticks to reveal the creature.',
  'Putrid Ghost':
    'Search dangerous floors 51–69. Keep distance from its nausea attack; ginger can help remove the debuff.',
  Spider: 'Search dangerous forest floors 51–69 and watch for sudden jumps from the room edges.',
  'Tiger Slime':
    'Check volcano combat rooms. Tiger Slime Grove on Island West is another outdoor location.',
  'Haunted Skull':
    'Watch the edges of the Quarry Mine room for flying skulls. Keep a clear retreat when several approach.',
};
export function monsterHunting(name: string) {
  const base = monsterName(name),
    dangerous = /_dangerous$/i.test(name);
  const primary = monsterLocations[base];
  const region = dangerous
    ? primary === 'Skull Cavern'
      ? 'Dangerous Skull Cavern'
      : 'Dangerous Mines'
    : primary;
  const route = regions[region];
  if (!route) return null;
  const floors = monsterFloors(name);
  const additional =
    base === 'Carbon Ghost'
      ? [regions['Dangerous Mines']]
      : base === 'Tiger Slime'
        ? [
            {
              name: 'Tiger Slime Grove',
              maps: ['IslandWest'],
              access: 'Unlock Island West by paying the parrot 10 Golden Walnuts.',
              search:
                'Visit the grove in northwest Island West; its resident tiger slimes are a separate outdoor hunting option.',
              source: 'wiki-slimes',
            },
          ]
        : [];
  return {
    routes: [route, ...additional],
    sources: [
      ...new Set([
        route.source,
        ...additional.map((r) => r.source),
        ...((
          {
            Duggy: ['wiki-duggy'],
            Ghost: ['wiki-ghost'],
            Grub: ['wiki-grub'],
            Fly: ['wiki-cave-fly'],
          } as Record<string, string[]>
        )[base] ?? []),
      ]),
    ],
    floors,
    encounter:
      encounters[base] ??
      'Check the listed region and floor band. Enemies are generated for each room; a single empty floor does not rule out the whole band.',
    generated: region !== 'Farm' && region !== 'Mutant Bug Lair',
  };
}
