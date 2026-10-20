import type { ArtworkData } from '../components/Artwork';
import { spriteKey } from './artwork-identity';
import { knowledge } from './knowledge';
export function auditArtwork(art: ArtworkData) {
  const references = new Map<string, string>();
  for (const e of [...art.items, ...art.characters, ...art.monsters, ...(art.world ?? [])])
    references.set(e.id, e.name);
  for (const e of knowledge.entries) references.set(e.id, e.name);
  for (const [id, r] of Object.entries(art.recipes)) {
    references.set(id, r.name ?? id);
    references.set(r.output, r.output);
    for (const ingredient of r.ingredients) references.set(ingredient.id, ingredient.id);
  }
  for (const [id, crop] of Object.entries(art.gameData?.crops ?? {}))
    references.set(`crop:${id}`, crop.HarvestItemId);
  const issues: { id: string; name: string; reason: string }[] = [],
    unavailable: typeof issues = [];
  let matched = 0;
  for (const [id, name] of references) {
    const target = id.startsWith('crop:')
      ? (art.gameData?.crops?.[id.slice(5)]?.HarvestItemId ?? id)
      : id;
    const resolved = spriteKey(target, art.sprites),
      sprite = art.sprites[resolved],
      sheet = sprite && art.sheets[sprite.sheet];
    if (art.unavailable?.[id] || art.unavailable?.[resolved])
      unavailable.push({ id, name, reason: art.unavailable[id] ?? art.unavailable[resolved] });
    else if (!sprite || !sheet) issues.push({ id, name, reason: 'No matching installed artwork' });
    else if (
      sprite.width <= 0 ||
      sprite.height <= 0 ||
      sprite.x < 0 ||
      sprite.y < 0 ||
      sprite.x + sprite.width > sheet.width ||
      sprite.y + sprite.height > sheet.height
    )
      issues.push({ id, name, reason: 'Artwork coordinates are outside the image' });
    else matched++;
  }
  return { total: references.size, matched, issues, unavailable };
}
