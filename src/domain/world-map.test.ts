import { describe, expect, it } from 'vitest';
import { fishProfiles } from './fishing';
import {
  fishingHighlights,
  focusedMapView,
  mapRegion,
  seasonalSheet,
  showMapLayer,
  type MapLayer,
  type WorldMap,
} from './world-map';
const map: WorldMap = {
  width: 300,
  height: 180,
  layers: [],
  areas: {
    SecretWoods: { x: 20, y: 40, width: 30, height: 20 },
    West: { x: 30, y: 60, width: 40, height: 50 },
  },
  locations: {
    Mines: { x: 180, y: 20, width: 1, height: 1 },
    IslandSouthEastCave: { x: 210, y: 110, width: 2, height: 3 },
  },
};
describe('installed menu maps', () => {
  it('uses the installed region rectangles and distinguishes interior entrances', () => {
    const woods = fishProfiles['fishing:142'].routes.find((r) => r.region === 'woods')!;
    expect(fishingHighlights(map, woods)[0]).toEqual({
      name: 'SecretWoods',
      rect: map.areas.SecretWoods,
      entrance: false,
    });
    const mine = Object.values(fishProfiles)
      .flatMap((p) => p.routes)
      .find((r) => r.region === 'mines')!;
    expect(fishingHighlights(map, mine)[0]).toEqual({
      name: 'Mines',
      rect: map.locations.Mines,
      entrance: true,
    });
    expect(fishingHighlights({ ...map, locations: {} }, mine)).toEqual([]);
  });
  it('uses the separate actual island map, including the Pirate Cove access point', () => {
    const pirate = Object.values(fishProfiles)
      .flatMap((p) => p.routes)
      .find((r) => r.area === 'Pirate Cove')!;
    expect(mapRegion(pirate)).toBe('GingerIsland');
    expect(fishingHighlights(map, pirate)[0].name).toBe('IslandSouthEastCave');
  });
  it('changes seasonal stock atlases and only applies known farm overlays', () => {
    expect(seasonalSheet('LooseSprites/map', 'winter')).toBe('LooseSprites/map_winter');
    expect(seasonalSheet('LooseSprites/map_island', 'winter')).toBe('LooseSprites/map_island');
    const layer = { condition: 'FARM_TYPE Hilltop' } as MapLayer;
    expect(showMapLayer(layer, 'Hill-top')).toBe(true);
    expect(showMapLayer(layer, 'Standard')).toBe(false);
    expect(
      showMapLayer({ condition: 'PLAYER_HAS_MAIL Host Island_Resort' } as MapLayer, 'Standard'),
    ).toBe(false);
  });
  it('keeps focus framing inside the real texture bounds', () => {
    for (const rect of [
      { x: 0, y: 0, width: 1, height: 1 },
      { x: 299, y: 179, width: 1, height: 1 },
      map.areas.SecretWoods,
    ]) {
      const [x, y, w, h] = focusedMapView(map, [rect]).split(' ').map(Number);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(map.width);
      expect(y + h).toBeLessThanOrEqual(map.height);
      expect(w / h).toBeCloseTo(map.width / map.height);
    }
  });
});
