import { useMemo, useState } from 'react';
import { CalendarDays, CloudSun, MapPin, ChevronRight, Clock } from 'lucide-react';
import { localize, translate } from '../lib/locale';
import { useArtwork } from './Artwork';
import type { SaveProfile, Farmer, Season } from '../domain/models';
import {
  scheduleKeys,
  parseSchedule,
  scheduleTime,
  scheduleLabel,
  scheduleActivity,
} from '../domain/schedules';
import { locationName } from '../domain/locations';
import { conditionsMet, queryConditions } from '../domain/conditions';
import { TileMapViewer } from './TileMapViewer';
import { Sources, Tag } from './common';
export function NpcSchedule({
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
  const schedules = art.schedules?.[name] ?? {},
    npc = art.gameData?.characters?.[name];
  const [weather, setWeather] = useState('unknown'),
    [variant, setVariant] = useState(''),
    [season, setSeason] = useState<Season>(save?.season ?? 'spring'),
    [day, setDay] = useState(save?.day ?? 1),
    [selected, setSelected] = useState(0),
    [mapOpen, setMapOpen] = useState(false);
  const planning = useMemo(() => (save ? { ...save, season, day } : null), [save, season, day]);
  const home =
    (npc?.Home ?? []).find(
      (h: any) => conditionsMet(queryConditions(h.Condition, planning, farmer)) === true,
    ) ?? npc?.Home?.[0];
  const married = Boolean(save?.players.some((f) => f.spouse === name));
  const candidates = planning ? scheduleKeys(name, schedules, planning, weather) : [];
  const key = variant && schedules[variant] !== undefined ? variant : (candidates[0] ?? '');
  const route = useMemo(
    () =>
      parseSchedule(schedules, key, planning, home?.Location ?? 'Unknown', {
        married,
        homeTile: home?.Tile ? [home.Tile.X, home.Tile.Y] : undefined,
      }),
    [schedules, key, planning, home, married],
  );
  const point = route.points[Math.min(selected, route.points.length - 1)];
  const locations = [
    ...new Set(route.points.filter((p) => p.x >= 0 && p.y >= 0).map((p) => p.location)),
  ];
  const festival = art.gameData?.festivalDates?.[`${season}${day}`];
  const selectedMap = point && point.x >= 0 && point.y >= 0 ? point.location : locations[0];
  const markers = route.points.flatMap((p, index) =>
    p.x >= 0 && p.y >= 0
      ? [
          {
            id: String(index),
            label: `${index + 1} · ${scheduleTime(p.time)}`,
            location: p.location,
            tile: [p.x, p.y] as [number, number],
          },
        ]
      : [],
  );
  const reset = () => {
    setVariant('');
    setSelected(0);
  };
  return localize(
    <section className="npc-schedule schedule-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">A DAY IN THE VALLEY</span>
          <h3>Daily schedules</h3>
        </div>
        <Tag>{name}</Tag>
      </div>
      <p>
        Choose a date and weather scenario. Times show when travel starts; arrival depends on
        walking distance. This is a saved-data reference, not a live tracker.
      </p>
      <div className="schedule-controls">
        <label>
          <CalendarDays size={16} />
          Season
          <select
            aria-label="Schedule season"
            value={season}
            onChange={(e) => {
              setSeason(e.target.value as Season);
              reset();
            }}
          >
            {['spring', 'summer', 'fall', 'winter'].map((s) => (
              <option value={s} key={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Day
          <select
            aria-label="Schedule day"
            value={day}
            onChange={(e) => {
              setDay(Number(e.target.value));
              reset();
            }}
          >
            {Array.from({ length: 28 }, (_, i) => (
              <option value={i + 1} key={i}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label>
          <CloudSun size={16} />
          Planning weather
          <select
            aria-label="Schedule weather"
            value={weather}
            onChange={(e) => {
              setWeather(e.target.value);
              reset();
            }}
          >
            <option value="unknown">Unknown</option>
            <option value="dry">Dry</option>
            <option value="rain">Rain</option>
            <option value="green-rain">Green rain</option>
          </select>
        </label>
        {save && (season !== save.season || day !== save.day) && (
          <button
            className="text-button"
            onClick={() => {
              setSeason(save.season);
              setDay(save.day);
              reset();
            }}
          >
            Use saved date
          </button>
        )}
      </div>
      <label className="schedule-variant">
        Schedule variant
        <select
          aria-label="Schedule variant"
          value={variant}
          onChange={(e) => {
            setVariant(e.target.value);
            setSelected(0);
          }}
        >
          <option value="">Automatic for selected conditions</option>
          {Object.keys(schedules).map((k) => (
            <option value={k} key={k}>
              {translate(scheduleLabel(k))}
              {candidates.includes(k) ? ' · ' + translate('Matches selected conditions') : ''}
            </option>
          ))}
        </select>
      </label>
      <div className="schedule-summary">
        <Clock size={19} />
        <div>
          <strong>{key ? scheduleLabel(key) : 'No matching daily routine'}</strong>
          <small>
            {route.points.length} scheduled stops · {locations.length} locations
            {variant ? ' · Manual scenario' : ''}
          </small>
        </div>
      </div>
      {locations.length > 0 && (
        <button className="button schedule-map-toggle" onClick={() => setMapOpen(!mapOpen)}>
          <MapPin size={17} />
          {mapOpen ? 'Hide daily route map' : 'Show daily route map'}
        </button>
      )}
      {weather === 'unknown' && (
        <p className="notice amber">
          Weather is unknown. The displayed routine assumes no rain; rainy variants may replace it
          unless a higher-priority date rule applies.
        </p>
      )}
      {key.toLowerCase() === 'rain2' && (
        <p className="notice amber">
          This rainy routine is a random alternative; it is not guaranteed for the day.
        </p>
      )}
      {festival && (
        <p className="notice amber">
          Festival on this date: {String(festival)}. Normal daily schedules may be replaced.
        </p>
      )}
      {married && (
        <p className="fine-print">
          Marriage routines apply because this character is married to a farmer in the save.
        </p>
      )}
      <ol className="schedule-timeline detailed-timeline">
        {route.points.map((p, i) => (
          <li className={selected === i ? 'selected' : ''} key={`${p.time}:${i}`}>
            <div className="schedule-time">
              <span className="stop-number">{i + 1}</span>
              <strong>{scheduleTime(p.time)}</strong>
              <small>{p.arrival ? 'Arrival time' : 'Departs toward destination'}</small>
            </div>
            <div className="schedule-stop">
              <h4>
                <MapPin size={16} />
                {locationName(p.location, art)}
              </h4>
              <p>{scheduleActivity(p)}</p>
              <div className="schedule-stop-meta">
                {p.x >= 0 && p.y >= 0 && (
                  <span>
                    Tile {p.x}, {p.y}
                  </span>
                )}
                {p.facing !== null && (
                  <span>
                    {['Faces north', 'Faces east', 'Faces south', 'Faces west'][p.facing]}
                  </span>
                )}
                {route.points[i + 1] && (
                  <span>Next move: {scheduleTime(route.points[i + 1].time)}</span>
                )}
              </div>
              {p.x >= 0 && p.y >= 0 && (
                <button
                  className="text-button"
                  onClick={() => {
                    setSelected(i);
                    setMapOpen(true);
                  }}
                >
                  Show this stop on the game map
                  <ChevronRight size={14} />
                </button>
              )}
              <details className="schedule-raw">
                <summary>Reference details</summary>
                <code>
                  {route.key} · {p.location} ({p.x}, {p.y}){p.activity ? ` · ${p.activity}` : ''}
                </code>
              </details>
            </div>
          </li>
        ))}
      </ol>
      {!route.points.length && (
        <p className="empty-inline">
          No movement route is available for these conditions. Choose a listed variant to inspect
          another scenario.
        </p>
      )}
      {mapOpen && selectedMap && (
        <TileMapViewer
          key={`${name}:${route.key}:${selectedMap}`}
          locations={[selectedMap, ...locations.filter((l) => l !== selectedMap)]}
          target={point?.location === selectedMap && point.x >= 0 ? [point.x, point.y] : null}
          markers={markers}
          season={season}
          save={save}
        />
      )}
      {route.notes.map((note, i) => (
        <p className="route-unknown" key={i}>
          {note}
        </p>
      ))}
      <p className="fine-print">
        Festivals, island resort visits and story changes may replace this routine.
      </p>
      <Sources ids={['wiki-schedules']} onError={onError} />
    </section>,
  );
}
