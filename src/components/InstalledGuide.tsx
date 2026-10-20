import { localize } from '../lib/locale';
import { useState } from 'react';
import { Sprite, useArtwork } from './Artwork';
import {
  acquisition,
  itemId,
  itemName,
  seasons,
  conditionText,
  plantingWindow,
} from '../domain/installed';
import type { SaveProfile, Season, PlannerState } from '../domain/models';
import { buildingCount } from '../domain/supplies';
import { TileMapViewer } from './TileMapViewer';
import { Tag } from './common';
import { GameConditions } from './GameConditions';
import { selectedFarmer } from '../domain/supplies';
import { locationName, locationProfile, catalogLocations } from '../domain/locations';
import { displayText } from '../domain/display-text';
export function InstalledBrowser({
  type,
  matches,
  onDetail,
}: {
  type: string;
  matches: (text: string) => boolean;
  onDetail: (id: string) => void;
}) {
  const { data: art } = useArtwork();
  const rows =
    type === 'crops'
      ? Object.entries(art.gameData?.crops ?? {}).map(([id, crop]) => ({
          id: `crop:${id}`,
          sprite: itemId(crop.HarvestItemId),
          name: itemName(crop.HarvestItemId, art),
          hint: `${crop.Seasons.map((n: number) => seasons[n]).join(' / ')} · ${crop.DaysInPhase.reduce((a: number, b: number) => a + b, 0)} days`,
        }))
      : type === 'forage'
        ? [
            ...new Set(
              Object.values(art.gameData?.locations ?? {})
                .flatMap((l) => (l.Forage ?? []).map((f: any) => String(f.ItemId)))
                .filter((id) => id.startsWith('(O)')),
            ),
          ].map((id) => ({
            id: `object:${itemId(id)}`,
            sprite: id,
            name: itemName(id, art),
            hint: 'Forage routes & conditions',
          }))
        : type === 'locations'
          ? catalogLocations(art).map(([id, l]) => ({
              id: `location:${id}`,
              sprite: `location:${id}`,
              name: locationName(id, art),
              hint: `${l.Forage?.length ?? 0} forage rules · ${l.Fish?.length ?? 0} fish rules`,
            }))
          : Object.entries(art.gameData?.buildings ?? {}).map(([id, b]) => ({
              id: `building:${id}`,
              sprite: `building:${id}`,
              name: displayText(b.Name, id),
              hint: `${b.BuildCost}g · ${b.BuildDays} day(s) · ${b.BuildingToUpgrade ? 'Upgrade' : 'Construction'}`,
            }));
  return localize(
    <div className="encyclopedia-grid">
      {rows
        .filter((r) => matches(r.name) || matches(r.hint))
        .map((r) => (
          <button className="encyclopedia-card" key={r.id} onClick={() => onDetail(r.id)}>
            <Sprite id={r.sprite} name={r.name} size={48} decorative />
            <div>
              <strong>{r.name}</strong>
              <small>{r.hint}</small>
            </div>
          </button>
        ))}
      {!rows.length && <p>Connect the installed game to load this reference catalog.</p>}
    </div>,
  );
}
export function InstalledGuide({
  id,
  save,
  onAdd,
  planner,
  onPlannerChange,
}: {
  id: string;
  save: SaveProfile | null;
  onAdd: (id: string) => void;
  planner?: PlannerState;
  onPlannerChange?: (s: PlannerState) => void;
}) {
  const { data: art } = useArtwork();
  const [showMap, setShowMap] = useState(id.startsWith('location:'));
  const [type, ...parts] = id.split(':'),
    key = parts.join(':'),
    crop = art.gameData?.crops?.[key],
    building = art.gameData?.buildings?.[key],
    location = art.gameData?.locations?.[key];
  if (type === 'crop' && crop) {
    const {
      days,
      deadline: last,
      allYear,
    } = plantingWindow(crop, save?.season ?? seasons[crop.Seasons[0]] ?? 'spring');
    return localize(
      <section>
        <h3>{itemName(crop.HarvestItemId, art)}</h3>
        <Sprite
          id={crop.HarvestItemId}
          name={itemName(crop.HarvestItemId, art)}
          size={64}
          decorative
        />
        <dl className="profile-properties">
          {[
            ['Seasons', crop.Seasons.map((n: number) => seasons[n]).join(' / ')],
            ['Standard growth', `${days} watered days`],
            ['Regrowth', crop.RegrowDays > 0 ? `${crop.RegrowDays} days` : 'Single harvest'],
            ['Harvest amount', `${crop.HarvestMinStack}–${crop.HarvestMaxStack}`],
            ['Watering', crop.NeedsWatering ? 'Required' : 'Not required'],
            ['Trellis', crop.IsRaised ? 'Yes' : 'No'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p>
          {allYear
            ? 'This crop has no season-end planting deadline.'
            : last === null
              ? 'This crop does not grow outdoors in the selected save season.'
              : last > 28
                ? 'Growth continues into the next supported season; the end of this month is not a deadline.'
                : `Last standard planting day: day ${last}, for a day 28 harvest.`}{' '}
          Growth modifiers and protected growing areas can change availability.
        </p>
        {save &&
          last !== null &&
          crop.Seasons.includes(seasons.indexOf(save.season)) &&
          save.day > last && <Tag tone="amber">Standard planting deadline has passed</Tag>}
        <h4>Seed sources</h4>
        {acquisition(key, art).map((s, i) => (
          <p key={i}>{s}</p>
        ))}
        {crop.PlantableLocationRules?.map((r: any, i: number) => (
          <p key={i}>Planting condition: {conditionText(r.Condition)}</p>
        ))}
      </section>,
    );
  }
  if (type === 'building' && building)
    return localize(
      <section>
        <h3>{displayText(building.Name, key)}</h3>
        <p>{displayText(building.Description)}</p>
        <dl className="profile-properties">
          {[
            ['Cost', `${building.BuildCost}g`],
            ['Construction', `${building.BuildDays} day(s)`],
            ['Builder', building.Builder ?? 'Unknown'],
            ['Occupants', building.MaxOccupants],
            ['Footprint', `${building.Size?.X} × ${building.Size?.Y}`],
            ['Upgrade from', building.BuildingToUpgrade ?? 'New building'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <h4>Building materials</h4>
        {building.BuildMaterials?.map((m: any, i: number) => (
          <p key={i}>
            <Sprite id={m.ItemId} name={itemName(m.ItemId, art)} size={24} decorative /> {m.Amount}{' '}
            × {itemName(m.ItemId, art)}
          </p>
        ))}
        {building.BuildCondition ? (
          <GameConditions
            raw={building.BuildCondition}
            save={save}
            farmer={save ? selectedFarmer(save, planner?.farmerId) : null}
          />
        ) : (
          <p>No extra condition in the data</p>
        )}
        <p>Saved building: {save ? (buildingCount(save, key, art) ?? 'Unknown') : 'Unknown'}</p>
        {planner && onPlannerChange && (
          <label>
            Desired total
            <input
              aria-label="Desired building total"
              type="number"
              min={1}
              max={100}
              value={planner.buildingTargets[key] ?? 1}
              onChange={(e) =>
                onPlannerChange({
                  ...planner,
                  buildingTargets: {
                    ...planner.buildingTargets,
                    [key]: Math.max(1, Math.min(100, Math.trunc(Number(e.target.value)))),
                  },
                })
              }
            />
          </label>
        )}
        <button className="button" disabled={!save} onClick={() => onAdd(id)}>
          Plan construction
        </button>
      </section>,
    );
  if (type === 'location' && location)
    return localize(
      <section>
        <h3>{locationName(key, art)}</h3>
        <p>{locationProfile(key).description}</p>
        <h4>How to reach this place</h4>
        <p>{locationProfile(key).access}</p>
        <p>
          Arrival tile:{' '}
          {location.DefaultArrivalTile
            ? `${location.DefaultArrivalTile.X}, ${location.DefaultArrivalTile.Y}`
            : 'Not specified'}
        </p>
        <button className="button" onClick={() => setShowMap((v) => !v)}>
          {showMap ? 'Hide original location map' : 'Show original location map'}
        </button>
        {showMap && (
          <TileMapViewer
            locations={locationProfile(key).maps}
            season={save?.season ?? 'spring'}
            save={save}
          />
        )}
        <h4>Forage opportunities</h4>
        {location.Forage?.map((f: any, i: number) => (
          <p key={i}>
            <Sprite id={f.ItemId} name={itemName(f.ItemId, art)} size={24} decorative />{' '}
            {itemName(f.ItemId, art)} · {f.Season === null ? 'Any season' : seasons[f.Season]} ·{' '}
            {conditionText(f.Condition)}
          </p>
        ))}
        <p>
          Forage spawns and artifact spots are random; these rules do not guarantee an item will be
          present.
        </p>
      </section>,
    );
  if (type === 'object')
    return localize(
      <section>
        <h3>Acquisition routes</h3>
        {acquisition(key, art).map((s, i) => (
          <p key={i}>{s}</p>
        ))}
      </section>,
    );
  return null;
}
export function CropCalendar({
  season,
  save,
  matches,
  onDetail,
}: {
  season: Season;
  save: SaveProfile | null;
  matches: (s: string) => boolean;
  onDetail: (id: string) => void;
}) {
  const { data: art } = useArtwork();
  return localize(
    <section className="panel">
      <h3>Crop planting calendar</h3>
      <p>
        Standard watered growth without speed modifiers. Protected growing areas and special
        planting rules may differ.
      </p>
      <div className="crop-calendar">
        {Object.entries(art.gameData?.crops ?? {})
          .filter(
            ([, c]) =>
              c.Seasons.includes(seasons.indexOf(season)) &&
              matches(itemName(c.HarvestItemId, art)),
          )
          .map(([seed, c]) => {
            const { days, deadline } = plantingWindow(c, season);
            return localize(
              <button
                className="collection-row"
                key={seed}
                onClick={() => onDetail(`crop:${seed}`)}
              >
                <Sprite
                  id={c.HarvestItemId}
                  name={itemName(c.HarvestItemId, art)}
                  size={32}
                  decorative
                />
                <span>
                  <strong>{itemName(c.HarvestItemId, art)}</strong>
                  <small>
                    {days} days ·{' '}
                    {deadline === null
                      ? 'No seasonal deadline'
                      : deadline > 28
                        ? 'Continues next season'
                        : `plant by day ${deadline}`}
                    {c.RegrowDays > 0 ? ` · regrows in ${c.RegrowDays} days` : ''}
                  </small>
                </span>
                <Tag
                  tone={
                    deadline !== null && save?.season === season && save.day > deadline
                      ? 'amber'
                      : 'green'
                  }
                >
                  {deadline !== null && save?.season === season && save.day > deadline
                    ? 'Deadline passed'
                    : deadline === null
                      ? 'All year'
                      : deadline > 28
                        ? 'Next season'
                        : `Day ${deadline}`}
                </Tag>
              </button>,
            );
          })}
      </div>
    </section>,
  );
}
