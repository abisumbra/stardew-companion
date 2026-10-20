import type { Entry, Evidence, Farmer, SaveProfile } from './models';
import {
  datable,
  entriesFor,
  monsterGoals,
  stardrops,
  versionFamily,
  villagers,
} from './knowledge';
export type ProgressItem = {
  id: string;
  name: string;
  done: boolean | null;
  known?: boolean | null;
  detail?: string;
  evidence: Evidence;
  sources: string[];
};
export type Criterion = {
  id: string;
  name: string;
  weight: number;
  current: number;
  total: number;
  ratio: number | null;
  lowerRatio: number;
  items: ProgressItem[];
  farmer?: string;
  farmerId?: string;
  binary?: boolean;
  evidence: Evidence;
};
const recipeAliases: Record<string, string> = {
  'Cheese Cauliflower': 'Cheese Cauli.',
  Cookie: 'Cookies',
  'Cranberry Sauce': 'Cran. Sauce',
  "Dish O' The Sea": "Dish o' The Sea",
  'Eggplant Parmesan': 'Eggplant Parm.',
  'Vegetable Medley': 'Vegetable Stew',
};
export function entryProgress(e: Entry, f: Farmer, supported = true): ProgressItem {
  const map =
    e.type === 'cooking'
      ? f.cooked
      : e.type === 'crafting'
        ? f.crafting
        : e.type === 'fishing'
          ? f.fish
          : f.shipped;
  const field = {
    cooking: 'recipesCooked',
    crafting: 'craftingRecipes',
    fishing: 'fishCaught',
    shipping: 'basicShipped',
  }[e.type];
  const key = e.type === 'crafting' ? (e.key === 'Oil of Garlic' ? 'Oil Of Garlic' : e.key) : e.key;
  const actualKey = map && key in map ? key : e.key;
  const done = !supported || map === null ? null : (map[actualKey] ?? 0) > 0;
  const known =
    e.type === 'cooking'
      ? f.cookingKnown === null
        ? null
        : e.name in f.cookingKnown || recipeAliases[e.name] in f.cookingKnown
      : e.type === 'crafting'
        ? f.crafting === null
          ? null
          : key in f.crafting || e.key in f.crafting
        : undefined;
  return {
    id: e.id,
    name: e.name,
    done,
    known,
    evidence: {
      status: done === null ? 'unknown' : 'confirmed',
      reason: !supported
        ? 'Unsupported game version.'
        : map === null
          ? `The ${field} section is absent.`
          : `${field}[${actualKey}] = ${map[actualKey] ?? 0}. Ownership is not used.`,
      field,
    },
    sources: e.sources,
  };
}
const evidence = (known: boolean, reason: string): Evidence => ({
  status: known ? 'confirmed' : 'unknown',
  reason,
});
const item = (
  id: string,
  name: string,
  done: boolean | null,
  reason: string,
  sources = ['wiki-perfection'],
  detail?: string,
): ProgressItem => ({ id, name, done, evidence: evidence(done !== null, reason), sources, detail });
function fromItems(
  id: string,
  name: string,
  weight: number,
  items: ProgressItem[],
  farmer?: string,
  binary = false,
): Criterion {
  const current = items.filter((i) => i.done === true).length,
    total = items.length;
  const lowerRatio = binary ? (current === total ? 1 : 0) : total ? current / total : 0;
  const known =
    items.every((i) => i.done !== null) || (binary && items.some((i) => i.done === false));
  return {
    id,
    name,
    weight,
    current,
    total,
    ratio: known ? lowerRatio : null,
    lowerRatio,
    items,
    farmer,
    binary,
    evidence: evidence(
      known,
      known
        ? 'Confirmed from the relevant save action records.'
        : 'A required save section or version rule is unavailable.',
    ),
  };
}
// In multiplayer a complete category belongs to one farmer; sets are never unioned.
function best(criteria: Criterion[]): Criterion {
  const sorted = [...criteria].sort((a, b) => b.lowerRatio - a.lowerRatio || b.current - a.current);
  const b = sorted[0];
  if (b.lowerRatio < 1 && criteria.some((c) => c.ratio === null))
    return {
      ...b,
      ratio: null,
      evidence: evidence(
        false,
        'Another farmer has unknown data; only a lower bound is confirmed.',
      ),
    };
  return b;
}
export function calculateProgress(save: SaveProfile) {
  const supported = versionFamily(save.gameVersion) !== null;
  const perFarmer = save.players.map((f) => {
    const c: Criterion[] = (['shipping', 'cooking', 'crafting', 'fishing'] as const).map((type) =>
      fromItems(
        type,
        {
          shipping: 'Produce & forage shipped',
          cooking: 'Cooking',
          crafting: 'Crafting',
          fishing: 'Fish caught',
        }[type],
        type === 'shipping' ? 15 : 10,
        entriesFor(type, save.gameVersion).map((e) => entryProgress(e, f, supported)),
        f.name,
      ),
    );
    c.push(
      fromItems(
        'friendship',
        'Great friends',
        11,
        villagers.map((name) => {
          const max = datable.has(name) ? 2000 : 2500,
            points = f.friendship?.[name] ?? 0;
          return item(
            `friendship:${name}`,
            name,
            !supported || f.friendship === null ? null : points >= max,
            `friendshipData[${name}] = ${points}; threshold ${max}.`,
            ['wiki-perfection', 'wiki-friendship'],
            `${Math.floor(points / 250)} / ${max / 250} hearts for Perfection`,
          );
        }),
        f.name,
      ),
    );
    const skillNames = ['farming', 'fishing', 'foraging', 'mining', 'combat'];
    const skills = skillNames.map((name) =>
      item(
        `skill:${name}`,
        name,
        !supported || !(name in f.skills) ? null : f.skills[name] >= 10,
        `${name}Level = ${f.skills[name] ?? 'unknown'}`,
        ['wiki-perfection'],
        `Level ${f.skills[name] ?? '?'} / 10`,
      ),
    );
    const skill = fromItems('skills', 'Farmer level', 5, skills, f.name);
    const known = supported && [...skillNames, 'luck'].every((n) => n in f.skills);
    const farmerLevel = Math.min(
      25,
      Math.floor(Object.values(f.skills).reduce((a, b) => a + b, 0) / 2),
    );
    c.push({
      ...skill,
      ratio: known ? farmerLevel / 25 : null,
      lowerRatio: known ? farmerLevel / 25 : 0,
      current: farmerLevel,
      total: 25,
      evidence: evidence(
        known,
        'Farmer level = floor((five skill levels + luck level) / 2), capped at 25.',
      ),
    });
    c.push(
      fromItems(
        'stardrops',
        'All Stardrops',
        10,
        stardrops.map((s) =>
          item(
            `stardrop:${s.id}`,
            s.name,
            !supported || f.mail === null
              ? null
              : f.mail.includes(s.id) || (s.id === 'CF_Mines' && f.mineStardrop === true),
            `mailReceived contains ${s.id}${s.id === 'CF_Mines' ? ' or chestConsumedLevels[100] is true' : ''}.`,
            ['wiki-stardrop', 'checkup'],
            s.steps,
          ),
        ),
        f.name,
        true,
      ),
    );
    c.push(
      fromItems(
        'monsters',
        'Monster Slayer Hero',
        10,
        monsterGoals.map((g) => {
          const total =
            g.name === 'Cave Insects' && versionFamily(save.gameVersion) === '1.5' ? 125 : g.total;
          const n = g.types.reduce((a, t) => a + (f.monsters?.[t] ?? 0), 0);
          return item(
            `monster:${g.name}`,
            g.name,
            !supported || f.monsters === null ? null : n >= total,
            `specificMonstersKilled: ${g.types.join(', ')}.`,
            ['checkup', 'wiki-perfection'],
            `${n.toLocaleString()} / ${total.toLocaleString()} • ${g.types.join(', ')}`,
          );
        }),
        f.name,
        true,
      ),
    );
    c.forEach((criterion) => {
      criterion.farmerId = f.id;
    });
    return c;
  });
  const criteria = perFarmer[0].map((_, i) => best(perFarmer.map((c) => c[i])));
  const obelisks = ['Earth Obelisk', 'Water Obelisk', 'Desert Obelisk', 'Island Obelisk'];
  criteria.push(
    fromItems(
      'obelisks',
      'Farm obelisks',
      4,
      obelisks.map((name) =>
        item(
          `building:${name}`,
          name,
          !supported || save.buildings === null ? null : save.buildings.includes(name),
          `Farm/buildings/buildingType contains ${name}.`,
        ),
      ),
    ),
  );
  criteria.push(
    fromItems(
      'clock',
      'Golden Clock',
      10,
      [
        item(
          'building:Gold Clock',
          'Gold Clock',
          !supported || save.buildings === null ? null : save.buildings.includes('Gold Clock'),
          'Farm/buildings/buildingType contains Gold Clock.',
        ),
      ],
      undefined,
      true,
    ),
  );
  const walnutsKnown = supported && save.walnutsFound !== null;
  const walnutRatio = walnutsKnown ? Math.min(1, save.walnutsFound! / 130) : 0;
  criteria.push({
    id: 'walnuts',
    name: 'Golden Walnuts',
    weight: 5,
    current: save.walnutsFound ?? 0,
    total: 130,
    ratio: walnutsKnown ? walnutRatio : null,
    lowerRatio: walnutRatio,
    items: [
      item(
        'walnuts:remaining',
        'Remaining Golden Walnuts',
        walnutsKnown ? save.walnutsFound! >= 130 : null,
        'goldenWalnutsFound is the historical found total, not the spendable wallet.',
        ['wiki-perfection'],
        'Open Completionist → Golden Walnuts for individual saved locations and reward groups.',
      ),
    ],
    evidence: evidence(walnutsKnown, 'goldenWalnutsFound / 130; shared by the farm.'),
  });
  const lowerBound = criteria.reduce((sum, c) => sum + c.lowerRatio * c.weight, 0);
  const natural = criteria.every((c) => c.ratio !== null) ? lowerBound : null;
  const waivers = versionFamily(save.gameVersion) === '1.5' ? 0 : save.waivers;
  return {
    criteria,
    natural,
    lowerBound,
    waivers,
    total: natural !== null && waivers !== null ? Math.min(100, natural + waivers) : null,
    supported,
  };
}
