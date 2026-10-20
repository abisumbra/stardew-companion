import catalog from '../../data/catalog.json';
import type { Guide, SaveProfile, Season } from './models';

export type FishingRegion =
  | 'ocean'
  | 'town'
  | 'forest'
  | 'mountain'
  | 'woods'
  | 'desert'
  | 'mines'
  | 'sewers'
  | 'swamp'
  | 'island'
  | 'night-market';
export type FishRoute = {
  region: FishingRegion;
  area: string;
  seasons: Season[];
  times: [number, number][];
  weather: 'any' | 'rain' | 'sun';
  directions: string[];
  requirements: string[];
  minLevel?: number;
  days?: [number, number];
  magicOnly?: boolean;
  versions?: ('1.5' | '1.6')[];
};
export type FishProfile = {
  id: string;
  method: 'rod' | 'crab-pot' | 'rod-collectible';
  difficulty: number | null;
  behavior: string | null;
  minLevel: number;
  legendary: boolean;
  routes: FishRoute[];
  notes: string[];
  sources: string[];
  versions: ('1.5' | '1.6')[];
  verifiedAt: string;
};
export const fishingRegions: Record<
  FishingRegion,
  { name: string; directions: string[]; requirements: string[] }
> = {
  ocean: {
    name: 'Beach & ocean',
    directions: [
      'Walk south from Pelican Town to the Beach.',
      'Stand on a pier or the shoreline and cast into the sea.',
    ],
    requirements: [],
  },
  town: {
    name: 'Pelican Town river',
    directions: [
      'Enter Pelican Town east of the farm.',
      'Use the river beside the town bridges; this is freshwater, not the Beach.',
    ],
    requirements: [],
  },
  forest: {
    name: 'Cindersap Forest',
    directions: [
      'Leave the farm through the southern exit.',
      'Use the river through the forest; the pond near the Traveling Cart is a separate fishing area.',
    ],
    requirements: [],
  },
  mountain: {
    name: 'Mountain lake',
    directions: [
      'Follow the northern path from the farm through the Backwoods.',
      'Continue east past Robin’s shop to the lake outside the Mines.',
    ],
    requirements: [],
  },
  woods: {
    name: 'Secret Woods pond',
    directions: [
      'Walk to northwest Cindersap Forest, above the Wizard’s Tower.',
      'Pass the large log and fish in the pond inside the Secret Woods.',
    ],
    requirements: ['Normally requires a Steel Axe or better to remove the entrance log.'],
  },
  desert: {
    name: 'Calico Desert pond',
    directions: [
      'Travel to the Calico Desert using the restored bus or another unlocked travel method.',
      'Fish in the pond northwest of the bus stop.',
    ],
    requirements: ['Desert travel must be unlocked.'],
  },
  mines: {
    name: 'Mines fishing floors',
    directions: [
      'Enter the Mines northeast of the mountain lake.',
      'Use the elevator to the documented floor, then fish in its water or lava pool.',
    ],
    requirements: ['Reach the required mine floor; elevator access is not confirmed here.'],
  },
  sewers: {
    name: 'Sewers & Bug Lair',
    directions: [
      'Enter the Sewers from town or the forest using the Rusty Key.',
      'For Slimejack, continue into the Mutant Bug Lair after its quest entrance is unlocked.',
    ],
    requirements: [
      'Rusty Key required for the Sewers. The Bug Lair needs additional quest access.',
    ],
  },
  swamp: {
    name: 'Witch’s Swamp',
    directions: [
      'Go to the Railroad north of the Mountain.',
      'Use the cave passage and teleport to the Witch’s Swamp.',
    ],
    requirements: ['Progress through the Dark Talisman quest to open the passage.'],
  },
  island: {
    name: 'Ginger Island',
    directions: [
      'Travel on Willy’s repaired boat or use an unlocked island warp.',
      'Choose the specific coast, freshwater area or cove named below.',
    ],
    requirements: ['Ginger Island travel and the named sub-area must be accessible.'],
  },
  'night-market': {
    name: 'Night Market submarine',
    directions: [
      'Visit the Beach during Winter 15–17.',
      'Pay 1,000g for the submarine ride, wait for the fishing hatch to open, and cast through it.',
    ],
    requirements: ['Night Market: Winter 15–17, from 17:00. Allow time to descend and return.'],
  },
};
const all: Season[] = ['spring', 'summer', 'fall', 'winter'];
const seasons = (s: string): Season[] => (s === 'all' ? [...all] : (s.split(' ') as Season[]));
const r = (
  region: FishingRegion,
  s = 'all',
  times: [number, number][] = [[600, 2600]],
  weather: FishRoute['weather'] = 'any',
  extra: Partial<FishRoute> = {},
): FishRoute => ({
  region,
  area: fishingRegions[region].name,
  seasons: seasons(s),
  times,
  weather,
  directions: [...fishingRegions[region].directions],
  requirements: [...fishingRegions[region].requirements],
  ...extra,
});
const river = (
  s = 'all',
  times: [number, number][] = [[600, 2600]],
  weather: FishRoute['weather'] = 'any',
) => [
  r('town', s, times, weather),
  r('forest', s, times, weather, { area: 'Cindersap Forest river' }),
];
const pond = (
  s = 'all',
  times: [number, number][] = [[600, 2600]],
  weather: FishRoute['weather'] = 'any',
) =>
  r('forest', s, times, weather, {
    area: 'Cindersap Forest pond',
    directions: [
      'Enter Cindersap Forest from the south of your farm.',
      'Fish in the pond near the Traveling Cart, not the forest river.',
    ],
  });
