import { matchesItem, storageSummary, containerLabelKey } from '../domain/storage-search';
import { useMemo, useState } from 'react';
import { PackageOpen, MapPin } from 'lucide-react';
import type { CompanionContext } from '../companion';
import { localize, translate, formatNumber, useLocale } from '../lib/locale';
import { Sprite, useArtwork } from '../components/Artwork';
import { itemName } from '../domain/installed';
import { TileMapViewer } from '../components/TileMapViewer';
import { locationName } from '../domain/locations';
import { locationMapIdentity } from '../domain/tilemap';
export function StorageView({
  save,
  search,
  planner,
  updatePlanner,
  plannerReady,
}: Pick<CompanionContext, 'save' | 'search' | 'planner' | 'updatePlanner' | 'plannerReady'>) {
  const { data: art } = useArtwork();
  const locale = useLocale();
  const [quality, setQuality] = useState('all'),
    [itemView, setItemView] = useState(false);
  const [location, setLocation] = useState('all'),
    [selected, setSelected] = useState<string | null>(null);
  const all = save?.containers ?? [];
  const query = search.trim().toLocaleLowerCase();
  const filtered = useMemo(
    () =>
      all.filter(
        (c) =>
          (location === 'all' || c.location === location) &&
          (quality === 'all' || c.items.some((i) => i.quality === Number(quality))) &&
          (!query ||
            c.items.some((i) => matchesItem(i.id, query, art)) ||
            `${planner.containerLabels[containerLabelKey(c)] ?? ''} ${c.name} ${c.location} ${translate(c.name)} ${c.items.map((i) => `${itemName(i.id, art)} ${translate(itemName(i.id, art))}`).join(' ')}`
              .toLocaleLowerCase()
              .includes(query)),
      ),
    [all, location, query, art, locale, quality, planner.containerLabels],
  );
  const summary = useMemo(
    () => storageSummary(filtered, query, quality === 'all' ? null : Number(quality), art),
    [filtered, query, quality, art, locale],
  );
  const chosen = filtered.find((c) => c.id === selected) ?? filtered[0];
  function address(location: string) {
    const identity = save?.locationMaps?.[location];
    return identity?.startsWith('Building/')
      ? translate(identity.slice(9))
      : locationName(location, art);
  }
  const chestSprite = (c: (typeof all)[number]) =>
    c.itemId ?? (c.kind === 'fridge' ? '(BC)216' : c.kind === 'junimo' ? '(BC)256' : '(BC)130');
  const totals = useMemo(() => {
    const groups = new Set<string>();
    let count = 0;
    for (const c of filtered) {
      if (c.sharedGroup && groups.has(c.sharedGroup)) continue;
      if (c.sharedGroup) groups.add(c.sharedGroup);
      count += c.items.reduce((sum, item) => sum + item.quantity, 0);
    }
    return count;
  }, [filtered]);
  return localize(
    <>
      <div className="view-intro">
        <div>
          <span className="eyebrow">FIND WHAT YOU ALREADY HAVE</span>
          <h1>Storage Finder</h1>
          <p>
            Saved chest and fridge contents, with their locations. Updates after the game saves.
          </p>
        </div>
        <PackageOpen size={32} />
      </div>
      {!save ? (
        <p className="panel">Select a farm to inspect its storage.</p>
      ) : save.containers === null ? (
        <p className="notice amber">
          Container locations are unavailable in this snapshot. Rescan the save.
        </p>
      ) : (
        <>
          <div className="toolbar">
            <label>
              Location{' '}
              <select
                aria-label="Storage location"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setSelected(null);
                }}
              >
                <option value="all">All locations</option>
                {[...new Set(all.map((c) => c.location))].sort().map((l) => (
                  <option key={l} value={l}>
                    {address(l)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quality
              <select
                aria-label="Storage quality"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
              >
                <option value="all">All qualities</option>
                <option value="0">Normal quality</option>
                <option value="1">Silver quality</option>
                <option value="2">Gold quality</option>
                <option value="4">Iridium quality</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={itemView}
                onChange={(e) => setItemView(e.target.checked)}
              />
              Item totals
            </label>
            <span>
              {filtered.length} containers · {formatNumber(totals)} items
            </span>
          </div>
          <p className="fine-print">
            Junimo Chest contents are shared and counted once. Special containers may be incomplete.
            A saved location does not guarantee current access.
          </p>
          {(itemView || query) && (
            <section className="panel">
              <h2>Matching item totals</h2>
              <p>Inventory and saved storage are separate. Shared contents count once.</p>
              {(
                save.players.find((f) => f.id === planner.farmerId) ?? save.players[0]
              ).inventoryStacks
                ?.filter(
                  (i) =>
                    matchesItem(i.id, query, art) &&
                    (quality === 'all' || i.quality === Number(quality)),
                )
                .map((i, n) => (
                  <p key={n}>
                    In backpack: {itemName(i.id, art)} × {i.quantity}
                  </p>
                ))}
              {summary.map((i) => (
                <div key={`${i.id}:${i.quality}`}>
                  <strong>
                    {itemName(i.id, art)} × {i.quantity}
                    {i.uncertain ? ' · Contents uncertain' : ''}
                  </strong>
                  <span>
                    {' '}
                    ·{' '}
                    {i.quality === 4
                      ? 'Iridium quality'
                      : i.quality === 2
                        ? 'Gold quality'
                        : i.quality === 1
                          ? 'Silver quality'
                          : 'Normal quality'}
                  </span>
                  {i.containers.map((id) => (
                    <button className="text-button" key={id} onClick={() => setSelected(id)}>
                      {all.find((c) => c.id === id)?.name} ·{' '}
                      {all.find((c) => c.id === id)?.tile?.join(', ')}
                    </button>
                  ))}
                </div>
              ))}
              {!summary.length && <p>No stored items match this search.</p>}
            </section>
          )}
          <div className="storage-layout">
            <div className="storage-list" role="group" aria-label="Saved containers">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  className={`panel storage-card ${chosen?.id === c.id ? 'selected' : ''}`}
                  onClick={() => setSelected(c.id)}
                  aria-pressed={chosen?.id === c.id}
                >
                  <Sprite id={chestSprite(c)} size={44} decorative />
                  <div>
                    <strong>{c.name}</strong>
                    <small data-l10n="off">{planner.containerLabels[containerLabelKey(c)]}</small>
                    <small>
                      <MapPin size={13} /> {address(c.location)}{' '}
                      {c.tile ? `(${c.tile.join(', ')})` : translate('Position unavailable')}
                    </small>
                    <small>
                      {c.items.length} stacks {c.sharedGroup && ' · Shared inventory'}{' '}
                      {!c.contentsKnown && ' · Contents uncertain'}
                    </small>
                  </div>
                </button>
              ))}
              {!filtered.length && <p>No containers match this search.</p>}
            </div>
            <section className="panel storage-detail">
              {chosen ? (
                <>
                  <h2>{chosen.name}</h2>
                  <label>
                    Address label
                    <input
                      aria-label="Container address label"
                      maxLength={80}
                      disabled={!plannerReady}
                      value={planner.containerLabels[containerLabelKey(chosen)] ?? ''}
                      onChange={(e) =>
                        updatePlanner({
                          ...planner,
                          containerLabels: {
                            ...planner.containerLabels,
                            [containerLabelKey(chosen)]: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <p className="fine-print">
                    Labels describe saved addresses, not physical chest identity. Verify labels
                    after moving or replacing containers.
                  </p>
                  <p>
                    {address(chosen.location)} ·{' '}
                    {chosen.tile?.join(', ') ?? translate('Position unavailable')}
                  </p>
                  {chosen.parentLocation && (
                    <p className="storage-address">
                      <MapPin size={16} />
                      {locationName(chosen.parentLocation, art)}{' '}
                      {chosen.buildingTile ? `(${chosen.buildingTile.join(', ')})` : ''} →{' '}
                      {address(chosen.location)} → {translate(chosen.name)}
                    </p>
                  )}
                  <p className="fine-print">
                    The map shows original game terrain with saved container positions. Contents and
                    positions update after saving; furniture and renovations may differ.
                  </p>
                  {!chosen.contentsKnown && (
                    <p className="notice amber">
                      Some contents cannot be confirmed. Displayed quantities may be incomplete.
                    </p>
                  )}
                  <div className="storage-items">
                    {chosen.items.map((item, index) => (
                      <div
                        key={index}
                        className={`storage-item ${query && matchesItem(item.id, query, art) && (quality === 'all' || item.quality === Number(quality)) ? 'search-match' : ''}`}
                      >
                        <Sprite id={item.id} size={36} decorative />
                        <span className="storage-item-label">
                          {itemName(item.id, art)}
                          <small>
                            {item.quality === 1
                              ? 'Silver quality'
                              : item.quality === 2
                                ? 'Gold quality'
                                : item.quality === 4
                                  ? 'Iridium quality'
                                  : 'Normal quality'}
                          </small>
                        </span>
                        <b>× {formatNumber(item.quantity)}</b>
                      </div>
                    ))}
                  </div>
                  {!chosen.items.length && (
                    <p>
                      {chosen.contentsKnown
                        ? 'This container is empty in the save.'
                        : 'Contents unavailable'}
                    </p>
                  )}
                  {chosen.tile &&
                  locationMapIdentity(chosen.location, save.farmType, save.locationMaps) ? (
                    <TileMapViewer
                      key={chosen.location}
                      locations={[chosen.location]}
                      season={save.season}
                      save={save}
                      target={chosen.tile}
                      markerLabel="Saved containers"
                      markers={all
                        .filter((c) => c.location === chosen.location && c.tile)
                        .map((c) => ({
                          id: c.id,
                          label: `${translate(c.name)} (${c.tile!.join(', ')})${c.id === chosen.id ? ' ★' : ''}`,
                          tile: c.tile!,
                        }))}
                    />
                  ) : (
                    <p className="fine-print">
                      A confirmed original map is unavailable for this interior. Use the saved
                      location and coordinates.
                    </p>
                  )}
                </>
              ) : (
                <p>Select a container to see its items and map.</p>
              )}
            </section>
          </div>
        </>
      )}
    </>,
  );
}
