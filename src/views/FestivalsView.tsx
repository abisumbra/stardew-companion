import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  ListPlus,
  ExternalLink,
  ChevronRight,
  Check,
  PartyPopper,
} from 'lucide-react';
import { localize, useLocale, translate } from '../lib/locale';
import { sourceLink } from '../lib/backend';
import {
  festivals,
  festivalDistance,
  festivalMap,
  festivalSupported,
  festivalUrl,
  type FestivalText,
} from '../domain/festivals';
import { locationName } from '../domain/locations';
import { scheduleTime } from '../domain/schedules';
import { Sprite, useArtwork } from '../components/Artwork';
import { Tag } from '../components/common';
import { TileMapViewer } from '../components/TileMapViewer';
import type { CompanionContext } from '../companion';
export function FestivalsView({
  save,
  planner,
  plannerReady,
  updatePlanner,
  matches,
  report,
}: Pick<
  CompanionContext,
  'save' | 'planner' | 'plannerReady' | 'updatePlanner' | 'matches' | 'report'
>) {
  const locale = useLocale(),
    { data: art } = useArtwork(),
    text = (t: FestivalText) => locale === 'tr' ? t.tr : translate(t.en);
  const closest = save
    ? [...festivals]
        .filter((f) => festivalSupported(f, save.gameVersion))
        .sort((a, b) => festivalDistance(a, save) - festivalDistance(b, save))[0]
    : festivals[0];
  const [selected, setSelected] = useState(closest.id),
    [season, setSeason] = useState('all'),
    [year, setYear] = useState(save?.year ?? 1),
    [mapOpen, setMapOpen] = useState(false);
  const available = festivals.filter((f) => festivalSupported(f, save?.gameVersion)),
    visible = available.filter(
      (f) =>
        (season === 'all' || f.season === season) && (matches(f.name.en) || matches(f.name.tr)),
    );
  const f = available.find((f) => f.id === selected) ?? available[0];
  const map = festivalMap(f, year, save?.gameVersion ?? '1.6');
  const icon = (name: string) =>
    name.includes(':')
      ? name
      : (art.items.find((e) => e.name === name)?.id ??
        `object:${Object.keys(art.gameData?.objects ?? {}).find((id) => art.gameData!.objects![id].Name === name) ?? name}`);
  const keys = f.steps.map((_, i) => `festival:${f.id}:${year}:${i}`),
    planned = keys.every((id) => planner.manual.some((m) => m.id === id));
  const steps = useMemo(
    () =>
      f.steps.map((step, i) => ({
        id: keys[i],
        title: `${text(f.name)} · ${text(step.title)}`.slice(0, 500),
        priority: 'normal' as const,
        done: false,
      })),
    [f, year, locale],
  );
  return localize(
    <>
      <div className="view-intro">
        <div>
          <span className="eyebrow">MAKE THE DAY COUNT</span>
          <h1>Festivals</h1>
          <p>Every festival, its preparation and the best opportunities to pursue.</p>
        </div>
        <Tag tone="green">
          <PartyPopper size={15} />
          {available.length} festivals
        </Tag>
      </div>
      <div className="festival-page-controls">
        <div className="filter-tabs">
          {['all', 'spring', 'summer', 'fall', 'winter'].map((s) => (
            <button
              key={s}
              aria-pressed={season === s}
              className={season === s ? 'active' : ''}
              onClick={() => setSeason(s)}
            >
              {s === 'all' ? 'All seasons' : s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <label>
          Guide year
          <input
            aria-label="Festival guide year"
            type="number"
            min={1}
            max={9999}
            value={year}
            onChange={(e) =>
              setYear(Math.max(1, Math.min(9999, Math.trunc(Number(e.target.value) || 1))))
            }
          />
        </label>
      </div>
      <div className="festival-layout">
        <nav className="festival-index" aria-label="Festival selection">
          {visible.map((festival) => (
            <button
              className={
                festival.id === f.id ? 'festival-index-card active' : 'festival-index-card'
              }
              key={festival.id}
              aria-pressed={festival.id === f.id}
              onClick={() => {
                setSelected(festival.id);
                setMapOpen(false);
              }}
            >
              <Sprite id={icon(festival.icon)} name={text(festival.name)} size={48} decorative />
              <span>
                <strong>{text(festival.name)}</strong>
                <small>
                  {translate(festival.season[0].toUpperCase() + festival.season.slice(1))}{' '}
                  {festival.days.join('–')}
                </small>
                <small>
                  {scheduleTime(festival.start)}–{scheduleTime(festival.end)}
                </small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
          {!visible.length && <p>No festivals match this filter.</p>}
        </nav>
        <article className="panel festival-guide" aria-label="Festival guide">
          <header className={`festival-hero season-${f.season}`}>
            <Sprite id={icon(f.icon)} name={text(f.name)} size={80} decorative />
            <div>
              <span className="eyebrow">
                {f.since === '1.6' ? 'STARDEW VALLEY 1.6' : 'VALLEY TRADITIONS'}
              </span>
              <h2>{text(f.name)}</h2>
              <p>{text(f.summary)}</p>
            </div>
          </header>
          <div className="festival-facts">
            <div>
              <CalendarDays size={19} />
              <span>
                Date
                <strong>
                  {translate(f.season[0].toUpperCase() + f.season.slice(1))} {f.days.join('–')}
                </strong>
              </span>
            </div>
            <div>
              <Clock size={19} />
              <span>
                Entry window
                <strong>
                  {scheduleTime(f.start)}–{scheduleTime(f.end)}
                </strong>
              </span>
            </div>
            <div>
              <MapPin size={19} />
              <span>
                Location<strong>{locationName(f.location, art)}</strong>
              </span>
            </div>
          </div>
          <p className="fine-print">
            {f.returns
              ? `${translate('Returns home at')}: ${scheduleTime(f.returns)}`
              : 'Time continues during this festival. Care for animals and plan the trip home.'}
            {f.evenMap
              ? ` · ${translate(year % 2 === 0 ? 'Even-year layout' : 'Odd-year layout')}`
              : ''}
          </p>
          <div className="section-heading">
            <h3>Make the most of this festival</h3>
            <button
              className="button primary"
              disabled={!save || !plannerReady || planned}
              onClick={() =>
                updatePlanner({
                  ...planner,
                  manual: [
                    ...planner.manual,
                    ...steps.filter((s) => !planner.manual.some((m) => m.id === s.id)),
                  ],
                })
              }
            >
              {planned ? <Check size={17} /> : <ListPlus size={17} />}{' '}
              {planned ? 'In your planner' : 'Plan festival preparation'}
            </button>
          </div>
          <ol className="festival-steps">
            {f.steps.map((step, i) => {
              const done = planner.manual.find((m) => m.id === keys[i])?.done;
              return (
                <li key={i} className={done ? 'done' : ''}>
                  <div className="festival-step-number">{i + 1}</div>
                  <Sprite id={icon(step.icon)} name={text(step.title)} size={48} decorative />
                  <div>
                    <h4>
                      {text(step.title)}
                      {done && <Check size={17} />}
                    </h4>
                    <p>{text(step.body)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="notice amber">{text(f.warning)}</p>
          <div className="festival-map-heading">
            <h3>Festival location and layout</h3>
            <button className="button" onClick={() => setMapOpen(!mapOpen)}>
              <MapPin size={17} />
              {mapOpen ? 'Hide festival map' : 'Show festival map'}
            </button>
          </div>
          {mapOpen && (
            <TileMapViewer
              key={map}
              locations={[map, ...(map !== f.location ? [f.location] : [])]}
              season={f.season}
              save={save}
            />
          )}
          <p className="fine-print">
            Maps use the installed game’s original tiles. Actors, booths and temporary objects can
            be added by the running event; a static map does not show every live decoration.
          </p>
          <div className="sources">
            <button
              className="source"
              onClick={() => void sourceLink(festivalUrl(f)).catch(report)}
            >
              <ExternalLink size={15} />
              Stardew Valley Wiki · {f.name.en}
            </button>
            <small>
              Checked 2026-10-17 · CC BY-NC-SA 3.0 · {f.since === '1.6' ? '1.6' : '1.5 / 1.6'}
            </small>
          </div>
        </article>
      </div>
    </>,
  );
}
