import { localize } from '../lib/locale';
import { useState } from 'react';
import { Sprite, useArtwork } from './Artwork';
import {
  monsterAliases,
  monsterData,
  monsterName,
  monsterSprite,
  combatNotes,
  monsterGroup,
  eradicationGroups,
  monsterFloors,
} from '../domain/monsters';
import { itemName } from '../domain/installed';
import type { SaveProfile } from '../domain/models';
import { Tag, Sources } from './common';
import { monsterHunting } from '../domain/monster-hunting';
import { TileMapViewer } from './TileMapViewer';
import { MapPin, Footprints, Compass } from 'lucide-react';
export function MonsterBrowser({
  matches,
  onDetail,
  save,
  farmerId,
}: {
  matches: (s: string) => boolean;
  onDetail: (id: string) => void;
  save: SaveProfile | null;
  farmerId?: string | null;
}) {
  const { data: art } = useArtwork();
  const [location, setLocation] = useState('all'),
    [variants, setVariants] = useState(false);
  const names = [
    ...new Set([
      ...Object.keys(art.gameData?.monsters ?? {}).filter(
        (n) => !['Cat', 'Crow', 'Frog', 'Fireball', 'Shadow Guy', 'Skeleton Warrior'].includes(n),
      ),
      ...(variants || !art.gameData?.monsters ? art.monsters.map((e) => e.name) : []),
    ]),
  ];
  const entries = names.map((name) => ({ name, data: monsterData(name, art) }));
  const visible = entries.filter(
    (e) => matches(e.name) && (location === 'all' || e.data?.location === location),
  );
  const farmer = save?.players.find((f) => f.id === farmerId) ?? save?.players[0];
  return localize(
    <>
      <div className="gallery-controls">
        <label>
          Monster location
          <select
            aria-label="Monster location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="all">Every location</option>
            {[...new Set(entries.map((e) => e.data?.location ?? 'Artwork only'))]
              .sort()
              .map((l) => (
                <option key={l}>{l}</option>
              ))}
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={variants}
            onChange={(e) => setVariants(e.target.checked)}
          />
          Include artwork / dangerous variants
        </label>
      </div>
      <div className="encyclopedia-grid">
        {visible.map(({ name, data }) => (
          <button
            className="encyclopedia-card monster-card"
            key={name}
            onClick={() => onDetail(`monster:${name}`)}
          >
            <Sprite id={monsterSprite(name, art)} name={name} size={64} decorative />
            <div>
              <strong>{name.replace(/_/g, ' · ')}</strong>
              <small>{data?.location ?? 'Artwork only'}</small>
              {data && (
                <small>
                  {data.reference ? 'Base' : 'Related'} stats · {data.health} HP · {data.damage}{' '}
                  attack
                </small>
              )}
              <small>
                {farmer?.monsters ? (farmer.monsters[monsterName(name)] ?? 0) : 'Unknown'} recorded
                kills
              </small>
            </div>
          </button>
        ))}
      </div>
      {entries.length === 0 && (
        <p>Connect the game to load monster statistics, drops and artwork.</p>
      )}
      {entries.length > 0 && !visible.length && (
        <div className="empty">
          <h3>No monsters match these filters</h3>
          <p>Try another name or location.</p>
          <button className="button" onClick={() => setLocation('all')}>
            Every location
          </button>
        </div>
      )}
    </>,
  );
}
export function MonsterGuide({
  name,
  save,
  onError,
  farmerId: selectedId,
  onFarmer,
}: {
  name: string;
  save: SaveProfile | null;
  onError: (e: unknown) => void;
  farmerId?: string | null;
  onFarmer?: (id: string) => void;
}) {
  const { data: art } = useArtwork();
  const [farmerId, setFarmerId] = useState(save?.players[0].id ?? '');
  const f = save?.players.find((p) => p.id === (selectedId ?? farmerId)) ?? save?.players[0];
  const goal = monsterGroup(name, art, save?.gameVersion);
  const [member, setMember] = useState(''),
    [map, setMap] = useState<string[] | null>(null);
  const encounter = goal ? (goal.Targets.includes(member) ? member : goal.Targets[0]) : name;
  const base = monsterName(encounter),
    data = monsterData(encounter, art),
    hunting = monsterHunting(encounter);
  const groups = eradicationGroups(art, save?.gameVersion)
    .filter((g) => g.key === goal?.key || g.Targets.includes(base))
    .map((g) => [g.key, g] as const);
  return localize(
    <div className="monster-dossier">
      <label>
        Saved farmer
        <select
          aria-label="Monster view farmer"
          value={f?.id ?? ''}
          onChange={(e) => (onFarmer ? onFarmer(e.target.value) : setFarmerId(e.target.value))}
        >
          {save?.players.map((p) => (
            <option key={p.id} value={p.id} data-l10n="off">
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {goal && (
        <section className="monster-members">
          <h3>Choose a member of this goal</h3>
          <div>
            {goal.Targets.map((t) => (
              <button
                className={'button ' + (encounter === t ? 'primary' : '')}
                key={t}
                aria-pressed={encounter === t}
                onClick={() => {
                  setMember(t);
                  setMap(null);
                }}
              >
                <Sprite id={monsterSprite(t, art)} name={t} size={32} decorative />
                {t}
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="monster-hunting">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FIELD NOTES</span>
            <h3>Where to find this monster</h3>
          </div>
          <Sprite id={monsterSprite(encounter, art)} name={encounter} size={72} decorative />
        </div>
        {hunting ? (
          <>
            <div className="monster-floor-tags">
              {hunting.floors.map((r) => (
                <Tag key={r.region} tone="amber">
                  {r.region} · Floors {r.floors}
                </Tag>
              ))}
            </div>
            {hunting.routes.map((r) => (
              <article className="hunting-route" key={r.name}>
                <h4>
                  <MapPin size={18} />
                  {r.name}
                </h4>
                <dl>
                  <div>
                    <dt>
                      <Compass size={16} />
                      Getting there
                    </dt>
                    <dd>{r.access}</dd>
                  </div>
                  <div>
                    <dt>
                      <Footprints size={16} />
                      Where to look
                    </dt>
                    <dd>{r.search}</dd>
                  </div>
                </dl>
                <button
                  className="button"
                  onClick={() => setMap(map?.[0] === r.maps[0] ? null : r.maps)}
                >
                  {map?.[0] === r.maps[0] ? 'Hide entrance map' : 'Show entrance map'}
                </button>
              </article>
            ))}
            <p className="monster-encounter-tip">{hunting.encounter}</p>
            {hunting.generated && (
              <p className="fine-print">
                The map shows the approach or entrance. Generated dungeon rooms and live monster
                positions cannot be read from this save.
              </p>
            )}
            {map && (
              <TileMapViewer
                key={map.join(':')}
                locations={map}
                season={save?.season}
                save={save}
              />
            )}
            <Sources ids={hunting.sources} onError={onError} />
          </>
        ) : (
          <p>
            No verified encounter location is available for this data or artwork entry. It may be
            unused content.
          </p>
        )}
        {['Green Slime', 'Big Slime', 'Purple Slime', 'Royal Serpent'].includes(base) && (
          <p className="fine-print">
            Reference sprite preview: slime colors are applied during gameplay; Royal Serpent body
            segments are assembled by the game.
          </p>
        )}
      </section>
      {data ? (
        <>
          <section>
            <h3>Combat profile</h3>
            <Tag tone="amber">{data.location}</Tag>
            {monsterFloors(encounter).map((r) => (
              <p key={r.region}>
                {r.region} · Floors {r.floors}
              </p>
            ))}
            {monsterFloors(encounter).length > 0 && (
              <p className="fine-print">
                Documented floor bands; individual generated floors may not contain this monster.
              </p>
            )}
            <dl className="profile-properties">
              {[
                ['Base health', data.health],
                ['Base attack', data.damage],
                ['Base defense', data.defense],
                ['Speed', data.speed],
                ['Base combat XP', data.experience],
                ['Flying in data', data.flying ? 'Yes' : 'No'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p>
              These are installed base values. Dangerous variants, mine depth and runtime scaling
              can change the encounter.
            </p>
            {combatNotes[base]?.map((n) => (
              <p key={n}>{n}</p>
            ))}
            <p>
              Bring healing food, a suitable weapon and an exit plan. Avoid getting surrounded;
              attack between enemy movement or projectile patterns.
            </p>
          </section>
          <section>
            <h3>Possible loot</h3>
            <div className="gift-grid">
              {data.drops.map((d, i) => (
                <div className="gift-choice" key={i}>
                  <Sprite id={d.id} name={itemName(d.id, art)} size={32} decorative />
                  <span>
                    <strong>{itemName(d.id, art)}</strong>
                    <small>
                      {(d.chance * 100).toLocaleString(undefined, { maximumFractionDigits: 4 })}%
                      per listed roll
                    </small>
                  </span>
                </div>
              ))}
            </div>
            <p className="fine-print">
              Repeated rolls are separate opportunities. Special drops, luck, rings and runtime
              modifiers can alter the result; these are not guaranteed loot totals.
            </p>
          </section>
        </>
      ) : (
        <p>No base statistics are exposed for this artwork variant.</p>
      )}
      <section>
        <h3>Eradication goals & saved kills</h3>
        {groups.length ? (
          groups.map(([key, g]) => {
            const killed = f?.monsters
              ? g.Targets.reduce((n: number, t: string) => n + (f.monsters?.[t] ?? 0), 0)
              : null;
            return localize(
              <div className="eradication-goal" key={key}>
                <strong>
                  {g.name} · {killed ?? 'Unknown'} / {g.Count}
                </strong>
                <p>Targets: {g.Targets.join(' · ')}</p>
                {g.RewardItemId && (
                  <p>
                    Reward:{' '}
                    <Sprite
                      id={g.RewardItemId}
                      name={itemName(g.RewardItemId, art)}
                      size={24}
                      decorative
                    />{' '}
                    {itemName(g.RewardItemId, art)}
                  </p>
                )}
                <p>
                  {killed !== null && killed >= g.Count
                    ? 'Saved kill requirement reached. Check with Gil to claim the reward.'
                    : 'Work on the listed monster group, then check the Adventurer’s Guild board.'}
                </p>
              </div>,
            );
          })
        ) : (
          <p>
            {f?.monsters ? (f.monsters[base] ?? 0) : 'Unknown'} saved kills. This entry is not a
            separate eradication goal.
          </p>
        )}
      </section>
      <Sources
        ids={[
          'wiki-monsters',
          'wiki-monster-data',
          ...(data?.location.includes('Skull')
            ? ['wiki-skull-cavern']
            : data?.location.includes('Volcano')
              ? ['wiki-volcano']
              : ['wiki-mines']),
        ]}
        onError={onError}
      />
      {!data?.reference && monsterAliases[base] && (
        <p>
          Related base sprite/data: {monsterAliases[base]}. Variant-specific combat values are not
          inferred.
        </p>
      )}
    </div>,
  );
}
