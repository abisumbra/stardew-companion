import { localize } from '../lib/locale';
import { useState } from 'react';
import { CalendarDays, Clock, CloudRain, MapPin, ExternalLink } from 'lucide-react';
import {
  routesFor,
  routeChecks,
  timeLabel,
  methodLabel,
  type FishProfile,
} from '../domain/fishing';
import type { SaveProfile } from '../domain/models';
import { sources } from '../domain/knowledge';
import { sourceLink } from '../lib/backend';
import { Tag } from './common';
import { FishingMap } from './FishingMap';
import { TileMapViewer } from './TileMapViewer';
import { useArtwork } from './Artwork';

export function FishGuide({
  profile,
  save,
  onError,
  initialRoute = 0,
  initialMagicBait = false,
  onPlanChange,
}: {
  profile: FishProfile;
  save: SaveProfile | null;
  onError: (e: unknown) => void;
  initialRoute?: number;
  initialMagicBait?: boolean;
  onPlanChange?: (plan: { routeIndex: number; magicBait: boolean }) => void;
}) {
  const [active, setActive] = useState(initialRoute),
    [magic, setMagic] = useState(initialMagicBait);
  const [showTiles, setShowTiles] = useState(false);
  const { data: art } = useArtwork();
  const routes = routesFor(profile, save?.gameVersion ?? '1.6');
  const index = Math.min(active, routes.length - 1),
    route = routes[index];
  const checks = routeChecks(profile, route, save, magic);
  const baitBypass = magic && profile.method === 'rod';

  return localize(
    <div className="fish-dossier">
      <div className="fish-summary">
        <Tag tone="blue">{methodLabel(profile)}</Tag>
        {profile.legendary && <Tag tone="amber">Legendary</Tag>}
        {profile.difficulty !== null && (
          <Tag>
            Difficulty {profile.difficulty} · {profile.behavior}
          </Tag>
        )}
      </div>
      <section>
        <h3>Where to find it</h3>
        <p>Choose a route. Each location keeps its own season, time and access requirements.</p>
        <div className="route-tabs" role="group" aria-label="Fishing routes">
          {routes.map((r, i) => (
            <button
              key={i}
              className={`button ${i === index ? 'primary' : ''}`}
              aria-pressed={i === index}
              onClick={() => {
                setActive(i);
                onPlanChange?.({ routeIndex: i, magicBait: magic });
              }}
            >
              {r.area}
            </button>
          ))}
        </div>
        <FishingMap route={route} save={save} />
        {art.root && (
          <details
            className="tile-map-details"
            onToggle={(e) => setShowTiles(e.currentTarget.open)}
          >
            <summary>Open the detailed shoreline map & tile coordinates</summary>
            {showTiles && route.region === 'mines' && /100/.test(route.area) ? (
              <p className="notice">
                This route needs mine floor 100. A verified standalone map for this floor is
                unavailable in this installation. Floors 20 and 60 are not substitutes. Follow the
                floor-100 directions below.
              </p>
            ) : (
              showTiles && (
                <TileMapViewer
                  locations={
                    route.region === 'island'
                      ? /Caldera/i.test(route.area)
                        ? ['Caldera']
                        : /Pirate/i.test(route.area)
                          ? ['IslandSouthEastCave']
                          : /freshwater/i.test(route.area)
                            ? ['IslandNorth', 'IslandWest']
                            : ['IslandWest', 'IslandSouth', 'IslandSouthEast']
                      : {
                          ocean: ['Beach'],
                          town: ['Town'],
                          forest: ['Forest'],
                          mountain: ['Mountain'],
                          woods: ['Woods'],
                          desert: ['Desert'],
                          mines: ['Mines/20', 'Mines/60'],
                          sewers: /Bug/i.test(route.area) ? ['BugLand'] : ['Sewer'],
                          swamp: ['WitchSwamp'],
                          'night-market': ['Beach-NightMarket', 'Submarine'],
                        }[route.region]
                  }
                  season={save?.season ?? 'spring'}
                  save={save}
                />
              )
            )}
          </details>
        )}
        <h4 className="route-name">
          <MapPin size={19} />
          {route.area}
        </h4>
        <div className="fishing-facts">
          <div>
            <CalendarDays size={19} />
            <span>
              Season
              <strong>
                {baitBypass && route.region !== 'night-market' && !route.days
                  ? 'Any season with Magic Bait'
                  : route.seasons.join(' · ')}
              </strong>
              {route.days && (
                <small>
                  Only days {route.days[0]}–{route.days[1]}
                </small>
              )}
            </span>
          </div>
          <div>
            <Clock size={19} />
            <span>
              {profile.method === 'crab-pot' ? 'Collect' : 'Time window'}
              <strong>
                {profile.method === 'crab-pot'
                  ? 'The following day'
                  : baitBypass
                    ? 'Any time with Magic Bait'
                    : timeLabel(route)}
              </strong>
            </span>
          </div>
          <div>
            <CloudRain size={19} />
            <span>
              Weather
              <strong>
                {baitBypass
                  ? 'Any weather with Magic Bait'
                  : route.weather === 'any'
                    ? 'Any weather'
                    : route.weather === 'rain'
                      ? 'Rain required'
                      : 'Sunny / windy'}
              </strong>
            </span>
          </div>
          <div>
            <span>
              Effective Fishing level
              <strong>
                {checks.level
                  ? `${checks.level}+ (buffs can count)`
                  : 'No special level requirement'}
              </strong>
              {save && (
                <small>Saved base level: {save.players[0].skills.fishing ?? 'unknown'}</small>
              )}
            </span>
          </div>
        </div>
        {profile.method === 'rod' && (
          <label className="checkbox-label magic-bait">
            <input
              type="checkbox"
              checked={magic}
              onChange={(e) => {
                setMagic(e.target.checked);
                onPlanChange?.({ routeIndex: index, magicBait: e.target.checked });
              }}
            />
            Plan with Magic Bait{' '}
            <span>
              Season, weather and time limits are waived; location, level and access rules remain.
              Festival access dates are not bypassed.
            </span>
          </label>
        )}
        <div className="route-status" role="status">
          <Tag tone={checks.season === false ? 'amber' : 'green'}>
            {checks.season === null
              ? 'Choose a save to compare the season'
              : checks.season
                ? 'Saved season matches this route'
                : 'Outside this route’s normal season'}
          </Tag>
          {checks.date === false && <Tag tone="amber">Wait for the documented festival dates</Tag>}
          {checks.levelMet === false && (
            <Tag tone="amber">Check Fishing buffs or raise your level</Tag>
          )}
          {checks.magicRequired && <Tag tone="amber">Equip Magic Bait for this route</Tag>}
        </div>
      </section>
      <section>
        <h3>How to get there & catch it</h3>
        <ol className="guide-steps">
          {route.directions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
          {profile.method === 'crab-pot' ? (
            <>
              <li>
                Place a Crab Pot in the correct water type. Add bait unless your Luremaster
                profession removes that requirement.
              </li>
              <li>
                Leave it overnight, collect the result the next day, and bait it again. Catches are
                random.
              </li>
            </>
          ) : (
            <>
              <li>
                {profile.method === 'rod-collectible'
                  ? 'Cast with a fishing rod and collect the item; these items skip the ordinary fish minigame.'
                  : 'Cast with a suitable rod. Keep the fish inside the green bar until the catch meter fills.'}
              </li>
              <li>
                Save the game overnight, then rescan to update the confirmed collection record.
              </li>
            </>
          )}
        </ol>
      </section>
      {(route.requirements.length > 0 || checks.level > 0) && (
        <section className="route-requirements">
          <h3>Before you go</h3>
          <ul>
            {route.requirements.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
            {checks.level > 0 && (
              <li>
                Effective Fishing level {checks.level} is required. The saved base level does not
                include temporary food or drink buffs.
              </li>
            )}
          </ul>
        </section>
      )}
      <section>
        <h3>Useful field notes</h3>
        <ul className="fish-notes">
          {profile.notes.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
          {profile.method === 'rod' && (
            <li>
              The Training Rod cannot hook fish with difficulty 50 or higher. For difficult catches,
              a larger fishing bar and suitable tackle can help.
            </li>
          )}
          {profile.legendary && (
            <li>
              The normal rod route is a one-time catch per farmer. Special bait and other game
              mechanics can create additional copies.
            </li>
          )}
          <li>Owning, buying or receiving this item does not prove a saved fishing action.</li>
        </ul>
      </section>
      <p className="route-unknown">
        This is a plan from your last disk save. Current weather, clock time, rod equipment and
        region access are checked in game.
      </p>
      <button
        className="text-button"
        onClick={() => void sourceLink(`${sources[profile.sources[0]].url}#Map`).catch(onError)}
      >
        <ExternalLink size={16} />
        Open the source’s location/map section
      </button>
    </div>,
  );
}
