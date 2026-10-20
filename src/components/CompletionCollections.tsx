import { localize, translate } from '../lib/locale';
import { useState } from 'react';
import type { SaveProfile, PlannerState } from '../domain/models';
import { Sprite, useArtwork } from './Artwork';
import {
  bundleProgress,
  museumProgress,
  walnutProgress,
  storyRoute,
  remainingOfferings,
} from '../domain/completion';
import { itemName } from '../domain/installed';
import { Tag, Sources } from './common';
import { TileMapViewer } from './TileMapViewer';
import { CompletionFilter } from './CompletionFilter';
import { matchesStatus, type CompletionFilter as Status } from '../domain/perfection-display';
export function CompletionCollections({
  save,
  planner,
  onChange,
  onAdd,
  onDetail,
  onError,
}: {
  save: SaveProfile;
  planner: PlannerState;
  onChange: (s: PlannerState) => void;
  onAdd: (id: string) => void;
  onDetail: (id: string) => void;
  onError: (e: unknown) => void;
}) {
  const { data: art } = useArtwork();
  const [tab, setTab] = useState('museum'),
    [status, setStatus] = useState<Status>('all'),
    [search, setSearch] = useState('');
  const f = save.players.find((p) => p.id === planner.farmerId) ?? save.players[0];
  const [walnutMap, setWalnutMap] = useState<{ location: string; tile: [number, number] } | null>(
    null,
  );
  const museum = museumProgress(save, art),
    bundles = bundleProgress(save, art),
    walnuts = walnutProgress(save);
  const add = (id: string) => !planner.goals.includes(id) && onAdd(id);
  const matches = (text: string) =>
    `${text} ${translate(text)}`.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  const visibleStatus = (done: boolean | null) => matchesStatus(done, status);
  const statusValues =
    tab === 'museum'
      ? museum.map((v) => v.done)
      : tab === 'bundles'
        ? bundles.map((v) => v.done)
        : tab === 'walnuts'
          ? walnuts.map((v) => v.done)
          : (f.quests ?? []).map((v) => v.completed);
  return localize(
    <section className="panel completion-collections">
      <div className="panel-tabs">
        {[
          ['museum', 'Museum'],
          ['bundles', 'Community Center'],
          ['walnuts', 'Golden Walnuts'],
          ['quests', 'Quests'],
        ].map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="gift-controls">
        <input
          aria-label="Search completion objectives"
          placeholder="Search objectives…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <CompletionFilter value={status} onChange={setStatus} values={statusValues} />
      </div>
      {tab === 'museum' && (
        <>
          <h3>
            Museum donations · {museum.filter((m) => m.done).length} / {museum.length || 'unknown'}
          </h3>
          <p>
            Donated item IDs come from the museum’s saved display. Owning an artifact or mineral
            does not prove donation.
          </p>
          <div className="completion-item-grid">
            {museum
              .filter((m) => visibleStatus(m.done) && matches(m.name))
              .map((m) => (
                <div className="completion-item" key={m.id}>
                  <button className="text-button" onClick={() => onDetail(`object:${m.id}`)}>
                    <Sprite id={m.id} name={m.name} size={32} decorative />
                    {m.name}
                  </button>
                  <Tag>{m.done === null ? 'Unknown' : m.done ? 'Donated' : 'Not donated'}</Tag>
                  <button
                    className="button"
                    disabled={m.done === true || planner.goals.includes(`museum:${m.id}`)}
                    onClick={() => add(`museum:${m.id}`)}
                  >
                    Add to Planner
                  </button>
                </div>
              ))}
          </div>
          {!museum.length && <p>Connect the game to load the artifact/mineral catalog.</p>}
          <Sources ids={['wiki-museum', 'checkup']} onError={onError} />
        </>
      )}
      {tab === 'bundles' && (
        <>
          <h3>Community Center bundles</h3>
          <Tag>{storyRoute(save)}</Tag>
          <p>
            Bundle definitions are taken from this save, including remixed requirements. Quantity
            totals do not confirm item quality.
          </p>
          {storyRoute(save) === 'Joja' && (
            <p className="route-unknown">
              Joja membership conflicts with completing the remaining Community Center bundles on
              this farm.
            </p>
          )}
          {bundles
            .filter((b) => visibleStatus(b.done) && matches(`${b.room} ${b.name}`))
            .map((b) => {
              const needed = Math.max(0, b.required - b.current),
                choices = remainingOfferings(b, planner.bundleChoices?.[b.id] ?? []);
              return localize(
                <details className="bundle-card" key={b.id}>
                  <summary>
                    {b.room} · {b.name} ·{' '}
                    {b.done === null ? 'Unknown' : `${b.current} / ${b.required}`}
                  </summary>
                  <Tag tone={b.done === true ? 'green' : b.done === false ? 'amber' : 'neutral'}>
                    {b.done === true ? 'Complete' : b.done === false ? 'Incomplete' : 'Unknown'}
                  </Tag>
                  {!b.fromSave && (
                    <p>
                      Default-game reference; this save’s actual bundle definitions are unavailable.
                    </p>
                  )}
                  <p>Choose {needed} remaining offering(s) to plan.</p>
                  {b.items.map((i) => (
                    <label className="bundle-offering" key={i.index}>
                      <input
                        type="checkbox"
                        checked={i.done === true || choices.includes(i.index)}
                        disabled={
                          i.done === true ||
                          (!choices.includes(i.index) && choices.length >= needed)
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
                      <Sprite
                        id={i.id === '-1' ? 'currency:gold' : i.id}
                        name={itemName(i.id, art)}
                        size={32}
                        decorative
                      />
                      <span>
                        {i.id === '-1'
                          ? `${i.quantity}g`
                          : `${i.quantity} × ${itemName(i.id, art)}`}
                        <small>
                          {i.id === '-1'
                            ? 'Gold payment'
                            : i.quality === 0
                              ? 'Any quality'
                              : i.quality === 1
                                ? 'Silver or better'
                                : i.quality === 2
                                  ? 'Gold or better'
                                  : 'Iridium quality'}{' '}
                          · {i.done ? 'Donated' : 'Quality and availability require checking'}
                        </small>
                      </span>
                    </label>
                  ))}
                  <button
                    className="button"
                    disabled={
                      b.done === true ||
                      !b.fromSave ||
                      choices.length < needed ||
                      storyRoute(save) === 'Joja'
                    }
                    onClick={() => add(`bundle:${b.id}`)}
                  >
                    Add chosen offerings to Planner
                  </button>
                </details>,
              );
            })}
          <Sources ids={['wiki-bundles', 'checkup']} onError={onError} />
        </>
      )}
      {tab === 'walnuts' && (
        <>
          <h3>Golden Walnuts · {save.walnutsFound ?? 'Unknown'} / 130 found</h3>
          {walnutMap && (
            <TileMapViewer
              locations={[walnutMap.location]}
              target={walnutMap.tile}
              season={save.season}
              save={save}
            />
          )}
          <p>
            69 evidence groups describe all 130 walnuts. Collected markers and limited-drop counts
            are separate from the historical total.
          </p>
          {save.completion?.goldenParrotUsed && (
            <p className="route-unknown">
              Golden Parrot assistance is recorded; completion markers do not prove these walnuts
              were collected manually.
            </p>
          )}
          {walnuts
            .filter((w) => visibleStatus(w.done) && matches(`${w.name} ${w.hint}`))
            .map((w) => (
              <div className="walnut-row" key={w.id}>
                <Sprite id="category:walnuts" name="Golden Walnut" size={32} decorative />
                <div>
                  <strong>{w.name}</strong>
                  <small>
                    {w.recorded ?? 'Unknown'} / {w.count}
                    {w.tile ? ` · tile ${w.tile.join(', ')}` : ''}
                  </small>
                  <details>
                    <summary>Show location / puzzle hint</summary>
                    <p>{w.hint || w.name}</p>
                    {w.location && w.tile && (
                      <button
                        className="text-button"
                        onClick={() =>
                          setWalnutMap({ location: w.location!, tile: w.tile as [number, number] })
                        }
                      >
                        Show on the game map
                      </button>
                    )}
                    {w.method === 'limited' && (
                      <p>
                        This is a limited reward pool. Random drops are not guaranteed on a
                        particular day.
                      </p>
                    )}
                  </details>
                </div>
                <button
                  className="button"
                  disabled={w.done === true || planner.goals.includes(`walnut:${w.id}`)}
                  onClick={() => add(`walnut:${w.id}`)}
                >
                  Plan
                </button>
              </div>
            ))}
          <Sources ids={['checkup', 'wiki-walnut']} onError={onError} />
        </>
      )}
      {tab === 'quests' && (
        <>
          <h3>Saved quest journal</h3>
          <label>
            Saved farmer
            <select
              aria-label="Quest view farmer"
              value={f.id}
              onChange={(e) => onChange({ ...planner, farmerId: e.target.value })}
            >
              {save.players.map((p) => (
                <option key={p.id} value={p.id} data-l10n="off">
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <p>
            Only quests recorded in this farmer’s journal are confirmed. Disappeared quests are not
            automatically classified as completed.
          </p>
          {f.quests === null ? (
            <p>Quest journal data is unavailable.</p>
          ) : f.quests?.length === 0 ? (
            <p>No quests in the saved journal.</p>
          ) : (
            f.quests
              ?.filter(
                (q) => visibleStatus(q.completed) && matches(`${q.title} ${q.id} ${q.objective}`),
              )
              .map((q) => {
                const reference = String(art.gameData?.quests?.[q.id] ?? '').split('/');
                return localize(
                  <div className="quest-card" key={`${q.kind}:${q.id}`}>
                    <h4 data-l10n={q.id.startsWith('StardewCompanion:') ? 'off' : undefined}>
                      {q.title || reference[1] || `Quest ${q.id}`}
                    </h4>
                    <Tag
                      tone={
                        q.completed === true ? 'green' : q.completed === false ? 'amber' : 'neutral'
                      }
                    >
                      {q.completed === true
                        ? 'Complete'
                        : q.completed === false
                          ? 'Incomplete'
                          : 'Unknown'}
                    </Tag>
                    {q.id.startsWith('StardewCompanion:') && <Tag>Personal Companion reminder</Tag>}
                    <p>{q.description || reference[2]}</p>
                    <p>{q.objective || reference[3]}</p>
                    {q.daysLeft !== null && q.daysLeft > 0 && <p>{q.daysLeft} day(s) remaining.</p>}
                  </div>,
                );
              })
          )}
          <details>
            <summary>
              Browse installed quest references ({Object.keys(art.gameData?.quests ?? {}).length})
            </summary>
            {Object.entries(art.gameData?.quests ?? {})
              .filter(
                ([id, raw]) =>
                  visibleStatus(f.quests?.find((q) => q.id === id)?.completed ?? null) &&
                  matches(`${id} ${raw}`),
              )
              .map(([id, raw]) => (
                <div className="quest-card" key={id}>
                  <strong>{String(raw).split('/')[1]}</strong>
                  <Tag>
                    {f.quests?.find((q) => q.id === id)?.completed === true
                      ? 'Complete'
                      : f.quests?.find((q) => q.id === id)?.completed === false
                        ? 'Incomplete'
                        : 'Unknown'}
                  </Tag>
                  <p>{String(raw).split('/')[2]}</p>
                  <p>{String(raw).split('/')[3]}</p>
                </div>
              ))}
          </details>
        </>
      )}
      <p className="fine-print">
        Optional completion objectives remain separate from official Perfection.
      </p>
    </section>,
  );
}
