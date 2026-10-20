import type { ArtworkData } from '../components/Artwork';
import type { SaveProfile } from './models';
import { entryById, knowledge, stardrops } from './knowledge';
import { bundleProgress, walnutProgress, museumProgress } from './completion';
import { itemName } from './installed';
export function objectiveEvidence(id: string, save: SaveProfile | null, art: ArtworkData) {
  const [type, key, ...questParts] = id.split(':'),
    questKey = questParts.join(':');
  const source = (
    {
      bundle: 'wiki-bundles',
      walnut: 'wiki-walnut',
      museum: 'wiki-museum',
      quest: 'wiki-quests',
    } as Record<string, string>
  )[type];
  if (!source) return null;
  const done = !save
    ? null
    : type === 'bundle'
      ? (bundleProgress(save, art).find((b) => b.id === key)?.done ?? null)
      : type === 'walnut'
        ? (walnutProgress(save).find((w) => w.id === key)?.done ?? null)
        : type === 'museum'
          ? (museumProgress(save, art).find((m) => m.id === key)?.done ?? null)
          : (save.players.find((f) => f.id === key)?.quests?.find((q) => q.id === questKey)
              ?.completed ?? null);
  return {
    done,
    source,
    reason:
      done === null
        ? 'The required saved section is unavailable; verify this objective in game.'
        : type === 'quest'
          ? 'Completion flag in this farmer’s saved quest journal.'
          : type === 'walnut'
            ? 'Saved Golden Walnut reward markers and limited-drop counters.'
            : type === 'museum'
              ? 'Item identity in the saved museum display.'
              : 'Saved bundle offering flags, evaluated against its required donation count.',
  };
}
export function goalLabel(id: string, save: SaveProfile | null, art: ArtworkData) {
  const entry = entryById.get(id);
  if (entry) return entry.name;
  const achievement = knowledge.steam.achievements.find((a) => a.id === id);
  if (achievement) return achievement.name;
  const [type, ...parts] = id.split(':'),
    key = parts.join(':');
  if (type === 'quest')
    return (
      save?.players
        .find((f) => f.id === parts[0])
        ?.quests?.find((q) => q.id === parts.slice(1).join(':'))?.title ||
      `Quest ${parts.slice(1).join(':')}`
    );
  if (type === 'bundle' && save)
    return bundleProgress(save, art).find((b) => b.id === key)?.name ?? `Bundle ${key}`;
  if (type === 'walnut' && save)
    return walnutProgress(save).find((w) => w.id === key)?.name ?? 'Golden Walnut';
  if (type === 'museum') return `Museum: ${itemName(key, art)}`;
  if (type === 'stardrop') return stardrops.find((s) => s.id === key)?.name ?? 'Stardrop';
  if (type === 'building') return art.gameData?.buildings?.[key]?.Name ?? key;
  return key.replaceAll('_', ' ');
}