const islandSea = (
  times: [number, number][] = [[600, 2600]],
  weather: FishRoute['weather'] = 'any',
) =>
  r('island', 'all', times, weather, {
    area: 'Island West ocean / South / Southeast',
    directions: [
      'Travel to Ginger Island.',
      'Fish in the ocean at Island West, South or Southeast; freshwater pools have different fish.',
    ],
  });
const islandFresh = (times: [number, number][] = [[600, 2600]]) =>
  r('island', 'all', times, 'any', {
    area: 'Island North / West freshwater',
    directions: [
      'Travel to Ginger Island and open the northern or western path.',
      'Cast into freshwater in Island North or West, away from the ocean shoreline.',
    ],
  });
const mine = (floor: number) =>
  r('mines', 'all', [[600, 2600]], 'any', {
    area: `Mines floor ${floor}`,
    directions: [
      'Enter the Mines northeast of the mountain lake.',
      `Reach floor ${floor} and cast into its ${floor === 100 ? 'lava' : 'water'} pool.`,
    ],
  });
const night = () => r('night-market', 'winter', [[1700, 2600]], 'any', { days: [15, 17] });
const profiles: FishProfile[] = [];
function add(
  key: string,
  difficulty: number | null,
  behavior: string | null,
  routes: FishRoute[],
  extra: Partial<FishProfile> = {},
) {
  const entry = catalog.entries.find((e) => e.id === `fishing:${key}`)!;
  profiles.push({
    id: entry.id,
    method: 'rod',
    difficulty,
    behavior,
    minLevel: 0,
    legendary: false,
    routes,
    notes: [],
    sources: [`wiki-fish-${key}`],
    versions: entry.versions as FishProfile['versions'],
    verifiedAt: '2026-10-15',
    ...extra,
  });
}
// Factual route conditions, checked individually against the cited Wiki pages.
add('128', 80, 'floater', [
  r('ocean', 'summer', [[1200, 1600]], 'sun'),
  islandSea([[1200, 1600]], 'sun'),
]);
add('129', 30, 'dart', [r('ocean', 'spring fall')]);
add('130', 70, 'smooth', [r('ocean', 'summer winter', [[600, 1900]]), islandSea([[600, 1900]])]);
add('131', 30, 'dart', [r('ocean', 'spring fall winter', [[600, 1900]])]);
add('132', 35, 'smooth', river('all', [[1800, 2600]]));
add('136', 50, 'mixed', [r('mountain', 'all', [[600, 1900]])]);
add('137', 28, 'mixed', [r('town', 'spring fall'), pond('spring fall')]);
add('138', 45, 'mixed', [
  ...river('summer', [[600, 1900]], 'sun'),
  r('mountain', 'summer', [[600, 1900]], 'sun'),
  r('forest', 'summer', [[600, 2600]], 'any', {
    area: 'Trout Derby river',
    days: [20, 21],
    versions: ['1.6'],
    requirements: ['Trout Derby exception: Summer 20–21; weather and usual hours are waived.'],
  }),
]);
add('139', 50, 'mixed', [
  ...river('fall', [[600, 1900]]),
  r('forest', 'fall', [[600, 2600]], 'any', {
    area: 'Southern forest waterfalls',
    versions: ['1.6'],
    directions: [
      'Walk east of the Hat Mouse’s abandoned house in southern Cindersap Forest.',
      'Cast into the waterfall pools.',
    ],
    requirements: ['Cast range must reach the waterfall pools.'],
  }),
]);
add('140', 45, 'smooth', [
  ...river('fall', [[1200, 2600]], 'rain'),
  r('mountain', 'fall', [[1200, 2600]], 'rain'),
  pond('fall', [[1200, 2600]], 'rain'),
  r('town', 'winter', [[1200, 2600]], 'rain', {
    requirements: ['Use a Rain Totem to produce rainy winter weather.'],
  }),
]);
add('141', 35, 'dart', [...river('winter'), r('mountain', 'winter'), pond('winter')]);
add(
  '142',
  15,
  'mixed',
  [
    r('mountain', 'spring summer fall'),
    r('woods'),
    r('sewers', 'all', [[600, 2600]], 'any', {
      area: 'Sewers water',
      requirements: ['Rusty Key required.'],
    }),
  ],
  {
    notes: [
      'The mountain lake route does not include winter. Secret Woods and Sewers remain year-round alternatives.',
    ],
  },
);
add('143', 75, 'mixed', [
  ...river('spring fall', [[600, 2400]], 'rain'),
  r('woods', 'spring summer fall', [[600, 2400]], 'rain'),
  r('swamp', 'spring summer fall', [[600, 2400]], 'rain'),
  r('town', 'winter', [[600, 2400]], 'rain', {
    requirements: ['Use a Rain Totem to create rainy winter weather.'],
  }),
]);
add('144', 60, 'dart', [...river('summer winter'), pond('summer winter')]);
add('145', 30, 'mixed', river('spring summer', [[600, 1900]], 'sun'), {
  notes: ['Sunny conditions include windy sunny days.'],
});
add('146', 55, 'smooth', [r('ocean', 'summer winter', [[600, 1900]])]);
add('147', 25, 'dart', [r('ocean', 'spring winter')]);
add('148', 70, 'smooth', [r('ocean', 'spring fall', [[1600, 2600]], 'rain')]);
add('149', 95, 'sinker', [
  r('ocean', 'summer', [[600, 1300]]),
  r('island', 'all', [[600, 1300]], 'any', { area: 'Island West ocean' }),
  night(),
]);
add('150', 40, 'mixed', [
  r('ocean', 'summer fall', [[600, 1900]], 'rain'),
  r('ocean', 'winter', [[600, 1900]], 'rain', {
    requirements: ['Use a Rain Totem for the winter route.'],
  }),
]);
add('151', 75, 'sinker', [
  r('ocean', 'winter', [[1800, 2600]]),
  r('ocean', 'winter', [[600, 2600]], 'any', {
    area: 'SquidFest ocean',
    days: [12, 13],
    versions: ['1.6'],
    requirements: ['SquidFest exception: Winter 12–13; the usual evening restriction is waived.'],
  }),
]);
add('154', 40, 'sinker', [r('ocean', 'fall winter', [[600, 1900]]), night()]);
add('155', 80, 'sinker', [
  r('ocean', 'summer fall', [[1800, 2600]]),
  islandSea([[1800, 2600]]),
  night(),
]);
add('156', 50, 'mixed', [mine(20), mine(60)], {
  notes: ['Ghost enemies can drop this item, but a monster drop does not prove a rod catch.'],
});
add('158', 65, 'sinker', [mine(20)]);
add(
  '159',
  95,
  'mixed',
  [
    r('ocean', 'summer', [[600, 2600]], 'any', {
      area: 'Eastern Beach pier',
      directions: [
        'Repair the small Beach bridge with 300 Wood, or use an unlocked alternate path.',
        'Stand on the eastern pier or the shore east of it.',
        'Land the bobber at least 3 tiles from every shore and pier; bubbles can reduce that distance by one.',
      ],
      requirements: ['Reach the eastern Beach and meet the casting-distance rule.'],
    }),
  ],
  { minLevel: 5, legendary: true },
);
add(
  '160',
  85,
  'smooth',
  [
    r('town', 'fall', [[600, 2600]], 'any', {
      area: 'Northern town river / wooden bridge',
      directions: [
        'Walk to the north end of Pelican Town’s river, above JojaMart.',
        'Stand on the wooden bridge or the valid nearby northern bank and cast into the river.',
      ],
      requirements: [
        'Stand within the northern fishing area; no minimum bobber distance from shore.',
      ],
    }),
  ],
  { minLevel: 3, legendary: true },
);
add('161', 85, 'dart', [mine(60)]);
add('162', 90, 'mixed', [
  mine(100),
  r('island', 'all', [[600, 2600]], 'any', {
    area: 'Volcano Caldera lava',
    minLevel: 7,
    directions: [
      'Travel to Ginger Island and climb through the Volcano Dungeon.',
      'At the caldera/forge, fish in the lava pool.',
    ],
    requirements: ['Reach the Volcano Caldera. Effective Fishing level 7 is required there.'],
  }),
]);
add(
  '163',
  110,
  'mixed',
  [
    r('mountain', 'spring', [[600, 2600]], 'rain', {
      area: 'Deep mountain lake',
      directions: [
        'Reach the mountain lake outside the Mines.',
        'Cast near the submerged log or another deep part of the lake.',
        'The bobber needs at least 4 tiles from all land and bridges; bubbles can reduce that distance by one.',
      ],
      requirements: [
        'Meet the deep-water casting rule. Fishing buffs can contribute to the required effective level.',
      ],
    }),
  ],
  {
    minLevel: 10,
    legendary: true,
    notes: ['Catching the other legendary fish first is not required.'],
  },
);
add('164', 65, 'mixed', [r('desert', 'all', [[600, 2000]])]);
add('165', 90, 'dart', [r('desert', 'all', [[600, 2000]])], { minLevel: 4 });
add(
  '682',
  80,
  'dart',
  [
    r('sewers', 'all', [[600, 2600]], 'any', {
      area: 'Sewers water',
      requirements: ['Obtain the Rusty Key; no minimum Fishing level is required.'],
    }),
  ],
  { legendary: true },
);
add('698', 78, 'mixed', [r('mountain', 'summer winter', [[600, 1900]])]);
add('699', 60, 'dart', river('fall winter', [[600, 1900]]));
add('700', 46, 'smooth', [r('mountain')]);
add('701', 50, 'mixed', [r('ocean', 'summer fall', [[600, 1400]]), islandFresh([[600, 1400]])]);
add(
  '702',
  35,
  'dart',
  [r('mountain'), r('forest', 'all', [[600, 2600]], 'any', { area: 'Cindersap Forest river' })],
  { notes: ['The town river is not a Chub location. Use the forest river or mountain lake.'] },
);
add('704', 78, 'mixed', [
  r('forest', 'summer', [[600, 1900]], 'any', { area: 'Cindersap Forest river' }),
]);
add('705', 60, 'mixed', [
  r('ocean', 'fall winter', [
    [600, 1100],
    [1800, 2600],
  ]),
]);
add('706', 45, 'smooth', river('spring summer fall', [[900, 2600]], 'rain'));
add('707', 85, 'mixed', [...river('winter'), r('mountain', 'winter')]);
add('708', 50, 'sinker', [
  r('ocean', 'spring summer winter', [
    [600, 1100],
    [1900, 2600],
  ]),
]);
add('734', 50, 'mixed', [r('woods')], {
  notes: [
    'The Forest Farm has an additional luck-dependent route. The main route here uses the Secret Woods pond.',
  ],
});
add(
  '775',
  100,
  'mixed',
  [
    r('forest', 'winter', [[600, 2600]], 'any', {
      area: 'Arrowhead Island, southern tip',
      directions: [
        'Enter Cindersap Forest and walk onto Arrowhead Island in the river.',
        'Stand on the single southernmost tip tile and cast south.',
        'Place the bobber at least 3 tiles from every piece of land; bubbles can reduce that distance by one.',
      ],
      requirements: ['Stand on the exact southern-tip tile and meet the distance requirement.'],
    }),
  ],
  { minLevel: 6, legendary: true },
);
add('795', 80, 'mixed', [r('swamp')]);
add('796', 55, 'dart', [
  r('sewers', 'all', [[600, 2600]], 'any', {
    area: 'Mutant Bug Lair',
    requirements: ['Unlock the Mutant Bug Lair during the Dark Talisman quest.'],
    directions: [
      'Enter the Sewers and follow the quest passage to the Mutant Bug Lair.',
      'Cast into the green water inside the lair, not the ordinary Sewers.',
    ],
  }),
]);
for (const [id, d, b] of [
  ['798', 55, 'sinker'],
  ['799', 60, 'dart'],
  ['800', 75, 'floater'],
] as const)
  add(id, d, b, [
    night(),
    r('ocean', 'all', [[600, 2600]], 'any', {
      area: 'Southwest Beach, with Magic Bait',
      magicOnly: true,
      directions: [
        'Stand on the leftmost pier in the southwest corner of the Beach.',
        'Equip Magic Bait and cast west into the correct ocean area.',
      ],
      requirements: ['Magic Bait required for this alternative; regular bait does not work.'],
    }),
  ]);
