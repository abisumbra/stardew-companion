import type { ArtworkData, Recipe } from '../components/Artwork';
import type { Entry, Guide, Ingredient, SaveProfile, Season } from './models';
import { fishProfiles, routesFor, timeLabel } from './fishing';
import unlocks from '../../data/recipe-unlocks.json';
import { displayText } from './display-text';
import { catalogItemId } from './item-identity';
const indexes = new WeakMap<
  ArtworkData,
  {
    names: Map<string, string>;
    acquisitions: Map<string, string[]>;
    unlocks: Map<string, string[]>;
  }
>();
function index(art: ArtworkData) {
  let cached = indexes.get(art);
  if (!cached) {
    cached = {
      names: new Map(art.items.map((e) => [itemId(e.id), e.name])),
      acquisitions: new Map(),
      unlocks: new Map(),
    };
    indexes.set(art, cached);
  }
  return cached;
}
export const seasons: Season[] = ['spring', 'summer', 'fall', 'winter'];
// A crop survives into consecutive supported seasons. Day planted is day zero of growth.
export function plantingWindow(crop: { Seasons: number[]; DaysInPhase: number[] }, season: Season) {
  const days = crop.DaysInPhase.reduce((a, b) => a + b, 0),
    index = seasons.indexOf(season);
  if (!crop.Seasons.includes(index)) return { days, deadline: null, allYear: false };
  if (seasons.every((_, i) => crop.Seasons.includes(i)))
    return { days, deadline: null, allYear: true };
  let consecutive = 1;
  while (consecutive < 4 && crop.Seasons.includes((index + consecutive) % 4)) consecutive++;
  return { days, deadline: consecutive * 28 - days, allYear: false };
}
export const itemId = (id: string) =>
  catalogItemId(id).replace(/^object:/,'');
