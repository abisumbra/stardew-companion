import type { ArtworkData, Recipe } from '../components/Artwork';
import { itemId } from './installed';
// Only deterministic, explicit input/output rules enter the automatic material graph.
// Random outputs, context-tag inputs, custom methods and conditional modifiers stay in the guide.
export function processingRecipes(art: ArtworkData): Recipe[] {
  const recipes: Recipe[] = [];
  for (const [machineId, machine] of Object.entries(art.gameData?.machines ?? {})) {
    for (const rule of machine.OutputRules ?? []) {
      if (rule.OutputItem?.length !== 1 || rule.RecalculateOnCollect) continue;
      const o = rule.OutputItem[0],
        trigger = rule.Triggers?.find(
          (t: any) =>
            t.Trigger === 1 &&
            t.RequiredItemId?.startsWith('(O)') &&
            !t.Condition &&
            !t.RequiredTags?.length,
        );
      if (
        !trigger ||
        !o.ItemId?.startsWith('(O)') ||
        o.Condition ||
        o.PerItemCondition ||
        o.OutputMethod ||
        o.RandomItemId?.length ||
        o.StackModifiers?.length ||
        machine.ReadyTimeModifiers?.length ||
        (o.MaxStack > 0 && o.MaxStack !== Math.max(1, o.MinStack))
      )
        continue;
      const ingredients = [
        { id: itemId(trigger.RequiredItemId), quantity: trigger.RequiredCount ?? 1 },
        ...(machine.AdditionalConsumedItems ?? []).map((i: any) => ({
          id: itemId(i.ItemId),
          quantity: i.RequiredCount,
        })),
      ];
      if (ingredients.some((i) => !i.id || i.quantity <= 0)) continue;
      recipes.push({
        name: art.items.find((i) => itemId(i.id) === itemId(machineId))?.name ?? itemId(machineId),
        machineId: itemId(machineId),
        kind: 'machine',
        output: itemId(o.ItemId),
        quantity: Math.max(1, o.MinStack ?? 1),
        ingredients,
      });
    }
  }
  return recipes;
}
