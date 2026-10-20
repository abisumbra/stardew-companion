import walnutData from '../../data/walnuts.json';
import type { ArtworkData } from '../components/Artwork';
import type { SaveProfile } from './models';
import { itemId, itemName } from './installed';
export const walnutEntries = walnutData.entries;
export function walnutProgress(save: SaveProfile) {
  const e = save.completion;
  return walnutEntries.map((w) => {
    const recorded =
      w.method === 'marker'
        ? e?.collectedNuts === null || !e
          ? null
          : e.collectedNuts?.includes(w.id)
            ? w.count
            : 0
        : w.method === 'coconut'
          ? e?.goldenCoconutCracked === null || !e
            ? null
            : e.goldenCoconutCracked
              ? 1
              : 0
          : e?.limitedNuts === null || !e
            ? null
            : Math.min(w.count, e.limitedNuts?.[w.id] ?? 0);
    const match = w.id.match(/^(?:Bush|Buried)_(.+)_(\d+)_(\d+)$/);
    return {
      ...w,
      recorded,
      done: recorded === null ? null : recorded >= w.count,
      location: match?.[1] ?? null,
      tile: match ? [Number(match[2]), Number(match[3])] : null,
    };
  });
}
export function museumProgress(save: SaveProfile, art: ArtworkData) {
  const donated = save.completion?.museum;
  return Object.entries(art.gameData?.objects ?? {})
    .filter(([, v]) => v.Type === 'Arch' || v.Type === 'Minerals')
    .map(([id]) => ({
      id,
      name: itemName(id, art),
      done: donated === null || donated === undefined ? null : donated.includes(id),
    }));
}
export function bundleProgress(save: SaveProfile, art: ArtworkData) {
  const definitions = save.completion?.bundleDefinitions ?? art.gameData?.bundles ?? {};
  return Object.entries(definitions).map(([key, text]) => {
    const p = String(text).split('/'),
      id = key.split('/')[1],
      donated = save.completion?.bundles?.[id];
    const raw = (p[2] ?? '').split(/\s+/),
      items = [];
    for (let i = 0; i + 2 < raw.length; i += 3)
      items.push({
        id: itemId(raw[i]),
        quantity: Number(raw[i + 1]),
        quality: Number(raw[i + 2]),
        done: donated ? (donated[i / 3] ?? false) : null,
        index: i / 3,
      });
    const required = Number(p[4]) || items.length,
      current = items.filter((i) => i.done).length;
    return {
      id,
      key,
      name: p[0],
      room: key.split('/')[0],
      required,
      current,
      items,
      done: donated ? current >= required : null,
      fromSave: !!save.completion?.bundleDefinitions,
    };
  });
}
export function storyRoute(save: SaveProfile) {
  const mail = save.players[0].mail;
  return mail === null
    ? 'Unknown'
    : mail.includes('JojaMember')
      ? 'Joja'
      : mail.includes('ccIsComplete')
        ? 'Community Center restored'
        : 'Community Center / undecided';
}
export function remainingOfferings(
  bundle: ReturnType<typeof bundleProgress>[number],
  choices: number[],
) {
  return [...new Set(choices)]
    .filter((index) => bundle.items.some((i) => i.index === index && i.done !== true))
    .slice(0, Math.max(0, bundle.required - bundle.current));
}
