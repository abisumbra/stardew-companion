import type { ArtworkData } from '../components/Artwork';
import { catalogItemId } from './item-identity';
type SpriteRect = ArtworkData['sprites'][string];
const ingredientGroups: Record<string, string> = {
  milk: '184',
  egg: '176',
  '-6': '184',
  '-5': '176',
  '-4': '145',
  '-75': '24',
  '-80': '296',
  '-777': '495',
};
export function spriteKey(id: string, sprites: Record<string, SpriteRect>): string {
  if (id.startsWith('quality:')) return spriteKey(id.split(':').slice(2).join(':'), sprites);
  if (sprites[id]) return id;
  const canonical=catalogItemId(id);if(canonical!==id)return spriteKey(canonical,sprites);
  if (id.startsWith('museum:')) return spriteKey(id.slice(7), sprites);
  if (id.startsWith('walnut:')) return 'category:walnuts';
  if (id.startsWith('stardrop:')) return 'category:stardrops';
  if (id.startsWith('walnuts:')) return 'category:walnuts';
  const skills: Record<string, string> = {
    farming: 'IridiumHoe',
    fishing: 'IridiumRod',
    foraging: 'IridiumAxe',
    mining: 'IridiumPickaxe',
    combat: 'IridiumScythe',
  };
  if (id.startsWith('skill:')) return `tool:${skills[id.slice(6)] ?? 'IridiumHoe'}`;
  return `object:${ingredientGroups[id] ?? id}`;
}