add('269', 55, 'mixed', [
  r('mountain', 'fall winter', [[2200, 2600]]),
  pond('fall winter', [[2200, 2600]]),
  islandFresh([[2200, 2600]]),
]);
add('267', 50, 'sinker', [r('ocean', 'spring summer', [[600, 2000]]), islandSea([[600, 2000]])]);
add('836', 80, 'sinker', [
  r('island', 'all', [[600, 2600]], 'any', {
    area: 'Pirate Cove',
    directions: [
      'Open Ginger Island’s Beach Resort to unlock Island Southeast.',
      'Enter the Pirate Cove and cast into its pool.',
    ],
    requirements: [
      'Reach Ginger Island Southeast and enter the Pirate Cove. Pirates do not need to be present.',
    ],
  }),
]);
add('837', 50, 'smooth', [islandSea()]);
add('838', 60, 'dart', [islandFresh()]);
add(
  'Goby',
  55,
  'dart',
  [
    r('forest', 'all', [[600, 2600]], 'any', {
      area: 'Pools below the southern waterfalls',
      directions: [
        'Walk to the waterfalls east of the Hat Mouse’s abandoned house in southern Cindersap Forest.',
        'Cast into the lower waterfall pools, not just any section of the river.',
      ],
      requirements: ['Effective Fishing level 4 is needed to reach the pools with your cast.'],
    }),
  ],
  { minLevel: 4 },
);
for (const [id, region, area] of [
  ['152', 'ocean', 'Beach ocean'],
  ['153', 'town', 'Town / forest freshwater'],
  ['157', 'mines', 'Mines floors 20 / 60'],
] as const)
  add(
    id,
    null,
    null,
    [region === 'mines' ? mine(20) : r(region, 'all', [[600, 2600]], 'any', { area })],
    {
      method: 'rod-collectible',
      notes: [
        'This collection item uses a rod but does not trigger the normal fish minigame. A purchased or monster-dropped item is not evidence of a saved catch.',
      ],
    },
  );
