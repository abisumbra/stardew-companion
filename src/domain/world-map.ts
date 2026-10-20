import type { FishRoute } from './fishing';
import type { Season } from './models';

export interface MapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface MapLayer {
  sheet: string;
  source: MapRect;
  area: MapRect;
  condition: string | null;
}
export interface WorldMap {
  width: number;
  height: number;
  layers: MapLayer[];
  areas: Record<string, MapRect>;
  locations: Record<string, MapRect>;
}
export const mapRegion = (route: FishRoute) =>
  route.region === 'island' ? 'GingerIsland' : 'Valley';
export function seasonalSheet(sheet: string, season: Season) {
  return season !== 'spring' &&
    ['LooseSprites/map', 'LooseSprites/Farm_ranching_map'].includes(sheet)
    ? `${sheet}_${season}`
    : sheet;
}
// Evaluate only the stock farm-type choices. Other game-state queries require live game context.
export function showMapLayer(layer: MapLayer, farmType?: string) {
  if (!layer.condition) return true;
  const farm = layer.condition.match(/^FARM_TYPE (\w+)$/)?.[1];
  return !!farm && farm === farmType?.replace(/[\s-]/g, '');
}
export function fishingHighlights(map: WorldMap, route: FishRoute) {
  let areas: string[] = [],
    locations: string[] = [],
    entrance = false;
  switch (route.region) {
    case 'ocean':
      areas = ['Beach'];
      break;
    case 'town':
      areas = ['Town'];
      break;
    case 'forest':
      areas = ['Forest'];
      break;
    case 'mountain':
      areas = ['Mountain'];
      break;
    case 'woods':
      areas = ['SecretWoods'];
      break;
    case 'desert':
      areas = ['Desert'];
      break;
    case 'mines':
      locations = ['Mines'];
      entrance = true;
      break;
    case 'swamp':
      locations = ['WitchSwamp'];
      entrance = true;
      break;
    case 'sewers':
      locations = [/Bug|Slimejack/i.test(route.area) ? 'BugLand' : 'Sewer'];
      entrance = true;
      break;
    case 'night-market':
      locations = ['Submarine'];
      entrance = true;
      break;
    case 'island':
      if (/Caldera/i.test(route.area)) {
        locations = ['Caldera'];
        entrance = true;
      } else if (/Pirate Cove/i.test(route.area)) {
        locations = ['IslandSouthEastCave'];
        entrance = true;
      } else if (/freshwater/i.test(route.area)) areas = ['North', 'West'];
      else areas = /South/i.test(route.area) ? ['West', 'South', 'SouthEast'] : ['West'];
  }
  return [
    ...areas.flatMap((name) =>
      map.areas[name] ? [{ name, rect: map.areas[name], entrance }] : [],
    ),
    ...locations.flatMap((name) =>
      map.locations[name] ? [{ name, rect: map.locations[name], entrance }] : [],
    ),
  ];
}
export function focusedMapView(map: WorldMap, rectangles: MapRect[]) {
  if (!rectangles.length) return `0 0 ${map.width} ${map.height}`;
  const left = Math.min(...rectangles.map((r) => r.x)),
    top = Math.min(...rectangles.map((r) => r.y));
  const right = Math.max(...rectangles.map((r) => r.x + r.width)),
    bottom = Math.max(...rectangles.map((r) => r.y + r.height));
  const width = Math.min(
    map.width,
    Math.max(100, right - left + 35, ((bottom - top + 30) * map.width) / map.height),
  );
  const height = Math.min(map.height, (width * map.height) / map.width);
  const x = Math.max(0, Math.min(map.width - width, (left + right - width) / 2));
  const y = Math.max(0, Math.min(map.height - height, (top + bottom - height) / 2));
  return `${x} ${y} ${width} ${height}`;
}
