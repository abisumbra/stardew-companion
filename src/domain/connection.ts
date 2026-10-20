import type { ArtworkData } from '../components/Artwork';
import type { PlannerState, SaveProfile } from './models';
import { entryById, knowledge, datable, villagers } from './knowledge';
import { localizedGoalTitle } from './goal-title';
import { translate } from '../lib/locale';
import records from '../../data/achievement-records.json';
export type LiveCondition = {
  source:
    | 'cooked'
    | 'crafting'
    | 'fish'
    | 'shipped'
    | 'friendship'
    | 'skill'
    | 'mail'
    | 'events'
    | 'achievements'
    | 'stats';
  key: string;
  minimum: number;
};
export type LiveGoal = {
  id: string;
  title: string;
  description: string;
  objective: string;
  conditions: LiveCondition[];
};
export function liveConditions(id: string, art: ArtworkData): LiveCondition[] | null {
  if (id.startsWith('friendship:') && villagers.includes(id.slice(11)))
    return [
      { source: 'friendship', key: id.slice(11), minimum: datable.has(id.slice(11)) ? 2000 : 2500 },
    ];
  if (
    id.startsWith('skill:') &&
    ['farming', 'fishing', 'foraging', 'mining', 'combat'].includes(id.slice(6))
  )
    return [{ source: 'skill', key: id.slice(6), minimum: 10 }];
  const entry = entryById.get(id);
  if (entry)
    return [
      {
        source: (
          { cooking: 'cooked', crafting: 'crafting', fishing: 'fish', shipping: 'shipped' } as const
        )[entry.type],
        key:
          entry.type === 'crafting'
            ? (art.recipes[id]?.name ??
              (entry.key === 'Oil of Garlic' ? 'Oil Of Garlic' : entry.key))
            : entry.key,
        minimum: 1,
      },
    ];
  const achievement = knowledge.steam.achievements.find((a) => a.id === id);
  const record =
    achievement && (records.ids as Record<string, string>)[achievement.name.toLowerCase()];
  if (record) return [{ source: 'achievements', key: record, minimum: 1 }];
  return null;
}
export function liveGoals(
  save: SaveProfile,
  state: PlannerState,
  art: ArtworkData,
): { goals: LiveGoal[]; unsupported: string[] } {
  const goals: LiveGoal[] = [],
    unsupported: string[] = [];
  for (const id of state.goals) {
    const conditions = liveConditions(id, art);
    if (!conditions) {
      unsupported.push(id);
      continue;
    }
    const title = localizedGoalTitle(id, save, art);
    goals.push({
      id,
      title: Array.from(title).slice(0, 160).join(''),
      description: translate(
        'The Companion connection removes this task when its action record is complete. No reward.',
      ),
      objective: Array.from(title).slice(0, 160).join(''),
      conditions,
    });
  }
  return {
    goals,
    unsupported: [
      ...unsupported,
      ...state.manual
        .filter(
          (t) =>
            !t.done &&
            (!t.farmerId ||
              t.farmerId ===
                (save.players.find((f) => f.id === state.farmerId)?.id ?? save.players[0].id)),
        )
        .map((t) => t.id),
    ],
  };
}
