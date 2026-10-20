import { localize } from '../lib/locale';
import { Sprite, useArtwork } from './Artwork';
import { itemId, itemName, conditionText } from '../domain/installed';
export function MachineGuide({ id }: { id: string }) {
  const { data: art } = useArtwork();
  const recipe = art.recipes[id],
    key = itemId(recipe?.output ?? id),
    machine = art.gameData?.machines?.[`(BC)${key.replace('craftable:', '')}`];
  if (!machine) return null;
  return localize(
    <section className="machine-guide">
      <h3>Processing recipes</h3>
      <p>
        Rules come from the installed game. Conditional or random outputs remain explicit; the
        material planner only expands deterministic recipes.
      </p>
      {(machine.AdditionalConsumedItems ?? []).length > 0 && (
        <p>
          Fuel per operation:{' '}
          {machine.AdditionalConsumedItems.map(
            (i: any) => `${i.RequiredCount} × ${itemName(i.ItemId, art)}`,
          ).join(' · ')}
        </p>
      )}
      {machine.OutputRules?.map((r: any, i: number) => (
        <details key={i}>
          <summary>
            {r.Id} ·{' '}
            {r.DaysUntilReady > 0
              ? `${r.DaysUntilReady} day(s)`
              : r.MinutesUntilReady >= 0
                ? `${r.MinutesUntilReady} game minutes`
                : 'Variable time'}
          </summary>
          <h4>Input</h4>
          {r.Triggers?.map((t: any, j: number) => (
            <p key={j}>
              {t.RequiredItemId && <Sprite id={t.RequiredItemId} size={24} decorative />}{' '}
              {t.RequiredCount} ×{' '}
              {t.RequiredItemId
                ? itemName(t.RequiredItemId, art)
                : (t.RequiredTags?.join(' / ') ?? 'Special trigger')}{' '}
              · {conditionText(t.Condition)}
            </p>
          ))}
          <h4>Possible outputs</h4>
          {r.OutputItem?.map((o: any, j: number) => (
            <p key={j}>
              {o.ItemId && <Sprite id={o.ItemId} size={24} decorative />}{' '}
              {o.ItemId
                ? itemName(o.ItemId, art)
                : (o.RandomItemId?.map((v: string) => itemName(v, art)).join(' / ') ??
                  'Derived from input / game rule')}{' '}
              · {o.MinStack > 0 ? o.MinStack : 1}
              {o.MaxStack > 0 && o.MaxStack !== o.MinStack ? `–${o.MaxStack}` : ''} ·{' '}
              {conditionText(o.Condition)}
              {o.OutputMethod && ' · Special game processing rule'}
            </p>
          ))}
        </details>
      ))}
    </section>,
  );
}
