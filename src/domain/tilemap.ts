import { z } from 'zod';
const tile = z.object({
  sheet: z.number().int().min(0).max(63),
  index: z.number().int().nonnegative().max(100000),
  properties: z.record(z.string(), z.unknown()),
});
export const TileMapSchema = z
  .object({
    width: z.number().int().min(1).max(256),
    height: z.number().int().min(1).max(256),
    tileWidth: z.number().int().min(1).max(64),
    tileHeight: z.number().int().min(1).max(64),
    layers: z
      .array(
        z.object({
          name: z.string(),
          width: z.number().int().positive().max(256),
          height: z.number().int().positive().max(256),
          tiles: z.array(tile.nullable()).max(65536),
        }),
      )
      .max(32),
    sheets: z
      .array(
        z.object({
          id: z.string(),
          image: z.string(),
          columns: z.number().int().positive(),
          rows: z.number().int().positive(),
          tileWidth: z.number().int().positive(),
          tileHeight: z.number().int().positive(),
          margin: z.tuple([z.number(), z.number()]),
          spacing: z.tuple([z.number(), z.number()]),
        }),
      )
      .max(64),
    images: z.record(
      z.string(),
      z.object({
        url: z.string().startsWith('data:image/png;base64,'),
        width: z.number().int().positive().max(8192),
        height: z.number().int().positive().max(8192),
      }),
    ),
    walkable: z.array(z.boolean()).max(65536),
    properties: z.record(z.string(), z.unknown()).default({}),
  })
  .refine(
    (m) =>
      m.walkable.length === m.width * m.height &&
      m.layers.every((l) => l.tiles.length === l.width * l.height) &&
      m.width * m.tileWidth <= 4096 &&
      m.height * m.tileHeight <= 4096,
    'Invalid map grid',
  );
export type TileMap = z.infer<typeof TileMapSchema>;
export function withObstacles<T extends Pick<TileMap, 'width' | 'height' | 'walkable'>>(
  map: T,
  obstacles: { x: number; y: number; width: number; height: number }[],
): T {
  const walkable = [...map.walkable];
  for (const r of obstacles)
    for (let y = Math.max(0, r.y); y < Math.min(map.height, r.y + r.height); y++)
      for (let x = Math.max(0, r.x); x < Math.min(map.width, r.x + r.width); x++)
        walkable[y * map.width + x] = false;
  return { ...map, walkable };
}
export function mapExits(map: Pick<TileMap, 'properties'>) {
  const tokens = String(map.properties.Warp ?? '')
      .trim()
      .split(/\s+/),
    exits = [];
  for (let i = 0; i + 4 < tokens.length; i += 5) {
    const [x, y, location, tx, ty] = tokens.slice(i, i + 5),
      numbers = [x, y, tx, ty].map(Number);
    if (numbers.every(Number.isInteger) && /^[A-Za-z0-9_ -]{1,80}$/.test(location))
      exits.push({
        from: [numbers[0], numbers[1]] as [number, number],
        location,
        to: [numbers[2], numbers[3]] as [number, number],
      });
  }
  return exits;
}
export function locationMapIdentity(
  location: string,
  farmType?: string,
  locationMaps?: Record<string, string> | null,
) {
  const catalogFarms: Record<string, string> = {
    Farm_Standard: 'Farm',
    Farm_Riverland: 'Farm_Fishing',
    Farm_Forest: 'Farm_Foraging',
    Farm_Hilltop: 'Farm_Mining',
    Farm_Wilderness: 'Farm_Combat',
    Farm_Beach: 'Farm_Island',
    Farm_MeadowlandsFarm: 'Farm_Ranching',
  };
  if (catalogFarms[location]) return catalogFarms[location];
  if (locationMaps?.[location]) return locationMaps[location];
  if (location !== 'Farm') return location;
  const farms: Record<string, string> = {
    Standard: 'Farm',
    Riverland: 'Farm_Fishing',
    Forest: 'Farm_Foraging',
    'Hill-top': 'Farm_Mining',
    Wilderness: 'Farm_Combat',
    'Four Corners': 'Farm_FourCorners',
    Beach: 'Farm_Island',
    Meadowlands: 'Farm_Ranching',
  };
  return farms[farmType ?? 'Standard'] ?? null;
}
export function walkingPath(
  map: Pick<TileMap, 'width' | 'height' | 'walkable'>,
  start: [number, number],
  end: [number, number],
): [number, number][] | null {
  const valid = ([x, y]: [number, number]) =>
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x < map.width &&
    y < map.height &&
    map.walkable[y * map.width + x];
  if (!valid(start) || !valid(end)) return null;
  const from = start[1] * map.width + start[0],
    to = end[1] * map.width + end[0],
    parents = new Int32Array(map.width * map.height).fill(-1),
    queue = new Uint32Array(parents.length);
  let head = 0,
    tail = 1;
  queue[0] = from;
  parents[from] = from;
  while (head < tail && parents[to] === -1) {
    const cell = queue[head++],
      x = cell % map.width,
      y = Math.floor(cell / map.width);
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      if (!valid([nx, ny])) continue;
      const n = ny * map.width + nx;
      if (parents[n] !== -1) continue;
      parents[n] = cell;
      queue[tail++] = n;
    }
  }
  if (parents[to] === -1) return null;
  const path: [number, number][] = [];
  for (let p = to; ; p = parents[p]) {
    path.push([p % map.width, Math.floor(p / map.width)]);
    if (p === from) break;
  }
  return path.reverse();
}
