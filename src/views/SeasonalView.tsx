import { localize } from '../lib/locale';
import { ArrowRight, CalendarDays, ChevronRight, Heart, Wheat } from 'lucide-react';
import { Sprite } from '../components/Artwork';
import { useState } from 'react';
import { selectedFarmer } from '../domain/supplies';
import { entryProgress } from '../domain/progress';
import { versionFamily } from '../domain/knowledge';
import { Sources, Tag } from '../components/common';
import { CropCalendar } from '../components/InstalledGuide';
import { entriesFor } from '../domain/knowledge';
import { fishProfiles, routesFor, timeLabel, methodLabel } from '../domain/fishing';
import { villagerProfiles, birthdayLabel } from '../domain/social';
import { type SaveProfile } from '../domain/models';

import type { CompanionContext } from '../companion';
import { titleCase } from '../companion';

export function SeasonalView({
  setDetail,
  season,
  setSeason,
  report,
  save,
  matches,
  planner,
}: Pick<
  CompanionContext,
  'setDetail' | 'season' | 'setSeason' | 'report' | 'save' | 'matches' | 'planner'
>) {
  const [missingOnly, setMissingOnly] = useState(false);
  const farmer = save ? selectedFarmer(save, planner.farmerId) : null;
  return localize(
    <>
      <div className="view-intro">
        <div>
          <span className="eyebrow">THE RIGHT PLACE, THE RIGHT SEASON</span>
          <h1>Seasonal Planner</h1>
          <p>
            {save
              ? `Saved date: ${titleCase(save.season)} ${save.day}, Year ${save.year}.`
              : 'Choose a season to explore the verified guide subset.'}{' '}
            Future weather is unknown.
          </p>
        </div>
        <select
          aria-label="Planning season"
          value={season}
          onChange={(e) => setSeason(e.target.value as SaveProfile['season'])}
        >
          {['spring', 'summer', 'fall', 'winter'].map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </select>
      </div>
      <div className="season-banner">
        <CalendarDays size={28} />
        <div>
          <h2>{titleCase(season)} field notes</h2>
          <p>
            {save && season === save.season
              ? `${28 - save.day} days remain after the saved day. `
              : ''}
            Each entry uses a route for the selected season. Weather, festival dates, region access
            and equipment still need checking.
          </p>
        </div>
      </div>
      <section className="panel">
        <h3>
          Fishing opportunities <Tag>Full collection guide</Tag>
        </h3>
        {save && (
          <label className="setting-row">
            <span>Only fish missing from this farmer’s collection</span>
            <input
              type="checkbox"
              checked={missingOnly}
              onChange={(e) => setMissingOnly(e.target.checked)}
            />
          </label>
        )}
        <div className="collection-list">
          {entriesFor('fishing', save?.gameVersion ?? '1.6')
            .filter(
              (e) =>
                routesFor(fishProfiles[e.id], save?.gameVersion ?? '1.6').some(
                  (r) => !r.magicOnly && r.seasons.includes(season),
                ) &&
                matches(e.name) &&
                (!missingOnly ||
                  !farmer ||
                  entryProgress(e, farmer, versionFamily(save?.gameVersion) !== null).done !==
                    true),
            )
            .map((e) => {
              const p = fishProfiles[e.id];
              const route = routesFor(p, save?.gameVersion ?? '1.6').find(
                (r) => !r.magicOnly && r.seasons.includes(season),
              )!;
              const progress = farmer
                ? entryProgress(e, farmer, versionFamily(save?.gameVersion) !== null)
                : null;
              const daysLeft =
                save?.season === season ? (route.days ? route.days[1] : 28) - save.day : null;
              return localize(
                <button
                  className="collection-row"
                  key={e.id}
                  onClick={() =>
                    setDetail(e.id, routesFor(p, save?.gameVersion ?? '1.6').indexOf(route))
                  }
                >
                  <Sprite id={e.id} name={e.name} size={32} decorative />
                  <span>
                    <strong>{e.name}</strong>
                    <small>
                      {route.area} ·{' '}
                      {p.method === 'crab-pot' ? 'Next-day Crab Pot' : timeLabel(route)}
                      {route.days ? ` · Days ${route.days.join('–')}` : ''}
                    </small>
                    {progress && (
                      <small>
                        {progress.done === true
                          ? 'Already caught'
                          : progress.done === false
                            ? 'Missing from this farmer’s collection'
                            : 'Collection evidence unknown'}
                      </small>
                    )}
                    {progress?.done === false &&
                      daysLeft !== null &&
                      daysLeft >= 0 &&
                      daysLeft <= 3 && <Tag tone="amber">Standard route window ends soon</Tag>}
                    {daysLeft !== null && daysLeft < 0 && (
                      <Tag tone="amber">This date window has passed</Tag>
                    )}
                  </span>
                  <Tag tone={route.weather === 'any' ? 'green' : 'amber'}>
                    {route.weather === 'any' ? methodLabel(p) : `${route.weather} needed · unknown`}
                  </Tag>
                  <ChevronRight size={14} />
                </button>,
              );
            })}
        </div>
      </section>
      <CropCalendar season={season} save={save} matches={matches} onDetail={setDetail} />
      <section className="panel birthday-panel">
        <h3>Birthdays this season</h3>
        <p>
          A birthday calendar from the cited villager profiles. Check schedules in game before
          travelling.
        </p>
        <div className="birthday-grid">
          {Object.values(villagerProfiles)
            .filter((p) => p.birthday.season === season && matches(p.name))
            .sort((a, b) => a.birthday.day - b.birthday.day)
            .map((p) => (
              <button
                className="birthday-card"
                key={p.name}
                onClick={() => setDetail(`character:${p.name}`)}
              >
                <Sprite id={`character:${p.name}`} name={p.name} size={48} decorative />
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {birthdayLabel(p)}
                    {save && save.season === season && save.day === p.birthday.day
                      ? ' · Today!'
                      : ''}
                  </small>
                </span>
              </button>
            ))}
        </div>
      </section>
      {season === 'fall' && (
        <div className="season-extras">
          <section className="panel">
            <Wheat size={23} />
            <h3>Leave room for a Pumpkin</h3>
            <p>
              Pumpkins take 13 watered days to grow. With no speed modifiers, plant by Fall 15 for a
              Fall 28 harvest. Protected growing areas are an alternative, if available.
            </p>
            {save && save.season === 'fall' && save.day > 15 && (
              <Tag tone="amber">Standard planting deadline has passed</Tag>
            )}
            <button className="text-button" onClick={() => setDetail('cooking:236')}>
              Plan Pumpkin Soup <ArrowRight size={14} />
            </button>
            <Sources ids={['wiki-pumpkin']} onError={report} />
          </section>
          <section className="panel">
            <Heart size={23} />
            <h3>Robin’s birthday · Fall 21</h3>
            <p>
              Goat Cheese, Peach and Spaghetti are loved gifts. Building work can affect her
              availability; check her location in game.
            </p>
            <Sources ids={['wiki-robin']} onError={report} />
          </section>
        </div>
      )}
      <p className="fine-print">
        All {entriesFor('fishing', save?.gameVersion ?? '1.6').length} version-applicable fish
        collection entries have a location guide. Region unlocks, current weather and time of day
        are not automatically verified.
      </p>
    </>,
  );
}
