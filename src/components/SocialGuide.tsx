import { localize } from '../lib/locale';
import { useState } from 'react';
import { CalendarDays, ExternalLink } from 'lucide-react';
import type { SaveProfile, Farmer } from '../domain/models';
import { socialState, villagerProfiles, birthdayLabel, birthdayDistance } from '../domain/social';
import { sources } from '../domain/knowledge';
import { sourceLink } from '../lib/backend';
import { Sprite, useArtwork } from './Artwork';
import { Hearts } from './Hearts';
import { Tag } from './common';
import { SocialExtras } from './SocialExtras';
export function SocialBrowser({
  save,
  matches,
  onDetail,
  farmerId,
  onFarmer,
}: {
  save: SaveProfile | null;
  matches: (s: string) => boolean;
  onDetail: (id: string) => void;
  farmerId: string;
  onFarmer: (id: string) => void;
}) {
  const { data: art } = useArtwork();
  const [variants, setVariants] = useState(false),
    [sort, setSort] = useState('name');
  const farmer = save?.players.find((f) => f.id === farmerId) ?? save?.players[0] ?? null;
  const roster = variants
    ? art.characters
    : Object.values(villagerProfiles).map((p) => ({
        id: `character:${p.name}`,
        name: p.name,
        kind: 'character',
      }));
  const entries = roster
    .filter((e) => matches(e.name))
    .sort((a, b) =>
      sort === 'hearts'
        ? (socialState(a.name.split('_')[0], farmer).points ?? Infinity) -
            (socialState(b.name.split('_')[0], farmer).points ?? Infinity) ||
          a.name.localeCompare(b.name)
        : sort === 'birthday' && save
          ? (villagerProfiles[a.name.split('_')[0]]
              ? birthdayDistance(villagerProfiles[a.name.split('_')[0]], save)
              : 999) -
            (villagerProfiles[b.name.split('_')[0]]
              ? birthdayDistance(villagerProfiles[b.name.split('_')[0]], save)
              : 999)
          : a.name.localeCompare(b.name),
    );
  return localize(
    <>
      <div className="social-controls">
        <label>
          Saved farmer
          <select
            aria-label="Social view farmer"
            value={farmer?.id ?? ''}
            onChange={(e) => onFarmer(e.target.value)}
            disabled={!save}
          >
            {save ? (
              save.players.map((f) => (
                <option key={f.id} value={f.id} data-l10n="off">
                  {f.name}
                </option>
              ))
            ) : (
              <option value="">No save selected</option>
            )}
          </select>
        </label>
        <label>
          Sort
          <select
            aria-label="Sort characters"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="name">Name</option>
            <option value="hearts">Lowest friendship first</option>
            <option value="birthday">Upcoming birthday</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={variants}
            onChange={(e) => setVariants(e.target.checked)}
          />
          Show all portrait variants
        </label>
      </div>
      <p className="fish-result-count">
        Hearts come from this farmer’s saved friendship points. Seasonal portraits share the same
        relationship.
      </p>
      <div className="social-grid">
        {entries.map((e) => {
          const base = e.name.split('_')[0],
            p = villagerProfiles[base];
          return localize(
            <button
              key={e.id}
              className="encyclopedia-card entity-card social-card"
              onClick={() => onDetail(e.id)}
            >
              <Sprite id={e.id} name={e.name} size={72} decorative />
              <div className="social-card-copy">
                <strong>{e.name.replace(/_/g, ' · ')}</strong>
                <Hearts name={base} farmer={farmer} compact />
                {p && (
                  <small>
                    <CalendarDays size={13} />
                    {birthdayLabel(p)}
                    {save && birthdayDistance(p, save) === 0 ? ' · Birthday today!' : ''}
                  </small>
                )}
              </div>
            </button>,
          );
        })}
      </div>
      {entries.length === 0 && (
        <div className="empty">
          <h3>No characters match</h3>
          <p>Try another name, or turn off portrait variants when the game is not connected.</p>
        </div>
      )}
    </>,
  );
}
export function SocialGuide({
  name,
  save,
  farmerId,
  onFarmer,
  onError,
}: {
  name: string;
  save: SaveProfile | null;
  farmerId: string;
  onFarmer: (id: string) => void;
  onError: (e: unknown) => void;
}) {
  const farmer: Farmer | null =
    save?.players.find((f) => f.id === farmerId) ?? save?.players[0] ?? null;
  const state = socialState(name, farmer),
    p = villagerProfiles[name];
  if (!p)
    return localize(<SocialExtras name={name} save={save} farmer={farmer} onError={onError} />);
  return localize(
    <div className="social-dossier">
      <label className="farmer-picker">
        Saved farmer
        <select
          aria-label="Social view farmer"
          value={farmer?.id ?? ''}
          onChange={(e) => onFarmer(e.target.value)}
          disabled={!save}
        >
          {save ? (
            save.players.map((f) => (
              <option key={f.id} value={f.id} data-l10n="off">
                {f.name}
              </option>
            ))
          ) : (
            <option value="">No save selected</option>
          )}
        </select>
      </label>
      <Hearts name={name} farmer={farmer} />
      <div className="social-facts">
        <Tag tone="green">{state.relationship}</Tag>
        <Tag>
          <CalendarDays size={14} />
          {birthdayLabel(p)}
        </Tag>
        {save && (
          <Tag tone={birthdayDistance(p, save) === 0 ? 'amber' : 'neutral'}>
            {birthdayDistance(p, save) === 0
              ? 'Birthday on the saved day'
              : `Birthday in ${birthdayDistance(p, save)} days`}
          </Tag>
        )}
      </div>
      <section>
        <h3>Saved daily interactions</h3>
        <div className="social-daily">
          <span>
            Talked today
            <strong>
              {state.details?.talkedToToday === null || state.details?.talkedToToday === undefined
                ? 'Unknown'
                : state.details.talkedToToday
                  ? 'Yes'
                  : 'No'}
            </strong>
          </span>
          <span>
            Gifts today<strong>{state.details?.giftsToday ?? 'Unknown'}</strong>
          </span>
          <span>
            Gifts this week<strong>{state.details?.giftsThisWeek ?? 'Unknown'}</strong>
          </span>
        </div>
        <p>
          The disk save may already represent the next morning. Unsaved conversations and gifts are
          not visible here.
        </p>
      </section>
      <section>
        <h3>Build this friendship</h3>
        <ol className="guide-steps">
          <li>
            Talk to {name} and choose a gift they love. A normal heart represents 250 friendship
            points.
          </li>
          <li>
            Check the saved gift counters and the in-game social tab before giving another gift.
            Birthday gifts have an additional bonus.
          </li>
          {state.cap === 8 && (
            <li>
              The final two social hearts stay locked until a bouquet unlocks dating. Perfection
              only needs 8 hearts for this marriage candidate.
            </li>
          )}
          <li>
            Perfection’s friendship target is {state.perfectionTarget} hearts for {name}. The social
            meter can have a different maximum.
          </li>
          {p.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ol>
      </section>
      <SocialExtras name={name} save={save} farmer={farmer} onError={onError} />
      <section>
        <h3>Where to look</h3>
        <p>
          Home / usual base: <strong>{farmer?.spouse === name ? 'Your farmhouse' : p.home}</strong>.
          This is not a live position; schedules change with weekday, weather, festivals and story
          progress.
        </p>
        <button
          className="text-button"
          onClick={() => void sourceLink(`${sources[p.source].url}#Schedule`).catch(onError)}
        >
          <ExternalLink size={16} />
          Open the verified schedule source
        </button>
      </section>
    </div>,
  );
}
