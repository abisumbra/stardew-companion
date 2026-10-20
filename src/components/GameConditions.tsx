import { localize } from '../lib/locale';
import { queryConditions } from '../domain/conditions';
import type { Farmer, SaveProfile } from '../domain/models';
export function GameConditions({
  raw,
  save,
  farmer,
}: {
  raw?: string | null;
  save: SaveProfile | null;
  farmer?: Farmer | null;
}) {
  return localize(
    <ul className="condition-list">
      {queryConditions(raw, save, farmer).map((c, i) => (
        <li key={i}>
          {c.text} ·{' '}
          {c.met === null
            ? 'Check in game'
            : c.met
              ? 'Saved condition met'
              : 'Saved condition not met'}
          {c.text === 'Additional game condition' && (
            <details>
              <summary>Original condition</summary>
              <code>{c.raw}</code>
            </details>
          )}
        </li>
      ))}
    </ul>,
  );
}
