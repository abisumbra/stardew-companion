import type { ArtworkData } from '../components/Artwork';
export const tasteNames = ['love', 'like', 'neutral', 'dislike', 'hate'] as const;
export function giftPoints(
  taste: Taste,
  quality: number,
  occasion: 'normal' | 'birthday' | 'winter-star',
  friendshipBook = false,
) {
  const base = { love: 80, like: 45, neutral: 20, dislike: -20, hate: -40 }[taste];
  const q =
    taste === 'love' || taste === 'like' ? ({ 0: 1, 1: 1.1, 2: 1.25, 4: 1.5 }[quality] ?? 1) : 1;
  const event = occasion === 'birthday' ? 8 : occasion === 'winter-star' ? 5 : 1;
  return Math.trunc(base * q * event * (friendshipBook && base > 0 ? 1.1 : 1));
}
export type Taste = (typeof tasteNames)[number];
export const teaPoints = (occasion: 'normal' | 'birthday' | 'winter-star') =>
  occasion === 'normal' ? 250 : 750;
const order: Taste[] = ['love', 'hate', 'like', 'dislike', 'neutral'];
const indexes: Record<Taste, number> = { love: 1, like: 3, dislike: 5, hate: 7, neutral: 9 };
export type GiftResult = {
  id: string;
  name: string;
  taste: Taste;
  reason: string;
  personal: boolean;
};
export function giftRules(raw: string) {
  const parts = raw.split('/');
  return Object.fromEntries(
    tasteNames.map((t) => [t, (parts[indexes[t]] ?? '').split(/\s+/).filter(Boolean)]),
  ) as Record<Taste, string[]>;
}
export function giftTaste(
  item: { id: string; category: number; tags: string[]; price: number; edibility: number },
  personal: Record<Taste, string[]>,
  universal: Record<Taste, string[]>,
): Omit<GiftResult, 'id' | 'name'> {
  const idMatch = (refs: string[]) =>
    refs.some(
      (r) =>
        r === item.id ||
        r === `(O)${item.id}` ||
        r === `(TR)${item.id}` ||
        item.tags.includes(r.toLowerCase()),
    );
  const catMatch = (refs: string[]) => item.category !== 0 && refs.includes(String(item.category));
  let taste: Taste = order.find((t) => catMatch(universal[t])) ?? 'neutral';
  const universalId = order.find((t) => idMatch(universal[t]));
  if (universalId) taste = universalId;
  if (taste === 'neutral' && universalId !== 'neutral') {
    if (item.edibility > -300 && item.edibility < 0) taste = 'hate';
    else if (item.price < 20) taste = 'dislike';
  }
  for (const t of order) {
    if (idMatch(personal[t]) || (catMatch(personal[t]) && !universalId))
      return {
        taste: t,
        personal: true,
        reason: idMatch(personal[t])
          ? 'Personal item / context-tag preference'
          : 'Personal category preference',
      };
  }
  return {
    taste,
    personal: false,
    reason: universalId
      ? 'Universal item / context-tag preference'
      : order.some((t) => catMatch(universal[t]))
        ? 'Universal category preference'
        : 'Default item value / edibility rule',
  };
}
export function allGifts(name: string, art: ArtworkData): GiftResult[] {
  const raw = art.gameData?.giftTastes;
  if (typeof raw?.[name] !== 'string') return [];
  const personal = giftRules(raw[name]);
  const universal = Object.fromEntries(
    tasteNames.map((t) => [
      t,
      String(raw[`Universal_${t[0].toUpperCase() + t.slice(1)}`] ?? '')
        .split(/\s+/)
        .filter(Boolean),
    ]),
  ) as Record<Taste, string[]>;
  return art.items
    .filter((e) => e.kind === 'object' || e.kind === 'trinket')
    .flatMap((e) => {
      const key = e.id.split(':').slice(1).join(':');
      const data = art.gameData?.[e.kind === 'object' ? 'objects' : 'trinkets']?.[key];
      if (!data || data.CanBeGivenAsGift === false) return [];
      const tags = [
        ...(data.ContextTags ?? []).map((t: string) => t.toLowerCase()),
        ...(e.kind === 'trinket' ? ['category_trinket'] : []),
        `item_${String(data.Name ?? e.name)
          .trim()
          .toLowerCase()
          .replace(/ /g, '_')
          .replace(/'/g, '')}`,
        `id_o_${key}`,
      ];
      return [
        {
          id: e.id,
          name: e.name,
          ...giftTaste(
            {
              id: key,
              category: data.Category ?? 0,
              tags,
              price: data.Price ?? 0,
              edibility: data.Edibility ?? -300,
            },
            personal,
            universal,
          ),
        },
      ];
    });
}
