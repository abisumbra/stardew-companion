import type { ArtworkData } from '../components/Artwork';
import type { SaveProfile } from './models';
import { selectedFarmer } from './supplies';
import { entryById, versionFamily } from './knowledge';
import { fishProfiles } from './fishing';
export const qualityLevels = [
  { id: 0, name: 'Normal', factor: 1 },
  { id: 1, name: 'Silver', factor: 1.25 },
  { id: 2, name: 'Gold', factor: 1.5 },
  { id: 4, name: 'Iridium', factor: 2 },
] as const;
export function pricedItemId(id: string, art: ArtworkData): string {
  if (id.startsWith('crop:'))
    return pricedItemId(art.gameData?.crops?.[id.slice(5)]?.HarvestItemId ?? '', art);
  const recipe = art.recipes[id];
  if (recipe) return pricedItemId(recipe.output, art);
  if (/^(cooking|fishing|shipping):/.test(id))
    return 'object:' + (entryById.get(id)?.key ?? id.split(':')[1]);
  return id
    .replace(/^\(O\)/, 'object:')
    .replace(/^\(BC\)/, 'craftable:')
    .replace(/^\(W\)/, 'weapon:')
    .replace(/^\(B\)/, 'boots:')
    .replace(/^\(TR\)/, 'trinket:')
    .replace(/^\(S\)/, 'shirt:')
    .replace(/^\(P\)/, 'pants:')
    .replace(/^\(H\)/, 'hat:')
    .replace(/^\(F\)/, 'furniture:');
}
export function productInputs(id: string, art: ArtworkData) {
  const key = pricedItemId(id, art).slice(7);
  const kind = ['348', '344', 'DriedFruit'].includes(key)
    ? 'fruit'
    : ['350', '342'].includes(key)
      ? 'vegetable'
      : key === 'SmokedFish' || key === '812' || key === '447'
        ? 'fish'
        : key === '340'
          ? 'flower'
          : key === 'DriedMushrooms'
            ? 'mushroom'
            : null;
  return kind
    ? Object.entries(art.gameData?.objects ?? {})
        .filter(
          ([id, o]) =>
            o.Price > 0 &&
            (key !== 'DriedFruit' || id !== '398') &&
            (kind === 'fruit'
              ? o.Category === -79
              : kind === 'vegetable'
                ? o.Category === -75
                : kind === 'fish'
                  ? o.Category === -4 && (key !== '447' || id !== '698')
                  : kind === 'flower'
                    ? o.Category === -80
                    : /mushroom|morel|chanterelle|magma cap/i.test(o.Name)),
        )
        .map(([id, o]) => ({ id, name: o.DisplayName ?? o.Name, base: o.Price }))
    : [];
}
export function itemPriceReference(id: string, art: ArtworkData, inputId?: string) {
  const resolved = pricedItemId(id, art),
    [kind, ...rest] = resolved.split(':'),
    key = rest.join(':');
  let base: number | null = null,
    quality = false,
    object: any = null,
    reason = '',
    qualityIds: number[] = [0];
  if (kind === 'object') {
    object = art.gameData?.objects?.[key];
    base = typeof object?.Price === 'number' ? object.Price : null;
    if (base !== null && object?.Category === -96) base = Math.trunc(base / 2);
    quality = Boolean(
      object &&
      ([-4, -5, -6, -18, -75, -79, -80, -81].includes(object.Category) ||
        ['433', '430', '424', '426', '348', '346', '303', '459', '306', 'SmokedFish'].includes(
          key,
        )),
    );
    qualityIds = quality ? [0, 1, 2, 4] : [0];
    if (
      fishProfiles[`fishing:${key}`]?.method === 'crab-pot' &&
      !['372', '718', '719', '723'].includes(key)
    )
      qualityIds = [0];
    if (
      object?.Category === -7 &&
      Object.values(art.recipes).some(
        (r) => r.kind === 'cooking' && pricedItemId(r.output, art) === resolved,
      )
    )
      qualityIds = [0, 2];
    if (object?.Category === -22) reason = 'Full durability; used tackle sells for less.';
    if (
      [
        '342',
        '344',
        '348',
        '350',
        '447',
        '812',
        'Roe',
        'AgedRoe',
        'SmokedFish',
        'DriedFruit',
        'DriedMushrooms',
        '340',
      ].includes(key)
    )
      reason = 'The input ingredient changes this product’s price.';
  } else if (kind === 'craftable') base = art.gameData?.bigCraftables?.[key]?.Price ?? null;
  else if (kind === 'boots') {
    const p = String(art.gameData?.boots?.[key] ?? '').split('/');
    base = p.length >= 5 ? (Number(p[3]) + Number(p[4])) * 50 : null;
  } else if (kind === 'weapon') {
    const w = art.gameData?.weapons?.[key];
    if (w) {
      const damage = Math.trunc((w.MinDamage + w.MaxDamage) / 2);
      let points = Math.trunc(
        damage * (1 + 0.03 * (Math.max(0, w.Speed) + (w.Type === 1 ? 15 : 0))),
      );
      points += Math.trunc(
        Math.trunc(w.Precision / 2) +
          w.Defense +
          (w.CritChance - 0.02) * 200 +
          Math.fround(Math.fround(w.CritMultiplier - 3) * 6),
      );
      points += key === '2' ? 20 : key === '3' ? 15 : 0;
      points += w.Defense * 2;
      base = Math.trunc(Math.fround(Math.fround(points / 7) + 1)) * 50;
      reason = 'Unmodified weapon; forging and enchantments can change the value.';
    }
    if (['47', '53', '66'].includes(key)) {
      base = null;
      reason = 'This item is not normally sold to shops.';
    }
  } else if (kind === 'trinket') base = 1000;
  else if (['shirt', 'pants'].includes(kind)) {
    base = art.gameData?.[kind === 'shirt' ? 'shirts' : 'pants']?.[key]?.Price ?? null;
    base = base === null ? null : Math.trunc(base / 2);
    reason = 'Reference resale value; check whether a shop accepts this item.';
  } else if (kind === 'furniture') {
    const p = String(art.gameData?.furniture?.[key] ?? '').split('/');
    base = p.length > 5 ? Number(p[5]) : null;
    reason = 'Reference resale value; check whether a shop accepts this item.';
  } else if (['hat', 'tool'].includes(kind)) reason = 'This item is not normally sold to shops.';
  if (base !== null && (!Number.isFinite(base) || base < 0)) {
    base = null;
    reason = 'This item is not normally sold to shops.';
  }
  const inputs = productInputs(resolved, art),
    input = inputs.find((i) => i.id === inputId);
  if (inputs.length && key !== '340' && !input) {
    base = null;
    reason = 'Choose the input ingredient to calculate this product’s sell price.';
  }
  if (input) {
    const raw = input.base,
      roe = Math.trunc(30 + raw / 2);
    base =
      key === '348'
        ? raw * 3
        : key === '350'
          ? Math.trunc(raw * 2.25)
          : key === '344' || key === '342'
            ? raw * 2 + 50
            : key === 'SmokedFish'
              ? raw * 2
              : key === 'DriedFruit' || key === 'DriedMushrooms'
                ? Math.trunc(raw * 7.5 + 25)
                : key === '340'
                  ? 100 + raw * 2
                  : key === '812'
                    ? roe
                    : key === '447'
                      ? roe * 2
                      : base;
    reason = 'The price uses the selected input ingredient.';
  }
  return { id: resolved, key, kind, base, quality, qualityIds, object, reason, inputs };
}
export function itemPrices(
  id: string,
  art: ArtworkData,
  save: SaveProfile | null,
  farmerId?: string | null,
  inputId?: string,
) {
  const ref = itemPriceReference(id, art, inputId),
    farmer = save ? selectedFarmer(save, farmerId) : null;
  const p = farmer?.professions,
    margin = save?.profitMargin ?? null;
  let multiplier = 1;
  const modifiers: string[] = [];
  const apply = (active: boolean, factor: number, label: string) => {
    if (active) {
      multiplier = Math.fround(multiplier * factor);
      modifiers.push(label);
    }
  };
  const category = ref.object?.Category,
    name = String(ref.object?.Name ?? '').toLowerCase();
  if (p && ref.kind === 'object' && category !== -22) {
    apply(
      p.includes(0) &&
        (/mayonnaise|cheese|cloth|wool/.test(name) || [-5, -6, -18].includes(category)),
      1.2,
      'Rancher',
    );
    apply(p.includes(1) && [-75, -80, -79].includes(category), 1.1, 'Tiller');
    apply(p.includes(4) && category === -26, 1.4, 'Artisan');
    apply(
      p.includes(6) && (category === -4 || ref.key === 'SmokedFish'),
      p.includes(8) ? 1.5 : 1.25,
      p.includes(8) ? 'Angler' : 'Fisher',
    );
    apply(p.includes(15) && category === -27, 1.25, 'Tapper');
    apply(
      p.includes(20) && ['334', '335', '336', '337', '910'].includes(ref.key),
      1.5,
      'Blacksmith',
    );
    apply(p.includes(23) && [-2, -12].includes(category), 1.3, 'Gemologist');
    apply(
      Boolean(farmer?.events?.includes('2120303')) && ['296', '410'].includes(ref.key),
      3,
      'Bear’s Knowledge',
    );
    apply(
      Boolean(farmer?.events?.includes('3910979')) && ref.key === '399',
      5,
      'Spring Onion Mastery',
    );
    apply(
      Boolean((farmer?.booksRead?.Book_Artifact ?? farmer?.stats.Book_Artifact ?? 0) > 0) &&
        ref.object?.Type === 'Arch',
      3,
      'Treasure Appraisal Guide',
    );
  }
  const supported = !save || versionFamily(save.gameVersion) === '1.6';
  const usesMargin =
    ['object', 'craftable', 'furniture'].includes(ref.kind) && category !== -96 && category !== -22;
  const adjustedKnown = Boolean(
    supported &&
    !(ref.object?.Type === 'Arch' && farmer?.booksRead === null && !farmer?.statsKnown) &&
    !(['296', '410', '399'].includes(ref.key) && farmer?.events === null) &&
    ref.base !== null &&
    ((!usesMargin && farmer) || (farmer && p !== null && margin !== null)),
  );
  const rows = qualityLevels.map((q) => {
    const available = ref.qualityIds.includes(q.id);
    let normal =
      ref.base === null || !available
        ? null
        : Math.trunc(Math.fround(ref.base * Math.fround(q.factor)));
    if (normal !== null && ref.key === '493') normal = Math.trunc(normal / 2);
    let adjusted: number | null = null;
    if (normal !== null && adjustedKnown) {
      let price = Math.fround(normal * multiplier);
      if (usesMargin && price > 0) price = Math.max(1, Math.fround(price * Math.fround(margin!)));
      adjusted = Math.trunc(price);
    }
    return { ...q, available, base: normal, adjusted };
  });
  return { ...ref, rows, modifiers, margin, adjustedKnown, supported };
}