add('CaveJelly', null, null, [mine(20), mine(60), mine(100)], {
  method: 'rod-collectible',
  notes: [
    'Luck buffs improve the chance; daily luck does not. Fish with a rod to record the collection action.',
  ],
});
add(
  'RiverJelly',
  null,
  null,
  [...river(), r('mountain'), pond(), r('desert'), r('woods'), islandFresh()],
  {
    method: 'rod-collectible',
    notes: [
      'Luck buffs improve the chance; daily luck does not. Ordinary river, lake and pond routes are listed here.',
    ],
  },
);
add('SeaJelly', null, null, [r('ocean'), islandSea(), night()], {
  method: 'rod-collectible',
  notes: [
    'Luck buffs improve the chance; daily luck does not. This is a rod collectible, not a Crab Pot catch.',
  ],
});
for (const key of ['715', '716', '717', '718', '719', '720', '721', '722', '723', '372']) {
  const fresh = ['716', '721', '722'].includes(key);
  add(
    key,
    null,
    null,
    [
      fresh
        ? r('town', 'all', [[600, 2600]], 'any', {
            area: 'Freshwater Crab Pot (river / lake / pond)',
          })
        : r('ocean', 'all', [[600, 2600]], 'any', { area: 'Saltwater Crab Pot (Beach ocean)' }),
    ],
    {
      method: 'crab-pot',
      notes: [
        'Place a Crab Pot in the documented water type, add bait unless you have Luremaster, and collect the result the next day.',
        'The catch is random; several pots improve your opportunities without guaranteeing this item.',
        'Some shellfish can also be foraged. The Crab Pot route provides a clear fishing-collection action.',
      ],
    },
  );
}
export const fishProfiles = Object.fromEntries(profiles.map((p) => [p.id, p])) as Record<
  string,
  FishProfile
