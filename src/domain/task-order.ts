import type { PlannerState } from './models';

export function compareTaskPriority(
  a: { goalIds: string[] },
  b: { goalIds: string[] },
  state: PlannerState,
) {
  const ranks = { high: 0, normal: 1, low: 2 };
  const pinned = (t: typeof a) => Number(t.goalIds.some((id) => state.pinned.includes(id)));
  const rank = (t: typeof a) =>
    Math.min(2, ...t.goalIds.map((id) => ranks[state.priorities[id] ?? 'normal']));
  return pinned(b) - pinned(a) || rank(a) - rank(b);
}