export const materialId = (id: string) => ({ '-6': 'milk', '-5': 'egg' })[id] ?? itemId(id);
export function itemName(id: string, art: ArtworkData) {
  const key = itemId(id);
  return (
    displayText(index(art).names.get(key)) ||
    {
      milk: 'Milk (any)',
      'currency:gold': 'Gold',
      egg: 'Egg (any)',
      '-777': 'Wild Seeds (any season)',
      '-4': 'Fish (any)',
      '-75': 'Vegetable (any)',
      '-79': 'Fruit (any)',
    }[key] ||
    displayText(art.gameData?.objects?.[key]?.Name) ||
    key
  );
}
export function installedRecipe(entry: Entry, art: ArtworkData): Recipe | undefined {
  return (
    art.recipes[entry.id] ??
    Object.values(art.recipes).find((r) =>
      entry.type === 'crafting'
        ? r.kind === 'crafting' && r.name?.toLowerCase() === entry.key.toLowerCase()
        : entry.type === 'cooking' && itemId(r.output) === entry.key,
    )
  );
}
export function conditionText(raw: string | null | undefined) {
  if (!raw) return 'No extra condition in the data';
  return raw
    .replace(
      /PLAYER_FRIENDSHIP_POINTS\s+(?:Current|Any|Host)\s+(\w+)\s+(\d+)/g,
      (_, name, n) => `${name}: at least ${Number(n) / 250} hearts`,
    )
    .replace(/PLAYER_HAS_MAIL\s+(?:Current|Any|Host)\s+(\w+)/g, 'Letter / progression flag: $1')
    .replace(/SEASON\s+/g, 'Season: ')
    .replace(/YEAR\s+/g, 'Year: ')
    .replace(/PLAYER_STAT\s+/g, 'Saved statistic: ');
}
export function acquisition(id: string, art: ArtworkData): string[] {
  const key = itemId(id),
    out: string[] = [];
  const cached = index(art).acquisitions.get(key);
  if (cached) return cached;
  const resources: Record<string, string> = {
    '388':
      'Chop normal trees and fallen branches with an axe. Replant seeds for a renewable supply.',
    '390': 'Break rocks with a pickaxe on the farm, in the Mines or in the Quarry.',
    '709': 'Chop large stumps and logs with a sufficiently upgraded axe, or grow Mahogany Trees.',
    '378':
      'Break copper ore nodes in the upper Mines; smelt five ore with one Coal for a Copper Bar.',
    '380':
      'Break iron ore nodes in the frozen Mines; smelt five ore with one Coal for an Iron Bar.',
    '384': 'Break gold ore nodes in the lower Mines; smelt five ore with one Coal for a Gold Bar.',
    '386': 'Explore Skull Cavern for iridium nodes; combat, depth and access requirements apply.',
    '382': 'Mine rocks, defeat Dust Sprites, buy stock, or process Wood in a Charcoal Kiln.',
    '80': 'Collect Quartz in the Mines. Smelting consumes Coal; processing rules are shown in the machine guide.',
    '92': 'Chop trees for Sap.',
    '771': 'Cut weeds for Fiber; Fiber Seeds are another route when their recipe is available.',
  };
  if (resources[key]) out.push(resources[key]);
  if (key === 'milk') return ['Collect milk from cows or goats. Any size is accepted.'];
  if (key === 'egg')
    return ['Collect an egg from poultry. Any supported egg category is accepted.'];
  if (/^-[0-9]+$/.test(key))
    return [
      `Use an item in ingredient category ${key}; available matching items are pooled without double counting.`,
    ];
  for (const [seed, crop] of Object.entries(art.gameData?.crops ?? {}))
    if (itemId(String(crop.HarvestItemId)) === key)
      out.push(
        `Grow ${itemName(seed, art)} in ${(crop.Seasons ?? []).map((n: number) => seasons[n]).join(' / ')}. First harvest: ${(crop.DaysInPhase ?? []).reduce((a: number, b: number) => a + b, 0)} days${crop.RegrowDays > 0 ? `; regrows every ${crop.RegrowDays} days` : ''}.`,
      );
  const forage = Object.entries(art.gameData?.locations ?? {}).flatMap(([location, data]) =>
    (data.Forage ?? [])
      .filter((f: any) => itemId(String(f.ItemId)) === key)
      .map(
        (f: any) =>
          `${location} (${f.Season === null ? 'any season' : seasons[f.Season]}${f.Condition ? `; ${conditionText(f.Condition)}` : ''})`,
      ),
  );
  if (forage.length)
    out.push(`Forage routes: ${[...new Set(forage)].slice(0, 12).join(' · ')}. Spawns are random.`);
  const fish = fishProfiles[`fishing:${key}`];
  if (fish)
    out.push(
      ...routesFor(fish, '1.6')
        .filter((r) => !r.magicOnly)
        .slice(0, 3)
        .map(
          (r) =>
            `${r.area}: ${r.seasons.join(' / ')}, ${timeLabel(r)}, ${r.weather}. ${r.requirements.join(' ')}`,
        ),
    );
  const shops = Object.entries(art.gameData?.shops ?? {}).flatMap(([shop, data]) =>
    (data.Items ?? [])
      .filter((i: any) => !i.IsRecipe && itemId(String(i.ItemId)) === key)
      .map(
        (i: any) =>
          `${shop}${i.Price >= 0 ? ` (${i.Price}g)` : ''}${i.Condition ? `: ${conditionText(i.Condition)}` : ''}`,
      ),
  );
  if (shops.length)
    out.push(
      `Shop offers: ${[...new Set(shops)].slice(0, 8).join(' · ')}. Stock and access conditions still apply.`,
    );
  const monsters = Object.entries(art.gameData?.monsters ?? {})
    .filter(([, data]) =>
      String(data)
        .split('/')[6]
        ?.split(/\s+/)
        .some((v, i) => i % 2 === 0 && itemId(v) === key),
    )
    .map(([name]) => name);
  if (monsters.length)
    out.push(`Possible monster drops: ${monsters.join(' · ')}. Drops are random.`);
  for (const [animal, data] of Object.entries(art.gameData?.farmAnimals ?? {})) {
    const produce = [...(data.ProduceItemIds ?? []), ...(data.DeluxeProduceItemIds ?? [])];
    if (produce.some((p: any) => itemId(String(p.ItemId ?? p)) === key))
      out.push(`Animal produce: ${animal}; housing, feeding, age and friendship conditions apply.`);
  }
  for (const [tree, data] of Object.entries(art.gameData?.fruitTrees ?? {}))
    if ((data.Fruit ?? []).some((f: any) => itemId(String(f.ItemId)) === key))
      out.push(
        `Fruit tree: ${itemName(tree, art)}; mature the tree and harvest in ${(data.Seasons ?? []).map((n: number) => seasons[n]).join(' / ')}.`,
      );
  const recipe = Object.values(art.recipes).find((r) => itemId(r.output) === key);
  for (const [machineId, machine] of Object.entries(art.gameData?.machines ?? {}))
    for (const rule of machine.OutputRules ?? []) {
      if (
        !(rule.OutputItem ?? []).some(
          (o: any) => o.ItemId && itemId(o.ItemId) === key && !o.OutputMethod,
        )
      )
        continue;
      const input = rule.Triggers?.filter((t: any) => t.Trigger === 1 && t.RequiredItemId)
        .map(
          (t: any) =>
            `${t.RequiredCount} × ${itemName(t.RequiredItemId, art)}${t.Condition ? `; ${conditionText(t.Condition)}` : ''}`,
        )
        .join(' / ');
      if (input)
        out.push(
          `Process in ${itemName(machineId, art)}: ${input}${machine.AdditionalConsumedItems?.length ? `; fuel: ${machine.AdditionalConsumedItems.map((i: any) => `${i.RequiredCount} × ${itemName(i.ItemId, art)}`).join(' + ')}` : ''}. Output modifiers and access conditions can apply.`,
        );
    }
  if (recipe)
    out.push(
      `${recipe.kind === 'cooking' ? 'Cook' : 'Craft'} ${recipe.name}; ${recipe.quantity} produced per batch.`,
    );
  const result = [...new Set(out)].length
    ? [...new Set(out)]
    : [
        'Check the linked collection guide for this item’s acquisition route. No deterministic source is listed in the connected data.',
      ];
  index(art).acquisitions.set(key, result);
  return result;
}
export function recipeUnlock(recipe: Recipe, art: ArtworkData): string[] {
  const cacheKey = [recipe.name, recipe.output, recipe.unlock].join('|'),
    cached = index(art).unlocks.get(cacheKey);
  if (cached) return cached;
  const u = (recipe.unlock ?? '').split(' '),
    out: string[] = [];
  const event = (unlocks.events as Record<string, string>)[recipe.name ?? ''];
  const mastery = (unlocks.mastery as Record<string, string>)[recipe.name ?? ''];
  if (event) out.push(event);
  if (mastery)
    out.push(
      `Reach level 10 in all five skills, earn a Mastery level and claim ${mastery} Mastery in the Mastery Cave.`,
    );
  if (
    u[0] === 'default' ||
    [
      'Chest',
      'Wood Fence',
      'Gate',
      'Torch',
      'Campfire',
      'Wood Path',
      'Cobblestone Path',
      'Gravel Path',
      'Wood Sign',
      'Stone Sign',
      'Fried Egg',
    ].includes(recipe.name ?? '')
  )
    out.push('Starting recipe; normally learned automatically.');
  if (u[0] === 'f')
    out.push(
      `Reach ${u[2]} hearts with ${u[1]}; read the recipe letter delivered the following day.`,
    );
  if (u[0] === 's')
    out.push(`Reach ${u[1]} level ${u[2]}; claim the recipe on the level-up screen.`);
  if (recipe.name === 'Cask') out.push('Upgrade the farmhouse to include the cellar.');
  for (const [episode, raw] of Object.entries(art.gameData?.tvRecipes ?? {}))
    if (String(raw).split('/')[0] === recipe.name) {
      const n = Number(episode),
        year = n <= 16 ? 1 : 2,
        day = ((n - 1) % 16) * 7 + 7,
        season = seasons[Math.floor((day - 1) / 28) % 4];
      out.push(
        `The Queen of Sauce: year ${year}, ${season} ${((day - 1) % 28) + 1}. Check reruns for missed recipes.`,
      );
    }
  for (const [shop, data] of Object.entries(art.gameData?.shops ?? {}))
    for (const i of data.Items ?? [])
      if (i.IsRecipe && itemId(String(i.ItemId)) === itemId(recipe.output))
        out.push(
          `Buy the recipe from ${shop}${i.Price >= 0 ? ` for ${i.Price}g` : ''}${i.TradeItemId ? ` · trade ${i.TradeItemAmount} ${itemName(i.TradeItemId, art)}` : ''}. ${conditionText(i.Condition)}`,
        );
  for (const [key, text] of Object.entries(art.gameData?.mail ?? {}))
    if (String(text).includes(`craftingRecipe ${recipe.name?.replace(/ /g, '_')} `)) {
      const orders = Object.entries(art.gameData?.specialOrders ?? {})
        .filter(([, o]) =>
          o.Rewards?.some((r: any) => r.Type === 'Mail' && r.Data?.MailReceived === key),
        )
        .map(([id, o]) => o.Text ?? id);
      out.push(
        orders.length
          ? `Special order: ${orders.join(' / ')}. Finish it, then read the reward letter.`
          : `Recipe letter: ${key}. Complete the associated event or special order, then read the letter.`,
      );
    }
  const result = out.length
    ? out
    : [
        'This recipe uses an event, mastery, quest or another special unlock. Check the recipe source before planning access.',
      ];
  index(art).unlocks.set(cacheKey, result);
  return result;
}
export function runtimeGuide(
  entry: Entry,
  art: ArtworkData,
  save: SaveProfile | null,
): Guide | undefined {
  if (save?.gameVersion?.startsWith('1.5')) return;
  const recipe = installedRecipe(entry, art);
  if (!recipe) {
    if (entry.type !== 'shipping' || !art.gameData?.objects?.[entry.key]) return;
    return {
      entryId: entry.id,
      versions: ['1.6'],
      verifiedAt: '2026-10-15',
      sources: ['wiki-collections'],
      ingredients: [
        {
          id: entry.key,
          name: entry.name,
          quantity: 1,
          acquire: acquisition(entry.key, art).join(' '),
          sources: ['wiki-collections'],
        },
      ],
      steps: [
        ...acquisition(entry.key, art),
        'Ship one through the shipping bin. Owning or selling elsewhere does not prove the required shipping action.',
      ],
    };
  }
  const recipeIngredients =
    recipe.name === 'Crab Pot' && save?.players[0]?.professions?.includes(7)
      ? [
          { id: '388', quantity: 25 },
          { id: '334', quantity: 2 },
        ]
      : recipe.ingredients;
  const ingredients: Ingredient[] = recipeIngredients.map((i) => ({
    id: materialId(i.id),
    name: itemName(materialId(i.id), art),
    quantity: i.quantity,
    acquire: acquisition(materialId(i.id), art).join(' '),
    sources: [entry.type === 'cooking' ? 'wiki-cooking' : 'wiki-crafting'],
  }));
  return {
    entryId: entry.id,
    versions: ['1.6'],
    verifiedAt: '2026-10-15',
    sources: [
      entry.type === 'cooking' ? 'wiki-cooking' : 'wiki-crafting',
      'wiki-recipe-data',
      ...((unlocks.mastery as Record<string, string>)[recipe.name ?? ''] ? ['wiki-mastery'] : []),
    ],
    unlock: recipeUnlock(recipe, art).join(' '),
    ingredients,
    steps: [
      ...recipeUnlock(recipe, art),
      ...ingredients.map((i) => `${i.quantity} × ${i.name}: ${i.acquire}`),
      entry.type === 'cooking'
        ? 'Use the kitchen or a Cookout Kit and cook the dish.'
        : 'Use the crafting menu to create the item.',
      `One batch produces ${recipe.quantity}. Save overnight and rescan to confirm the action.`,
    ],
  };
}
