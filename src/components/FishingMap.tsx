import { MapWorkspace } from './MapWorkspace';
import { useMapWheel } from '../lib/map-gestures';
import { localize } from '../lib/locale';
import { useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useArtwork } from './Artwork';
import type { FishRoute } from '../domain/fishing';
import type { SaveProfile, Season } from '../domain/models';
import {
  mapRegion,
  seasonalSheet,
  showMapLayer,
  fishingHighlights,
  focusedMapView,
} from '../domain/world-map';

export function FishingMap({ route, save }: { route: FishRoute; save: SaveProfile | null }) {
  const viewport = useRef<HTMLDivElement>(null),
    drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  useMapWheel(viewport, zoom, setZoom, 1, 8);
  const { data, loading, choose, error } = useArtwork();
  const [season, setSeason] = useState<Season | null>(null),
    [focused, setFocused] = useState(false);
  const selectedSeason = season ?? save?.season ?? 'spring';
  const region = mapRegion(route),
    map = data.maps?.[region];
  if (!map)
    return localize(
      <div className="map-unavailable">
        <MapPin size={24} />
        <strong>{loading ? 'Loading the in-game map…' : 'In-game map unavailable'}</strong>
        <p>
          Connect your Stardew Valley 1.6+ installation to display its original map. The directions
          below are available offline.
        </p>
        {!loading && (
          <button className="button" onClick={() => void choose()}>
            Choose game folder
          </button>
        )}
        {error && <p role="alert">{error}</p>}
      </div>,
    );
  const highlights = fishingHighlights(map, route);
  const view = focused
    ? focusedMapView(
        map,
        highlights.map((h) => h.rect),
      )
    : `0 0 ${map.width} ${map.height}`;
  const layers = map.layers.filter((l) => showMapLayer(l, save?.farmType));
  return localize(
    <MapWorkspace title={route.area}>
      <figure className="fishing-map">
        <div className="map-controls">
          <strong>
            {region === 'GingerIsland' ? 'Ginger Island' : 'Stardew Valley'} · in-game map
          </strong>
          {region === 'Valley' && (
            <label>
              Map season
              <select
                aria-label="Map season"
                value={selectedSeason}
                onChange={(e) => setSeason(e.target.value as Season)}
              >
                {(['spring', 'summer', 'fall', 'winter'] as const).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            className="button"
            aria-pressed={focused}
            onClick={() => {
              setFocused((v) => !v);
              setZoom(1);
              viewport.current?.scrollTo(0, 0);
            }}
          >
            {focused ? 'Show full map' : 'Focus on area'}
          </button>
        </div>
        <div className="map-quick-controls">
          <button className="button" onClick={() => setZoom((z) => Math.max(1, z / 1.5))}>
            −
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button className="button" onClick={() => setZoom((z) => Math.min(8, z * 1.5))}>
            +
          </button>
          <button
            className="button"
            onClick={() => {
              setZoom(1);
              viewport.current?.scrollTo(0, 0);
            }}
          >
            Fit map
          </button>
        </div>
        <div
          className="fishing-map-scroll"
          ref={viewport}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            const box = e.currentTarget;
            drag.current = { x: e.clientX, y: e.clientY, left: box.scrollLeft, top: box.scrollTop };
            box.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (d) {
              e.currentTarget.scrollLeft = d.left - (e.clientX - d.x);
              e.currentTarget.scrollTop = d.top - (e.clientY - d.y);
            }
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          <svg
            viewBox={view}
            role="img"
            aria-label={`Fishing area guide: ${route.area}`}
            style={{
              aspectRatio: `${map.width}/${map.height}`,
              width: `${zoom * 100}%`,
              maxWidth: 'none',
              height: 'auto',
            }}
          >
            {layers.map((layer, i) => {
              const sheetName = seasonalSheet(layer.sheet, selectedSeason);
              const sheet = data.sheets[sheetName] ?? data.sheets[layer.sheet];
              if (!sheet) return null;
              const { source: s, area: a } = layer;
              return localize(
                <svg
                  key={i}
                  x={a.x}
                  y={a.y}
                  width={a.width}
                  height={a.height}
                  viewBox={`${s.x} ${s.y} ${s.width} ${s.height}`}
                  overflow="hidden"
                  data-game-sheet={sheetName}
                >
                  <image
                    href={sheet.url}
                    width={sheet.width}
                    height={sheet.height}
                    imageRendering="pixelated"
                  />
                </svg>,
              );
            })}
            {highlights.map((h) => {
              const r = h.rect,
                cx = r.x + r.width / 2,
                cy = r.y + r.height / 2;
              return localize(
                <g key={h.name} className="game-map-highlight" data-map-location={h.name}>
                  <title>
                    {h.entrance ? 'Entrance' : 'Region'}: {route.area}
                  </title>
                  {!h.entrance && (
                    <rect
                      x={r.x}
                      y={r.y}
                      width={r.width}
                      height={r.height}
                      fill="#ffe295"
                      fillOpacity="0.14"
                      stroke="#fff1b8"
                      strokeWidth="2.5"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={h.entrance ? 4 : 3}
                    fill="#a92f24"
                    stroke="#fff1b8"
                    strokeWidth="1.5"
                  />
                  <circle cx={cx} cy={cy} r="1" fill="#fff1b8" />
                </g>,
              );
            })}
          </svg>
        </div>
        <figcaption>
          {highlights.some((h) => h.entrance)
            ? 'The marker shows the entrance or access point; follow the directions below for the interior fishing spot.'
            : highlights.length
              ? 'The outline shows the region. Follow the directions below for the exact shoreline and casting spot.'
              : 'Follow the directions below; this installation has no matching map position.'}{' '}
          Original map and coordinates read from your installed game.{' '}
          {region === 'Valley' ? `${selectedSeason} reference. ` : ''}Access and progression
          overlays are not confirmed here.
        </figcaption>
      </figure>
    </MapWorkspace>,
  );
}
