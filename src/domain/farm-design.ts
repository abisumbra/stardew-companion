import { z } from 'zod';
import type { ArtworkData } from '../components/Artwork';
import type { TileMap } from './tilemap';
export const farmLayouts = [
  { name: 'Standard', map: 'Farm' },
  { name: 'Riverland', map: 'Farm_Fishing' },
  { name: 'Forest', map: 'Farm_Foraging' },
  { name: 'Hill-top', map: 'Farm_Mining' },
  { name: 'Wilderness', map: 'Farm_Combat' },
  { name: 'Four Corners', map: 'Farm_FourCorners' },
  { name: 'Beach', map: 'Farm_Island' },
  { name: 'Meadowlands', map: 'Farm_Ranching' },
] as const;
export const homeLayouts = [
  { name: 'Starter home', map: 'FarmHouse' },
  { name: 'Kitchen upgrade', map: 'FarmHouse1' },
  { name: 'Family home', map: 'FarmHouse2' },
  { name: 'Kitchen with spouse room', map: 'FarmHouse1_marriage' },
  { name: 'Family home with spouse room', map: 'FarmHouse2_marriage' },
  { name: 'Cellar', map: 'Cellar' },
] as const;
export const DesignItemSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(180),
  itemId: z.string().max(160),
  kind: z.enum(['object', 'building', 'crop', 'tree', 'furniture']),
  floorCovering: z.boolean().optional(),
  recipe: z.string().max(160).optional(),
  x: z.number().int().min(0).max(255),
  y: z.number().int().min(0).max(255),
  width: z.number().int().min(1).max(30),
  height: z.number().int().min(1).max(30),
  sourceTile: z
    .tuple([z.number().int().min(0).max(255), z.number().int().min(0).max(255)])
    .optional(),
});
export const FarmDesignSchema = z
  .object({
    version: z.literal(1),
    id: z.string().min(1).max(100),
    name: z.string().trim().min(1).max(100),
    layout: z.enum([
      'Standard',
      'Riverland',
      'Forest',
      'Hill-top',
      'Wilderness',
      'Four Corners',
      'Beach',
      'Meadowlands',
      'Starter home',
      'Kitchen upgrade',
      'Family home',
      'Kitchen with spouse room',
      'Family home with spouse room',
      'Cellar',
    ]),
    items: z.array(DesignItemSchema).max(1500),
    updatedAt: z.number().int().nonnegative(),
  })
  .refine(
    (d) => new Set(d.items.map((i) => i.id)).size === d.items.length,
    'Placement IDs must be unique',
  );
export type DesignItem = z.infer<typeof DesignItemSchema>;
export const qualifiedDesignItem = (id: string) =>
  id.replace(/^object:/, '(O)').replace(/^craftable:/, '(BC)');
export function designObjectSupported(id: string, art: ArtworkData): boolean {
  const qualified = qualifiedDesignItem(id);
  if (['(O)286', '(O)287', '(O)288'].includes(qualified)) return false;
  if (qualified.startsWith('(BC)')) return true;
  const data = art.gameData?.objects?.[qualified.replace(/^\(O\)/, '')];
  if (!data) return false;
  const tags: string[] = data.ContextTags ?? [];
  return (
    !tags.includes('not_placeable') &&
    ![-74, -19].includes(data.Category) &&
    (tags.includes('placeable') || [-8, -9].includes(data.Category) || data.Type === 'Crafting')
  );
}
export type FarmDesign = z.infer<typeof FarmDesignSchema>;
export const FarmDesignsSchema = z
  .object({
    version: z.literal(1),
    designs: z.array(FarmDesignSchema).max(100),
    history: z.array(FarmDesignSchema).max(20).default([]),
    trash: z.array(FarmDesignSchema).max(10).default([]),
    pendingTransfer: z
      .object({ requestId: z.string(), sent: FarmDesignSchema, at: z.number() })
      .nullable()
      .default(null),
    transfers: z
      .array(
        z.object({
          requestId: z.string(),
          at: z.number(),
          state: z.string(),
          applied: z.array(z.string()),
          error: z.string().nullable(),
        }),
      )
      .max(30)
      .default([]),
  })
  .refine(
    (d) => new Set(d.designs.map((i) => i.id)).size === d.designs.length,
    'Design IDs must be unique',
  );
