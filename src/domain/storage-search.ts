import type { SaveProfile } from './models';
import type { ArtworkData } from '../components/Artwork';
import { itemId, itemName } from './installed';
import { ingredientIds } from './supplies';
import { translate } from '../lib/locale';
export type Container = NonNullable<SaveProfile['containers']>[number];
export const containerLabelKey = (c: Container) =>
  JSON.stringify([c.id, c.itemId, c.location, c.tile, c.buildingTile]);
export function matchesItem(id: string, query: string, art: ArtworkData) {
  const q = query.trim().toLocaleLowerCase();
  return (
    !q ||
    ingredientIds(query, art).includes(itemId(id)) ||
    `${id} ${itemName(id, art)} ${translate(itemName(id, art))}`.toLocaleLowerCase().includes(q)
  );
}
export function storageSummary(
  containers: Container[],
  query: string,
  quality: number | null,
  art: ArtworkData,
) {
  const groups = new Set<string>();
  const result = new Map<
    string,
    { id: string; quality: number; quantity: number; containers: string[]; uncertain: boolean }
  >();
  for (const c of containers) {
    const shared = c.sharedGroup && groups.has(c.sharedGroup);
    if (c.sharedGroup) groups.add(c.sharedGroup);
    for (const item of c.items) {
      if (!matchesItem(item.id, query, art) || (quality !== null && item.quality !== quality))
        continue;
      const key = `${item.id}:${item.quality}`,
        prev = result.get(key) ?? { ...item, quantity: 0, containers: [], uncertain: false };
      if (!shared) prev.quantity += item.quantity;
      if (!prev.containers.includes(c.id)) prev.containers.push(c.id);
      prev.uncertain ||= !c.contentsKnown;
      result.set(key, prev);
    }
  }
  return [...result.values()];
}
