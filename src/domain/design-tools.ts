import type { DesignItem, FarmDesign } from './farm-design';
import { placementIssue } from './farm-design';
import type { TileMap } from './tilemap';
export type Tile = [number, number];
export function lineTiles(a: Tile, b: Tile): Tile[] {
  const cells: Tile[] = [];
  let [x, y] = a;
  const dx = Math.abs(b[0] - x),
    dy = -Math.abs(b[1] - y),
    sx = x < b[0] ? 1 : -1,
    sy = y < b[1] ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    cells.push([x, y]);
    if (x === b[0] && y === b[1]) break;
    const e = error * 2;
    if (e >= dy) {
      error += dy;
      x += sx;
    }
    if (e <= dx) {
      error += dx;
      y += sy;
    }
  }
  return cells;
}
export function paintDesign(
  design: FarmDesign,
  cells: Tile[],
  brush: Omit<DesignItem, 'id' | 'x' | 'y'> | null,
  erase: boolean,
  map: TileMap | null,
) {
  if (erase) {
    const items = design.items.filter(
      (i) =>
        !cells.some(([x, y]) => x >= i.x && y >= i.y && x < i.x + i.width && y < i.y + i.height),
    );
    return items.length === design.items.length ? design : { ...design, items };
  }
  if (!brush) return design;
  const items = [...design.items];
  for (const [x, y] of cells) {
    if (items.length >= 1500) break;
    const item = { ...brush, id: crypto.randomUUID(), x, y },
      issue = placementIssue(item, items, map);
    if (!issue?.includes('outside') && !issue?.includes('overlaps')) items.push(item);
  }
  return items.length === design.items.length ? design : { ...design, items };
}
export function sprinklerCoverage(id: string): Tile[] {
  const key = id.replace(/^\(O\)|^object:/, '');
  if (key === '599')
    return [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
  const r = key === '621' ? 1 : key === '645' ? 2 : 0,
    cells: Tile[] = [];
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x || y) cells.push([x, y]);
  return cells;
}
