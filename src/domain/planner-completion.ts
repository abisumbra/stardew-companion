import type { PlannerState, SaveProfile } from './models';
import { selectedFarmer } from './supplies';
// Saved evidence is separate from manual checkmarks and from the in-game reminder.
export function reconcileGoalReceipts(
  save: SaveProfile,
  state: PlannerState,
  completed: string[],
): PlannerState {
  if (save.warnings.some((w) => w.startsWith('Latest read failed'))) return state;
  const farmer = selectedFarmer(save, state.farmerId),
    old = state.goalReceipts[farmer.id] ?? {},
    current = new Set(completed);
  const next = { ...old };
  let changed = false;
  for (const id of state.goals) {
    if (current.has(id) && !next[id]) {
      next[id] = {
        fingerprint: save.fingerprint,
        detectedAt: save.syncedAt,
        year: save.year,
        season: save.season,
        day: save.day,
      };
      changed = true;
    } else if (!current.has(id) && next[id]) {
      delete next[id];
      changed = true;
    }
  }
  return changed ? { ...state, goalReceipts: { ...state.goalReceipts, [farmer.id]: next } } : state;
}
