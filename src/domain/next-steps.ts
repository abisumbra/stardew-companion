import type { Task } from './planner';
import type { PlannerState } from './models';
import { compareTaskPriority } from './task-order';
export function taskBrief(task: Task) {
  if (task.title.startsWith('Cook ')) return 'Cook this dish once using a kitchen or Cookout Kit.';
  if (task.title.startsWith('Craft ')) return 'Craft this item once using its recipe.';
  if (task.title.startsWith('Gather ')) return 'Gather the missing quantity shown in Materials.';
  if (task.title.startsWith('Learn '))
    return 'Check the recipe source and meet its unlock conditions.';
  return task.reason.split(/(?<=[.!?])\s+/)[0];
}
export function nextActions(tasks: Task[], state: PlannerState, limit = 3) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const pending = tasks
    .filter((t) => !t.manualDone)
    .sort((a, b) => compareTaskPriority(a, b, state));
  const ready = pending.filter((t) =>
    t.dependencies.every((id) => !byId.has(id) || byId.get(id)?.manualDone),
  );
  return (ready.length ? ready : pending).slice(0, limit);
}
