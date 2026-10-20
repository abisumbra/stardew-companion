import type { PlannerState, SaveProfile } from './models';
import type { ArtworkData } from '../components/Artwork';
import type { Task } from './planner';
import { localizedGoalTitle } from './goal-title';
import { translate } from '../lib/locale';
import { entryById } from './knowledge';
export type JournalNote = {
  id: string;
  title: string;
  description: string;
  objective: string;
  tracking?: { mode: 'recipeCrafted'; itemId: string };
};
export type JournalReceipt = {
  backupId: string;
  appliedFingerprint: string;
  originalFingerprint: string;
  saveId: string;
  farmerId: string;
  count: number;
};
// The legacy offline path can only export native recipe events. Live conditions use the connection.
export function offlineJournalNotes(...args: Parameters<typeof journalNotes>): JournalNote[] {
  return journalNotes(...args)
    .filter((n) => n.tracking)
    .map((n) => {
      const entry = entryById.get(n.id)!;
      const title = `${entry.type === 'cooking' ? 'Cook' : 'Craft'} ${entry.name}`.replace(
        /[^\x20-\x7e]/g,
        '',
      );
      return {
        ...n,
        title,
        objective: title,
        description: 'Make this item once. No reward. The game removes this task when completed.',
      };
    });
}
const limit = (s: string, n: number) => Array.from(s).slice(0, n).join('');
export function journalNotes(
  save: SaveProfile,
  state: PlannerState,
  art: ArtworkData,
  tasks: Task[],
  completedGoals: string[],
): JournalNote[] {
  const goals = state.goals
    .filter((id) => !completedGoals.includes(id))
    .map((id) => {
      const steps = tasks.filter((t) => t.goalIds.includes(id) && !t.manualDone);
      const entry = entryById.get(id);
      const recipe = art.recipes[id];
      const output = (recipe?.output ?? (entry?.type === 'cooking' ? `(O)${entry.key}` : undefined))
        ?.replace(/^object:/, '(O)')
        .replace(/^craftable:/, '(BC)');
      const tracked =
        save.gameVersion?.startsWith('1.6.') &&
        Number(save.gameVersion.split('.')[2]) >= 9 &&
        ['cooking', 'crafting'].includes(entry?.type ?? '') &&
        output &&
        /^\((?:O|BC)\)[\w.]+$/.test(output);
      const title = localizedGoalTitle(id, save, art);
      return {
        id,
        title: limit(title, 160),
        description: tracked
          ? translate(
              'Make it once after accepting this task. No reward. The game removes this task when completed.',
            )
          : translate(
              'Follow this goal in Companion. Save after completing the action. This is a reminder; no reward.',
            ),
        objective: limit(
          tracked
            ? title
            : steps.find((t) => t.entryId === id)?.title
              ? translate(steps.find((t) => t.entryId === id)!.title)
              : title,
          180,
        ),
        ...(tracked ? { tracking: { mode: 'recipeCrafted' as const, itemId: output! } } : {}),
      };
    });
  return [
    ...goals,
    ...state.manual
      .filter((t) => !t.done)
      .map((t) => ({
        id: t.id,
        title: limit(t.title, 160),
        description: translate('Personal reminder. Mark it in Companion when finished. No reward.'),
        objective: limit(t.title, 700),
      })),
  ];
}
