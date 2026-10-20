import type { ArtworkData } from '../components/Artwork';
import type { Farmer, SaveProfile } from './models';
import { itemId, materialId } from './installed';

export function selectedFarmer(save: SaveProfile, id?: string | null) {
  return save.players.find((f) => f.id === id) ?? save.players[0];
}
export function ingredientIds(id: string, art?: ArtworkData): string[] {
  const key = materialId(id);
  if (key === '-777') return ['495', '496', '497', '498'];
  const category =
    key === 'milk' ? -6 : key === 'egg' ? -5 : /^-\d+$/.test(key) ? Number(key) : null;
  if (category === null) return [itemId(key)];
  const installed = Object.entries(art?.gameData?.objects ?? {})
    .filter(([, o]) => o.Category === category)
    .sort(([, a], [, b]) => (a.Price ?? 0) - (b.Price ?? 0))
    .map(([id]) => id);
  return installed.length
    ? installed
    : key === 'milk'
      ? ['184', '186', '436', '438']
      : key === 'egg'
        ? ['176', '174', '180', '182', '442', '305', '928', '289']
        : [];
}
export function detectedSupply(
  save: SaveProfile,
  f: Farmer,
  id: string,
  art?: ArtworkData,
  quality = 0,
) {
  const ids = ingredientIds(id, art);
  if (quality > 0) {
    const stacks = [...(f.inventoryStacks ?? []), ...(save.storageStacks ?? [])];
    return {
      count: stacks
        .filter((s) => ids.includes(s.id) && s.quality >= quality)
        .reduce((n, s) => n + s.quantity, 0),
      known:
        f.inventoryKnown &&
        save.storageKnown &&
        f.inventoryStacks !== null &&
        save.storageStacks !== null,
    };
  }
  return {
    count: ids.reduce((n, key) => n + (f.inventory[key] ?? 0) + (save.storage[key] ?? 0), 0),
    known: f.inventoryKnown && save.storageKnown,
  };
}
export function buildingCount(save: SaveProfile, key: string, art?: ArtworkData) {
  return (
    save.buildings?.filter((building) => {
      const seen = new Set<string>();
      while (building && !seen.has(building)) {
        if (building === key) return true;
        seen.add(building);
        building = art?.gameData?.buildings?.[building]?.BuildingToUpgrade ?? '';
      }
      return false;
    }).length ?? null
  );
}
