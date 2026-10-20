import { localize } from '../lib/locale';
import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { fishProfiles, methodLabel, routesFor, timeLabel, fishingRegions } from '../domain/fishing';
import { knowledge, versionFamily } from '../domain/knowledge';
import { entryProgress } from '../domain/progress';
import type { SaveProfile } from '../domain/models';
import { Sprite } from './Artwork';
import { Tag } from './common';
import { selectedFarmer } from '../domain/supplies';
export function FishingBrowser({
  save,
  matches,
  onDetail,
  farmerId,
}: {
  save: SaveProfile | null;
  matches: (s: string) => boolean;
  onDetail: (id: string, routeIndex?: number) => void;
  farmerId?: string;
}) {
  const [season, setSeason] = useState('all'),
    [region, setRegion] = useState('all'),
    [missing, setMissing] = useState(false),
    [method, setMethod] = useState('all');
  const entries = knowledge.entries.filter((e) => {
    if (
      e.type !== 'fishing' ||
      !e.versions.includes(versionFamily(save?.gameVersion ?? null) ?? '1.6')
    )
      return false;
    const p = fishProfiles[e.id];
    const routes = routesFor(p, save?.gameVersion ?? '1.6').filter(
      (r) =>
        !r.magicOnly &&
        (season === 'all' || r.seasons.some((s) => s === season)) &&
        (region === 'all' || r.region === region),
    );
    return (
      routes.length > 0 &&
      (method === 'all' || p.method === method) &&
      (matches(e.name) || routes.some((r) => matches(r.area))) &&
      (!missing ||
        !save ||
        entryProgress(e, selectedFarmer(save, farmerId), versionFamily(save.gameVersion) !== null)
          .done !== true)
    );
  });
  return localize(
    <div className="fishing-browser">
      <div className="fishing-filters">
        <label>
          Season
          <select
            aria-label="Fish season"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
          >
            <option value="all">All seasons</option>
            {['spring', 'summer', 'fall', 'winter'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Location
          <select
            aria-label="Fish location"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="all">Every location</option>
            {Object.entries(fishingRegions).map(([key, r]) => (
              <option key={key} value={key}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Method
          <select
            aria-label="Fishing method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="all">All methods</option>
            <option value="rod">Fishing rod</option>
            <option value="crab-pot">Crab Pot</option>
            <option value="rod-collectible">Rod collectibles</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={missing}
            onChange={(e) => setMissing(e.target.checked)}
            disabled={!save}
          />
          Missing only
        </label>
        {save && (
          <button className="button" onClick={() => setSeason(save.season)}>
            Use saved season
          </button>
        )}
      </div>
      <p className="fish-result-count">
        {entries.length} matching collection entries · dates, weather, equipment and access still
        apply.
      </p>
      <div className="encyclopedia-grid">
        {entries.map((e) => {
          const p = fishProfiles[e.id];
          const route = routesFor(p, save?.gameVersion ?? '1.6').find(
            (r) =>
              !r.magicOnly &&
              (season === 'all' || r.seasons.some((s) => s === season)) &&
              (region === 'all' || r.region === region),
          )!;
          const done = save
            ? entryProgress(
                e,
                selectedFarmer(save, farmerId),
                versionFamily(save.gameVersion) !== null,
              ).done
            : null;
          return localize(
            <button
              className="encyclopedia-card fish-card"
              key={e.id}
              onClick={() =>
                onDetail(e.id, routesFor(p, save?.gameVersion ?? '1.6').indexOf(route))
              }
            >
              <Sprite id={e.id} name={e.name} size={48} decorative />
              <div>
                <strong>{e.name}</strong>
                <small>{route.area}</small>
                <small>
                  {p.method === 'crab-pot' ? 'Collect next day' : timeLabel(route)} ·{' '}
                  {route.weather === 'any' ? 'Any weather' : route.weather}
                </small>
                <Tag tone="blue">{methodLabel(p)}</Tag>
              </div>
              {done === true ? <Check size={18} /> : <ChevronRight size={16} />}
            </button>,
          );
        })}
      </div>
      {entries.length === 0 && (
        <div className="empty">
          <h3>No fish match these filters</h3>
          <p>Try another season or location, or include fish you have already caught.</p>
          <button
            className="button"
            onClick={() => {
              setSeason('all');
              setRegion('all');
              setMethod('all');
              setMissing(false);
            }}
          >
            Reset fishing filters
          </button>
        </div>
      )}
    </div>,
  );
}
