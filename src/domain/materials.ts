import type { ArtworkData } from '../components/Artwork';
import { itemId, materialId } from './installed';
import { processingRecipes } from './machines';
import type { Recipe } from '../components/Artwork';
import { ingredientIds } from './supplies';
const alternativeCache = new WeakMap<ArtworkData, Map<string, Recipe[]>>();
export const recipeRouteId = (r: Recipe) =>
  `${legacyRecipeRouteId(r)}:${JSON.stringify([r.output, r.quantity, r.accessCondition ?? null])}`;
const legacyRecipeRouteId = (r: Recipe) =>
  `${r.machineId ?? r.shopId ?? r.kind ?? 'recipe'}:${r.name ?? r.output}:${r.ingredients.map((i) => `${materialId(i.id)}=${i.quantity}`).join(',')}`;
export function purchaseRecipes(art: ArtworkData): Recipe[] {
  return Object.entries(art.gameData?.shops ?? {}).flatMap(([shopId, shop]) =>
    (shop.Items ?? []).flatMap(
      (i: {
        IsRecipe?: boolean;
        ItemId?: string;
        Price?: number;
        TradeItemId?: string;
        TradeItemAmount?: number;
        Condition?: string;
        MinStack?: number;
        MaxStack?: number;
        PriceModifiers?: unknown[];
      }) => {
        if (
          i.IsRecipe ||
          !i.ItemId?.startsWith('(O)') ||
          shop.PriceModifiers?.length ||
          i.PriceModifiers?.length ||
          (i.MinStack ?? 1) > 1 ||
          (i.MaxStack && i.MaxStack > Math.max(1, i.MinStack ?? 1))
        )
          return [];
        const ingredient =
          i.TradeItemId && (i.TradeItemAmount ?? 0) > 0
            ? { id: itemId(i.TradeItemId), quantity: i.TradeItemAmount! }
            : (i.Price ?? 0) > 0
              ? { id: 'currency:gold', quantity: i.Price! }
              : null;
        return ingredient
          ? [
              {
                kind: 'purchase',
                name: shopId,
                shopId,
                accessCondition: i.Condition ?? null,
                output: itemId(i.ItemId),
                quantity: Math.max(1, i.MinStack ?? 1),
                ingredients: [ingredient],
              },
            ]
          : [];
      },
    ),
  );
}
export function installedMaterials(
  demand: Record<string, number>,
  stock: Record<string, number>,
  art: ArtworkData,
  recursive = true,
  options: {
    owners?: Record<string, string[]>;
    planned?: Record<string, number>;
    routes?: Record<string, string>;
    learned?: (recipe: Recipe) => boolean | null;
    accessible?: (recipe: Recipe) => boolean | null;
  } = {},
) {
  let alternatives = alternativeCache.get(art);
  if (!alternatives) {
    alternatives = new Map<string, Recipe[]>();
    for (const r of [
      ...Object.values(art.recipes),
      ...processingRecipes(art),
      ...purchaseRecipes(art),
    ]) {
      const recipe = {
        ...r,
        output: itemId(r.output),
        ingredients: r.ingredients.map((i) => ({ ...i, id: materialId(i.id) })),
      };
      if (!(recipe.quantity > 0) || recipe.ingredients.some((i) => !(i.quantity > 0))) continue;
      const all = alternatives.get(recipe.output) ?? [];
      if (!all.some((other) => recipeRouteId(other) === recipeRouteId(recipe))) all.push(recipe);
      alternatives.set(recipe.output, all);
    }
    alternativeCache.set(art, alternatives);
  }
  const score = (r: Recipe) =>
    r.ingredients.reduce(
      (n, i) => n + Math.max(0, i.quantity - (stock[i.id] ?? 0)) / i.quantity,
      0,
    ) +
    (options.learned?.(r) === false ? 10 : 0) +
    (r.machineId ? 0.05 : 0) +
    (r.shopId && options.accessible?.(r) !== true ? 100 : 0);
  const recipes = new Map(
    [...alternatives].map(([id, routes]) => [
      id,
      routes.find((r) => recipeRouteId(r) === options.routes?.[id]) ??
        routes.find((r) => legacyRecipeRouteId(r) === options.routes?.[id]) ??
        [...routes].sort((a, b) => score(a) - score(b))[0],
    ]),
  );
  for (const [id, route] of Object.entries(options.routes ?? {}))
    if (route === 'gather') recipes.delete(id);
  const ordered: string[] = [],
    visiting = new Set<string>(),
    visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error(`Recipe cycle: ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    if (recursive) recipes.get(id)?.ingredients.forEach((i) => visit(i.id));
    visiting.delete(id);
    visited.add(id);
    ordered.push(id);
  };
  Object.keys(demand).forEach(visit);
  const need = { ...demand },
    used: Record<string, number> = {},
    crafts: Record<string, number> = {},
    plannedUsed: Record<string, number> = {},
    owners: Record<string, string[]> = structuredClone(options.owners ?? {}),
    leaves: Record<
      string,
      { required: number; available: number; missing: number; planned?: number }
    > = {};
  const isPool = (id: string) => id === 'milk' || id === 'egg' || /^-[0-9]+$/.test(id);
  const sequence = ordered.reverse();
  for (const id of [...sequence.filter((i) => !isPool(i)), ...sequence.filter(isPool)]) {
    const required = need[id] ?? 0;
    if (!required) continue;
    let available = 0,
      planned = 0;
    const candidates = isPool(id) && !(id in stock) ? ingredientIds(id, art) : [id];
    for (const key of candidates) {
      const take = Math.min(
        required - available,
        Math.max(0, (stock[key] ?? 0) - (used[key] ?? 0)),
      );
      available += take;
      used[key] = (used[key] ?? 0) + take;
    }
    for (const key of candidates) {
      const take = Math.min(
        required - available - planned,
        Math.max(0, (options.planned?.[key] ?? 0) - (plannedUsed[key] ?? 0)),
      );
      planned += take;
      plannedUsed[key] = (plannedUsed[key] ?? 0) + take;
    }
    const missing = Math.max(0, required - available - planned),
      recipe = recursive ? recipes.get(id) : undefined;
    if (recipe && missing > 0) {
      const batches = Math.ceil(missing / recipe.quantity);
      crafts[id] = batches;
      recipe.ingredients.forEach((i) => {
        need[i.id] = (need[i.id] ?? 0) + batches * i.quantity;
        owners[i.id] = [...new Set([...(owners[i.id] ?? []), ...(owners[id] ?? [])])];
      });
    } else leaves[id] = { required, available, missing, ...(planned ? { planned } : {}) };
  }
  return { leaves, crafts, recipes, owners, plannedUsed, alternatives };
}