>;
export const routesFor = (p: FishProfile, version: string | null) =>
  p.routes.filter(
    (r) => !r.versions || r.versions.includes(version?.startsWith('1.5') ? '1.5' : '1.6'),
  );
export const clockLabel = (n: number) =>
  `${String(Math.floor(n / 100) % 24).padStart(2, '0')}:${String(n % 100).padStart(2, '0')}${n >= 2400 ? ' (+1 day)' : ''}`;
export const timeLabel = (r: FishRoute) =>
  r.times.map(([a, b]) => `${clockLabel(a)}–${clockLabel(b)}`).join(' / ');
export const methodLabel = (p: FishProfile) =>
  p.method === 'crab-pot'
    ? 'Crab Pot'
    : p.method === 'rod-collectible'
      ? 'Rod collectible'
      : 'Fishing rod';
export function routeChecks(p: FishProfile, r: FishRoute, save: SaveProfile | null, magic = false) {
  const baitBypass = magic && p.method === 'rod' && r.region !== 'night-market' && !r.days;
  const season = save ? baitBypass || r.seasons.includes(save.season) : null;
  const date = save ? !r.days || (save.day >= r.days[0] && save.day <= r.days[1]) : null;
  const level = Math.max(p.minLevel, r.minLevel ?? 0);
  const savedLevel = save?.players[0].skills.fishing;
  return {
    season,
    date,
    level,
    levelMet: level === 0 ? true : savedLevel === undefined ? null : savedLevel >= level,
    magicRequired: r.magicOnly === true && !magic,
  };
}
export function fishToGuide(p: FishProfile): Guide {
  const main = p.routes[0];
  return {
    entryId: p.id,
    versions: p.versions,
    verifiedAt: p.verifiedAt,
    sources: p.sources,
    seasons: [...new Set(p.routes.filter((r) => !r.magicOnly).flatMap((r) => r.seasons))],
    location: main.area,
    time: timeLabel(main),
    weather: main.weather,
    steps: [
      `Use ${methodLabel(p).toLowerCase()} at ${main.area}.`,
      ...main.directions,
      `Main route: ${main.seasons.join(', ')}; ${timeLabel(main)}; ${main.weather === 'any' ? 'any weather' : main.weather + ' required'}.`,
      ...main.requirements,
      ...p.notes,
      'Open the route cards for alternatives. After completing the action, save overnight and rescan.',
    ],
  };
}