export type DesignLibrary = z.infer<typeof FarmDesignsSchema>;
export function updateLibrary(library: DesignLibrary, designs: FarmDesign[]): DesignLibrary {
  const history = [...library.history];
  for (const old of library.designs) {
    const next = designs.find((d) => d.id === old.id);
    if (
      next &&
      JSON.stringify({ ...old, updatedAt: 0 }) !== JSON.stringify({ ...next, updatedAt: 0 })
    )
      history.push(old);
  }
  const trash = [
    ...library.trash,
    ...library.designs.filter((d) => !designs.some((n) => n.id === d.id)),
  ];
  const next = { ...library, designs, history: history.slice(-20), trash: trash.slice(-10) };
  while (
    new TextEncoder().encode(JSON.stringify(next)).length > 950_000 &&
    (next.history.length || next.trash.length)
  ) {
    if (next.history.length) next.history.shift();
    else next.trash.shift();
  }
  if (new TextEncoder().encode(JSON.stringify(next)).length > 1_000_000)
    throw new Error(
      'The design library exceeds its supported limit. Save fewer placements or designs.',
    );
  return FarmDesignsSchema.parse(next);
}
export const SharedDesignSchema = z.object({
  format: z.literal('stardew-companion-design'),
  version: z.literal(1),
  design: FarmDesignSchema,
});
export function portableDesign(design: FarmDesign): FarmDesign {
  return {
    ...design,
    id: crypto.randomUUID(),
    updatedAt: Date.now(),
    items: design.items.map(({ sourceTile: _, ...item }) => ({ ...item, id: crypto.randomUUID() })),
  };
}
export function reconcileTransfer(
  current: FarmDesign,
  sent: FarmDesign,
  applied: string[],
): FarmDesign {
  if (current.id !== sent.id) return current;
  const ids = new Set(applied);
  return {
    ...current,
    updatedAt: Date.now(),
    items: current.items.map((item) => {
      const original = sent.items.find((i) => i.id === item.id);
      return ids.has(item.id) && original && original.itemId === item.itemId
        ? { ...item, sourceTile: [original.x, original.y] as [number, number] }
        : item;
    }),
  };
}
export function moveGroup(
  design: FarmDesign,
  ids: string[],
  dx: number,
  dy: number,
  copy: boolean,
  map: TileMap | null,
): FarmDesign {
  const selected = new Set(ids);
  const group = design.items
    .filter((i) => selected.has(i.id))
    .map((i) => ({
      ...i,
      id: copy ? crypto.randomUUID() : i.id,
      x: i.x + dx,
      y: i.y + dy,
      ...(copy ? { sourceTile: undefined } : {}),
    }));
  const other = copy ? design.items : design.items.filter((i) => !selected.has(i.id));
  for (const item of group) {
    const issue = placementIssue(item, [...other, ...group], map);
    if (issue?.includes('outside') || issue?.includes('overlaps')) throw new Error(issue);
  }
  return FarmDesignSchema.parse({ ...design, items: [...other, ...group] });
}
export function blankDesign(layout: FarmDesign['layout'] = 'Standard'): FarmDesign {
  return {
    version: 1,
    id: crypto.randomUUID(),
    name: homeLayouts.some((l) => l.name === layout) ? 'My home design' : 'My farm design',
    layout,
    items: [],
    updatedAt: Date.now(),
  };
}
export function overlaps(
  a: Pick<DesignItem, 'x' | 'y' | 'width' | 'height'>,
  b: Pick<DesignItem, 'x' | 'y' | 'width' | 'height'>,
) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
export function placementIssue(
  item: DesignItem,
  others: DesignItem[],
  map?: Pick<TileMap, 'width' | 'height' | 'walkable'> | null,
): string | null {
  if (
    !Number.isInteger(item.x) ||
    !Number.isInteger(item.y) ||
    item.x < 0 ||
    item.y < 0 ||
    item.x > 255 ||
    item.y > 255
  )
    return 'This placement is outside the map.';
  if (map && (item.x + item.width > map.width || item.y + item.height > map.height))
    return 'This placement is outside the map.';
  if (
    others.some(
      (other) =>
        other.id !== item.id &&
        !!other.floorCovering === !!item.floorCovering &&
        overlaps(item, other),
    )
  )
    return 'This placement overlaps another planned item.';
  if (map)
    for (let y = item.y; y < item.y + item.height; y++)
      for (let x = item.x; x < item.x + item.width; x++)
        if (!map.walkable[y * map.width + x])
          return 'This tile is blocked on the original map. In-game placement must be checked.';
  return null;
}
/** Data/Furniture field 3 is the collision footprint, field 2 is the sprite size. */
export function furnitureBrush(
  id: string,
  art: ArtworkData,
): Omit<DesignItem, 'id' | 'x' | 'y'> | null {
  const key = id.replace(/^furniture:/, '').replace(/^\(F\)/, '');
  const raw = art.gameData?.furniture?.[key];
  if (typeof raw !== 'string') return null;
  const parts = raw.split('/'),
    type = parts[1];
  const defaults: Record<string, [number, number]> = {
    chair: [1, 1],
    bench: [2, 1],
    couch: [3, 1],
    armchair: [2, 1],
    dresser: [2, 1],
    'long table': [5, 2],
    longTable: [5, 2],
    table: [2, 2],
    bookcase: [2, 1],
    lamp: [1, 1],
    fireplace: [2, 1],
    painting: [2, 2],
    rug: [3, 2],
    window: [1, 2],
    torch: [1, 1],
    sconce: [1, 2],
    decor: [1, 1],
  };
  const explicit = parts[3]?.split(' ').map(Number);
  const size =
    explicit?.length === 2 && explicit.every((n) => Number.isInteger(n) && n > 0 && n <= 30)
      ? explicit
      : defaults[type];
  // Unknown custom footprints are not guessed.
  if (!size) return null;
  return {
    name: art.items.find((i) => i.id === `furniture:${key}`)?.name ?? parts[0],
    itemId: `furniture:${key}`,
    kind: 'furniture',
    width: size[0],
    height: size[1],
    floorCovering: type === 'rug',
  };
}
export function designMaterials(design: FarmDesign, art: ArtworkData) {
  const materials: Record<string, number> = {},
    counts: Record<string, number> = {};
  let unsupported = 0;
  for (const item of design.items) {
    if (item.sourceTile) continue;
    const recipe = item.recipe && art.recipes[item.recipe];
    if (!recipe || item.kind !== 'object') {
      unsupported++;
      continue;
    }
    counts[item.recipe!] = (counts[item.recipe!] ?? 0) + 1;
  }
  for (const [id, count] of Object.entries(counts)) {
    const recipe = art.recipes[id],
      crafts = Math.ceil(count / recipe.quantity);
    for (const ingredient of recipe.ingredients)
      materials[ingredient.id] = (materials[ingredient.id] ?? 0) + ingredient.quantity * crafts;
  }
  return { materials, unsupported };
}
