import { localize } from '../lib/locale';
import { useRef } from 'react';
import { useArtwork } from './Artwork';
import { GiftBrowser } from './GiftBrowser';
import type { Farmer, SaveProfile } from '../domain/models';
import { NpcSchedule } from './NpcSchedule';
import { eventConditions } from '../domain/conditions';
import { GameConditions } from './GameConditions';
export function SocialExtras({
  name,
  save,
  farmer,
  onError,
}: {
  name: string;
  save: SaveProfile | null;
  farmer: Farmer | null;
  onError: (e: unknown) => void;
}) {
  const { data: art } = useArtwork();
  const npc = art.gameData?.characters?.[name];
  const enumLabel = (kind: string, value: unknown) =>
    art.gameData?.enums?.[kind]?.[String(value)] ?? String(value ?? 'Unknown');
  const rewards = Object.values(art.recipes).filter(
    (r, i, all) =>
      r.unlock?.startsWith(`f ${name} `) && all.findIndex((x) => x.output === r.output) === i,
  );
  const events = art.events?.[name] ?? [];
  const root = useRef<HTMLDivElement>(null);
  return localize(
    <div ref={root} className="social-extra-sections">
      <nav className="social-section-nav" aria-label="Character details sections">
        {[
          ['.npc-schedule', 'Daily schedules'],
          ['.gift-browser', 'All gift preferences'],
          ['.heart-events', 'Heart events'],
          ['.character-profile', 'Character profile'],
        ]
          .filter(([selector]) => selector !== '.heart-events' || events.length > 0)
          .map(([selector, label]) => (
            <button
              className="button"
              key={selector}
              onClick={() =>
                root.current
                  ?.querySelector(selector)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              {label}
            </button>
          ))}
      </nav>
      {npc && (
        <section className="character-profile">
          <h3>Character profile</h3>
          <dl className="profile-properties">
            {[
              ['Gender', enumLabel('Gender', npc.Gender)],
              ['Age group', enumLabel('NpcAge', npc.Age)],
              ['Manner', enumLabel('NpcManner', npc.Manner)],
              ['Social style', enumLabel('NpcSocialAnxiety', npc.SocialAnxiety)],
              ['Outlook', enumLabel('NpcOptimism', npc.Optimism)],
              ['Romance', npc.CanBeRomanced ? 'Marriage candidate' : 'Not a marriage candidate'],
              ['Home region', npc.HomeRegion],
              ['Love interest', npc.LoveInterest ?? 'None listed'],
              ['Counts for Perfection', npc.PerfectionScore ? 'Yes' : 'No'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{String(v)}</dd>
              </div>
            ))}
          </dl>
          {npc.Home?.length > 0 && (
            <p>
              Home:{' '}
              {npc.Home.map(
                (h: any) =>
                  `${h.Location} (${h.Tile?.X}, ${h.Tile?.Y})${h.Condition ? ` · ${h.Condition}` : ''}`,
              ).join(' / ')}
            </p>
          )}
          {Object.keys(npc.FriendsAndFamily ?? {}).length > 0 && (
            <p>
              Friends & family:{' '}
              {Object.entries(npc.FriendsAndFamily)
                .map(([person, relation]) => `${person}: ${relation}`)
                .join(' · ')}
            </p>
          )}
          {npc.UnlockConditions && (
            <GameConditions raw={npc.UnlockConditions} save={save} farmer={farmer} />
          )}
          {npc.CanBeRomanced && (
            <details>
              <summary>Dating & marriage</summary>
              <ol className="guide-steps">
                <li>Reach 8 hearts, then give a Bouquet to begin dating and unlock hearts 9–10.</li>
                <li>Reach 10 hearts and upgrade the farmhouse at least once.</li>
                <li>
                  Repair the east Beach bridge and meet the Old Mariner on a rainy day; a Mermaid’s
                  Pendant costs 5,000g.
                </li>
                <li>
                  Give the pendant to your chosen partner; the wedding normally follows in three
                  days.
                </li>
                <li>
                  After marriage, the relationship can reach 14 hearts. Talk and give suitable gifts
                  to maintain it.
                </li>
                <li>
                  A spouse or roommate can give a Stardrop at 12.5 hearts; the saved Stardrop flag
                  confirms collection.
                </li>
              </ol>
            </details>
          )}
          {rewards.length > 0 && (
            <>
              <h4>Recipe rewards</h4>
              <ul>
                {rewards.map((r) => (
                  <li key={r.output}>
                    {r.name} · {r.unlock?.split(' ')[2]} hearts · letter delivered after the
                    requirement is reached.
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
      {events.length > 0 && (
        <section className="heart-events">
          <h3>Heart events</h3>
          <p>
            Seen events come from the selected farmer’s saved record. Time, weather and live
            presence still need checking.
          </p>
          {[...events]
            .sort((a, b) => a.friendshipPoints - b.friendshipPoints)
            .map((event, index) => (
              <details key={`${event.id}:${event.location}:${index}`}>
                <summary>
                  {event.friendshipPoints / 250} hearts · {event.location} ·{' '}
                  {farmer?.events === null || !farmer
                    ? 'Unknown'
                    : farmer.events.includes(event.id)
                      ? 'Seen'
                      : 'Not recorded as seen'}
                </summary>
                <ul>
                  {eventConditions(event.conditions, save, farmer).map((c, i) => (
                    <li key={i}>
                      {c.text} ·{' '}
                      {c.met === null
                        ? 'Check in game'
                        : c.met
                          ? 'Saved condition met'
                          : 'Saved condition not met'}
                      {c.text === 'Additional event condition' && (
                        <details>
                          <summary>Original condition</summary>
                          <code>{c.raw}</code>
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
        </section>
      )}
      <div className="gift-browser">
        <GiftBrowser name={name} farmer={farmer} save={save} />
      </div>
      <NpcSchedule
        key={`${name}:${save?.id}:${save?.season}:${save?.day}`}
        name={name}
        save={save}
        farmer={farmer}
        onError={onError}
      />
    </div>,
  );
}
