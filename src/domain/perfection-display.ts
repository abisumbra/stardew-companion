import type { Criterion, ProgressItem } from './progress';
export type CompletionFilter = 'all' | 'incomplete' | 'complete' | 'unknown';
export const matchesCompletion = (item: ProgressItem, filter: CompletionFilter) =>
  matchesStatus(item.done, filter);
export const matchesStatus = (done: boolean | null, filter: CompletionFilter) =>
  filter === 'all' ||
  (filter === 'complete' ? done === true : filter === 'unknown' ? done === null : done === false);
export function completionLabel(item: ProgressItem, category: string) {
  if (item.done === null) return 'Progress unknown';
  if (item.done)
    return (
      (
        {
          cooking: 'Cooked at least once',
          crafting: 'Crafted at least once',
          shipping: 'Shipped at least once',
          fishing: 'Caught at least once',
        } as Record<string, string>
      )[category] ?? 'Confirmed complete'
    );
  return (
    (
      {
        cooking: 'Not cooked yet',
        crafting: 'Not crafted yet',
        shipping: 'Not shipped yet',
        fishing: 'Not caught yet',
      } as Record<string, string>
    )[category] ?? 'Incomplete'
  );
}
export function completionHint(item: ProgressItem, category: string) {
  if (item.done === null)
    return 'The save does not provide enough evidence. No completion is assumed.';
  if (item.done) return 'Confirmed by the saved game record.';
  if (['cooking', 'crafting'].includes(category))
    return item.known === true
      ? 'The recipe is learned. Complete the action once and save overnight.'
      : item.known === false
        ? 'Learn the recipe, gather its ingredients and complete it once.'
        : 'Recipe knowledge is unknown. Check the recipe and complete the action in game.';
  return (
    (
      {
        shipping: 'Send this item through the shipping bin; shop sales do not count.',
        fishing: 'Catch this fish yourself; buying or receiving it does not count.',
        friendship: 'Reach the displayed friendship target with this character.',
        monsters: 'Finish this entire kill target; owning the reward is not evidence.',
        stardrops: 'Collect and consume this Stardrop; follow its specific source guide.',
        obelisks: 'Construct this obelisk on the farm.',
        clock: 'Construct the Gold Clock on the farm.',
        skills: 'Raise the permanent skill to the required level.',
        walnuts: 'Collect the remaining walnuts; the wallet balance is not the found total.',
      } as Record<string, string>
    )[category] ?? 'Open the guide for the remaining steps.'
  );
}
export const criterionCounts = (criterion: Criterion) => ({
  complete: criterion.items.filter((i) => i.done === true).length,
  incomplete: criterion.items.filter((i) => i.done === false).length,
  unknown: criterion.items.filter((i) => i.done === null).length,
});
