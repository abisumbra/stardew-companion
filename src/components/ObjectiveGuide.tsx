import { localize } from '../lib/locale';
import type { SaveProfile, PlannerState } from '../domain/models';
import {
  bundleProgress,
  walnutProgress,
  remainingOfferings,
  museumProgress,
} from '../domain/completion';
import { detectedSupply, selectedFarmer } from '../domain/supplies';
import { itemName } from '../domain/installed';
import { Sprite, useArtwork } from './Artwork';
import { TileMapViewer } from './TileMapViewer';
export function ObjectiveGuide({
  id,
  save,
  planner,
  onChange,
}: {
  id: string;
  save: SaveProfile;
  planner: PlannerState;
  onChange: (s: PlannerState) => void;
}) {
  const { data: art } = useArtwork();
  const f = selectedFarmer(save, planner.farmerId);
  if (id.startsWith('bundle:')) {
    const b = bundleProgress(save, art).find((b) => b.id === id.slice(7));
    if (!b) return null;
    const choices = remainingOfferings(b, planner.bundleChoices[b.id] ?? []),
      needed = Math.max(0, b.required - b.current);
    return localize(
      <section>
        <h3>Community Center offerings</h3>
        <p>
          {b.room} · {b.current} / {b.required}
        </p>
        <p>Choose {needed} remaining offering(s) to plan.</p>
        {b.items.map((i) => {
          const stock = detectedSupply(save, f, i.id, art, i.quality);
          return (
            <label className="bundle-offering" key={i.index}>
              <input
                type="checkbox"
                checked={i.done === true || choices.includes(i.index)}
                disabled={
                  i.done === true || (!choices.includes(i.index) && choices.length >= needed)
                }
                onChange={(e) =>
                  onChange({
                    ...planner,
                    bundleChoices: {
                      ...planner.bundleChoices,
                      [b.id]: e.target.checked
                        ? [...choices, i.index]
                        : choices.filter((n) => n !== i.index),
                    },
                  })
                }
              />
              <Sprite id={i.id} size={28} decorative />
              <span>
                {i.quantity} × {i.id === '-1' ? 'Gold' : itemName(i.id, art)}
                <small>
                  {i.quality > 0
                    ? `${i.quality === 2 ? 'Gold' : i.quality === 1 ? 'Silver' : 'Iridium'} or better`
                    : 'Any quality'}{' '}
                  · {i.done ? 'Donated' : `${stock.count}${stock.known ? '' : '+'} detected`}
                </small>
              </span>
            </label>
          );
        })}
      </section>,
    );
  }
  if (id.startsWith('walnut:')) {
    const w = walnutProgress(save).find((w) => w.id === id.slice(7));
    if (!w) return null;
    return localize(
      <section>
        <h3>Golden Walnut location</h3>
        <p>
          {w.recorded ?? 'Unknown'} / {w.count}
        </p>
        <p>{w.hint || w.name}</p>
        {w.location && w.tile && (
          <TileMapViewer
            locations={[w.location]}
            target={w.tile as [number, number]}
            save={save}
            season={save.season}
          />
        )}
      </section>,
    );
  }
  if (id.startsWith('quest:')) {
    const [, owner, ...parts] = id.split(':'),
      key = parts.join(':'),
      q = save.players.find((p) => p.id === owner)?.quests?.find((q) => q.id === key);
    return localize(
      <section>
        <h3>Saved quest journal</h3>
        <p>
          {q?.description ?? 'This quest is no longer in the saved journal; completion is unknown.'}
        </p>
        <p>{q?.objective}</p>
        {q?.daysLeft !== null && q?.daysLeft !== undefined && q.daysLeft > 0 && (
          <p>{q.daysLeft} day(s) remaining.</p>
        )}
        <p>
          {q?.completed ? 'Completed in journal' : 'Only the saved journal is used as evidence.'}
        </p>
      </section>,
    );
  }
  if (id.startsWith('museum:')) {
    const m = museumProgress(save, art).find((m) => m.id === id.slice(7));
    return localize(
      <section>
        <h3>Museum donation</h3>
        <Sprite id={id.slice(7)} size={48} decorative />
        <p>
          {m?.done ? 'Donated' : 'Bring this item to Gunther and place it in the museum display.'}
        </p>
      </section>,
    );
  }
  return null;
}
