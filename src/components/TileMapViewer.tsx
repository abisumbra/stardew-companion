import { MapWorkspace } from './MapWorkspace';
import { renderOriginalMap } from '../lib/map-renderer';
import { useMapWheel } from '../lib/map-gestures';
import { localize, translate } from '../lib/locale';
import { useEffect, useRef, useState, useId, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  TileMapSchema,
  walkingPath,
  locationMapIdentity,
  mapExits,
  withObstacles,
  type TileMap,
} from '../domain/tilemap';
import { desktop } from '../lib/backend';
import type { Season, SaveProfile } from '../domain/models';
import { useArtwork } from './Artwork';
import { locationName } from '../domain/locations';
import { Maximize2, ZoomIn, ZoomOut, LocateFixed, Hand, Flag, Navigation } from 'lucide-react';
export type MapMarker = { id: string; label: string; tile: [number, number]; location?: string };
const cache = new Map<string, TileMap>();
let cacheArtwork: unknown;
export function TileMapViewer({
  locations,
  season = 'spring',
  target,
  save,
  markers = [],
  markerLabel = 'Schedule stops',
}: {
  locations: string[];
  season?: Season;
  target?: [number, number] | null;
  save?: SaveProfile | null;
  markers?: MapMarker[];
  markerLabel?: string;
}) {
  const { data: art } = useArtwork();
  if (cacheArtwork !== art) {
    cache.clear();
    cacheArtwork = art;
  }
  const helpId = useId();
  const [coordinate, setCoordinate] = useState<[number, number]>([0, 0]);
  const [pointMode, setPointMode] = useState('pan');
  const [visited, setVisited] = useState<string[]>([]);
  const [useObstacles, setUseObstacles] = useState(true);
  const [location, setLocation] = useState(locations[0] ?? ''),
    [data, setData] = useState<TileMap | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [zoom, setZoom] = useState(0),
    [grid, setGrid] = useState(false),
    [start, setStart] = useState<[number, number] | null>(null),
    [end, setEnd] = useState<[number, number] | null>(target ?? null),
    [hover, setHover] = useState<[number, number] | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null),
    drawSource = useRef<HTMLCanvasElement | null>(null);
  const viewport = useRef<HTMLDivElement>(null),
    drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(600),
    [viewportHeight, setViewportHeight] = useState(440);
  const resize = useRef<ResizeObserver | null>(null);
  const attachViewport = useCallback((node: HTMLDivElement | null) => {
    resize.current?.disconnect();
    viewport.current = node;
    if (!node) return;
    const measure = () => {
      if (node.clientWidth > 50) setViewportWidth(node.clientWidth);
      if (node.clientHeight > 50) setViewportHeight(node.clientHeight);
    };
    resize.current = new ResizeObserver(measure);
    resize.current.observe(node);
    measure();
  }, []);
  useEffect(() => () => resize.current?.disconnect(), []);
  const fit = data
    ? Math.min(
        Math.max(100, viewportWidth - 4) / (data.width * data.tileWidth),
        (viewportHeight - 4) / (data.height * data.tileHeight),
        3,
      )
    : 1;
  const scale = zoom || fit;
  useMapWheel(viewport, scale, setZoom, 0.1, 4);
  useEffect(() => {
    setLocation(locations[0] ?? '');
    setVisited([]);
  }, [locations[0]]);
  const actual = location || (locations[0] ?? '');
  const identity = locationMapIdentity(actual, save?.farmType, save?.locationMaps);
  function mapName(location: string) {
    const resolved = locationMapIdentity(location, save?.farmType, save?.locationMaps);
    return resolved?.startsWith('Building/')
      ? (art.gameData?.buildings?.[resolved.slice(9)]?.Name ?? resolved.slice(9))
      : locationName(location, art);
  }
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    setBusy(true);
    setStart(null);
    setZoom(0);
    viewport.current?.scrollTo(0, 0);
    const key = `${art.root}:${identity}:${season}`;
    const request = cache.has(key)
      ? Promise.resolve(cache.get(key)!)
      : !identity
        ? Promise.reject(
            'The map for this custom farm cannot be confirmed from the installed game.',
          )
        : desktop
          ? invoke('get_location_map', { location: identity, season }).then((raw) =>
              TileMapSchema.parse(raw),
            )
          : Promise.reject('Open the desktop app and connect the game to load tile maps.');
    void request
      .then((map) => {
        if (cache.size >= 6) cache.delete(cache.keys().next().value!);
        cache.set(key, map);
        if (active) setData(map);
      })
      .catch((e) => {
        if (active) setError(String(e));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [art, actual, season, identity]);
  useEffect(() => {
    if (!data) return;
    let active = true;
    void renderOriginalMap(data)
      .then((layer) => {
        if (!active) return;
        drawSource.current = layer;
        renderLatest.current();
      })
      .catch((e) => active && setError(String(e)));
    return () => {
      active = false;
      drawSource.current = null;
    };
  }, [data]);
  useEffect(() => {
    setEnd(actual === locations[0] ? (target ?? null) : null);
  }, [actual, locations[0], target?.[0], target?.[1]]);
  const obstacles = save?.mapObstacles?.[actual] ?? [];
  const activeMarkers = markers.filter((m) => !m.location || m.location === actual);
  const path = useMemo(
    () =>
      data && start && end
        ? walkingPath(useObstacles ? withObstacles(data, obstacles) : data, start, end)
        : null,
    [data, start, end, useObstacles, save?.mapObstacles, actual],
  );
  function render() {
    if (!data || !canvas.current || !drawSource.current) return;
    const ctx = canvas.current.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
    ctx.drawImage(drawSource.current, 0, 0);
    if (useObstacles) {
      ctx.fillStyle = '#bc4b3c99';
      for (const r of obstacles)
        ctx.fillRect(
          r.x * data.tileWidth,
          r.y * data.tileHeight,
          r.width * data.tileWidth,
          r.height * data.tileHeight,
        );
    }
    if (grid) {
      ctx.strokeStyle = '#fff7cc55';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= data.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * data.tileWidth, 0);
        ctx.lineTo(x * data.tileWidth, canvas.current.height);
        ctx.stroke();
      }
      for (let y = 0; y <= data.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * data.tileHeight);
        ctx.lineTo(canvas.current.width, y * data.tileHeight);
        ctx.stroke();
      }
    }
    if (path) {
      ctx.strokeStyle = '#fff4b3';
      ctx.lineWidth = 5;
      ctx.beginPath();
      path.forEach(([x, y], i) => {
        if (i) ctx.lineTo((x + 0.5) * data.tileWidth, (y + 0.5) * data.tileHeight);
        else ctx.moveTo((x + 0.5) * data.tileWidth, (y + 0.5) * data.tileHeight);
      });
      ctx.stroke();
      ctx.strokeStyle = '#bd542e';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    for (const [point, color] of [
      [start, '#72e09b'],
      [end, '#ffda64'],
    ] as const)
      if (point) {
        ctx.fillStyle = color;
        ctx.strokeStyle = '#643822';
        ctx.lineWidth = 2 / Math.max(0.125, scale);
        ctx.beginPath();
        ctx.arc(
          (point[0] + 0.5) * data.tileWidth,
          (point[1] + 0.5) * data.tileHeight,
          7 / Math.max(0.125, scale),
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();
      }
    for (const [index, m] of activeMarkers.entries()) {
      const x = (m.tile[0] + 0.5) * data.tileWidth,
        y = (m.tile[1] + 0.5) * data.tileHeight,
        r = 9 / Math.max(0.25, scale);
      ctx.beginPath();
      ctx.fillStyle = '#2b5c88';
      ctx.strokeStyle = '#fff7d3';
      ctx.lineWidth = 2 / Math.max(0.25, scale);
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(11 / Math.max(0.25, scale))}px Segoe UI`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.label.match(/^\d+ · /)?.[0].split(' ')[0] ?? String(index + 1), x, y);
    }
    if (hover) {
      const x = (hover[0] + 0.5) * data.tileWidth,
        y = (hover[1] + 0.5) * data.tileHeight;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1 / Math.max(0.25, scale);
      ctx.strokeRect(
        x - data.tileWidth / 2,
        y - data.tileHeight / 2,
        data.tileWidth,
        data.tileHeight,
      );
    }
  }
  const renderLatest = useRef(render);
  renderLatest.current = render;
  useEffect(render, [
    data,
    grid,
    start,
    end,
    path?.length,
    useObstacles,
    save?.fingerprint,
    hover,
    scale,
    markers,
  ]);
  function center(point: [number, number]) {
    if (!data) return;
    const next = Math.max(1, scale);
    setZoom(next);
    requestAnimationFrame(() => {
      const box = viewport.current;
      if (box)
        box.scrollTo({
          left: (point[0] + 0.5) * data.tileWidth * next - box.clientWidth / 2,
          top: (point[1] + 0.5) * data.tileHeight * next - box.clientHeight / 2,
          behavior: 'smooth',
        });
    });
  }
  function choose(point: [number, number]) {
    if (pointMode === 'start') {
      setStart(point);
      setPointMode('destination');
    } else if (pointMode === 'destination') setEnd(point);
  }
  const coords = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      Math.max(
        0,
        Math.min(
          (data?.width ?? 1) - 1,
          Math.floor(((e.clientX - r.left) / r.width) * (data?.width ?? 1)),
        ),
      ),
      Math.max(
        0,
        Math.min(
          (data?.height ?? 1) - 1,
          Math.floor(((e.clientY - r.top) / r.height) * (data?.height ?? 1)),
        ),
      ),
    ];
  };
  return localize(
    <MapWorkspace title={translate(mapName(actual))}>
      <section className="tile-map-viewer">
        <div className="map-view-heading">
          <div>
            <span className="eyebrow">ORIGINAL GAME MAP</span>
            <h3>In-game location map</h3>
            <strong>{mapName(actual)}</strong>
          </div>
          <div className="map-view-actions">
            <button
              className="button"
              onClick={() => {
                setZoom(0);
                viewport.current?.scrollTo(0, 0);
              }}
            >
              <Maximize2 size={15} />
              Fit map
            </button>
            {end && (
              <button className="button" onClick={() => center(end)}>
                <LocateFixed size={15} />
                Focus destination
              </button>
            )}
          </div>
        </div>
        <p className="map-instructions">
          Drag to explore. Use the mouse wheel to zoom around the pointer. Choose Start and
          Destination to plan a walking route.
        </p>
        <div className="map-controls map-main-controls">
          <label>
            Location
            <select
              aria-label="Tile map location"
              value={actual}
              onChange={(e) => setLocation(e.target.value)}
            >
              {[...new Set([...locations, ...visited])].map((l) => (
                <option key={l} value={l}>
                  {mapName(l)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Zoom
            <select
              aria-label="Tile map zoom"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            >
              <option value={0}>Fit map</option>
              <option value={0.25}>25%</option>
              <option value={0.5}>50%</option>
              <option value={1}>100%</option>
              <option value={1.5}>150%</option>
              <option value={2}>200%</option>
              {![0, 0.25, 0.5, 1, 1.5, 2].includes(zoom) && (
                <option value={zoom}>{Math.round(zoom * 100)}%</option>
              )}
            </select>
          </label>
          <button
            className="icon-button"
            aria-label="Zoom out map"
            onClick={() => setZoom(Math.max(0.25, Math.round((scale * 100) / 1.5) / 100))}
          >
            <ZoomOut size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Zoom in map"
            onClick={() => setZoom(Math.min(4, Math.round(scale * 100 * 1.5) / 100))}
          >
            <ZoomIn size={18} />
          </button>
          <span className="map-scale">{Math.round(scale * 100)}%</span>
          <label className="checkbox-label">
            <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} />
            Tile grid
          </label>
          <button
            className="button"
            onClick={() => {
              setStart(null);
              setEnd(null);
            }}
          >
            Clear route
          </button>
        </div>
        {busy && <p role="status">Loading original map…</p>}
        {error && <p className="route-unknown">{error}</p>}
        {data && (
          <>
            {save?.mapObstacles && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useObstacles}
                  onChange={(e) => setUseObstacles(e.target.checked)}
                />
                Avoid detected saved obstacles ({obstacles.length})
              </label>
            )}
            <div className="map-mode-controls" role="group" aria-label="Map interaction mode">
              {[
                ['pan', 'Explore', Hand],
                ['start', 'Start', Navigation],
                ['destination', 'Destination', Flag],
              ].map(([mode, label, Icon]) => {
                const I = Icon as typeof Hand;
                return (
                  <button
                    className={`button ${pointMode === mode ? 'primary' : ''}`}
                    aria-pressed={pointMode === mode}
                    key={String(mode)}
                    onClick={() => setPointMode(String(mode))}
                  >
                    <I size={15} />
                    {String(label)}
                  </button>
                );
              })}
            </div>
            {activeMarkers.length > 0 && (
              <div className="map-marker-list">
                {activeMarkers.map((m, index) => (
                  <button className="text-button" key={m.id} onClick={() => center(m.tile)}>
                    {!/^\d+ · /.test(m.label) ? `${index + 1}. ` : ''}
                    {m.label}
                  </button>
                ))}
              </div>
            )}
            {mapExits(data).length > 0 && (
              <details className="map-exits">
                <summary>Connections to other maps</summary>
                <p>
                  Original map exits. Doors, travel unlocks and story changes still need checking.
                </p>
                {mapExits(data)
                  .filter(
                    (exit, index, all) =>
                      all.findIndex((e) => e.location === exit.location) === index,
                  )
                  .map((exit, i) => (
                    <div key={i}>
                      <span>
                        {locationName(exit.location, art)}{' '}
                        <small>
                          {mapExits(data).filter((e) => e.location === exit.location).length} exit
                          tiles
                        </small>
                      </span>
                      <button
                        className="text-button"
                        onClick={() => {
                          setVisited((v) => [...v, exit.location]);
                          setLocation(exit.location);
                        }}
                      >
                        View connecting map
                      </button>
                    </div>
                  ))}
              </details>
            )}
            <details className="map-coordinate-details">
              <summary>Precise tile controls</summary>
              <div className="map-controls">
                <label>
                  Point
                  <select
                    aria-label="Map point type"
                    value={pointMode}
                    onChange={(e) => setPointMode(e.target.value)}
                  >
                    <option value="pan">Explore</option>
                    <option value="start">Start</option>
                    <option value="destination">Destination</option>
                  </select>
                </label>
                <label>
                  X
                  <input
                    aria-label="Map tile X"
                    type="number"
                    min={0}
                    max={data.width - 1}
                    value={coordinate[0]}
                    onChange={(e) =>
                      setCoordinate([
                        Math.max(0, Math.min(data.width - 1, Math.trunc(Number(e.target.value)))),
                        coordinate[1],
                      ])
                    }
                  />
                </label>
                <label>
                  Y
                  <input
                    aria-label="Map tile Y"
                    type="number"
                    min={0}
                    max={data.height - 1}
                    value={coordinate[1]}
                    onChange={(e) =>
                      setCoordinate([
                        coordinate[0],
                        Math.max(0, Math.min(data.height - 1, Math.trunc(Number(e.target.value)))),
                      ])
                    }
                  />
                </label>
                <button
                  className="button"
                  onClick={() => (pointMode === 'pan' ? setStart(coordinate) : choose(coordinate))}
                >
                  Set point
                </button>
              </div>
            </details>
            <p id={helpId}>Use arrow keys on the map, then Enter to set the selected point.</p>
            <div
              className={`tile-map-scroll mode-${pointMode} ${zoom === 0 ? 'map-fitted' : ''}`}
              ref={attachViewport}
              onPointerDown={(e) => {
                if (pointMode !== 'pan' || e.button !== 0) return;
                const box = e.currentTarget;
                drag.current = {
                  x: e.clientX,
                  y: e.clientY,
                  left: box.scrollLeft,
                  top: box.scrollTop,
                  moved: false,
                };
                box.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!drag.current) return;
                const d = drag.current,
                  dx = e.clientX - d.x,
                  dy = e.clientY - d.y;
                d.moved ||= Math.abs(dx) + Math.abs(dy) > 4;
                e.currentTarget.scrollLeft = d.left - dx;
                e.currentTarget.scrollTop = d.top - dy;
              }}
              onPointerUp={(e) => {
                drag.current = null;
                if (e.currentTarget.hasPointerCapture(e.pointerId))
                  e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            >
              <canvas
                ref={(node) => {
                  canvas.current = node;
                  if (node) requestAnimationFrame(() => renderLatest.current());
                }}
                width={data.width * data.tileWidth}
                height={data.height * data.tileHeight}
                style={{
                  width: data.width * data.tileWidth * scale,
                  height: data.height * data.tileHeight * scale,
                }}
                role="img"
                tabIndex={0}
                aria-describedby={helpId}
                aria-label={`Original location map: ${actual}`}
                onMouseMove={(e) => {
                  const next = coords(e);
                  setHover((prev) =>
                    prev?.[0] === next[0] && prev?.[1] === next[1] ? prev : next,
                  );
                }}
                onKeyDown={(e) => {
                  const delta: Record<string, [number, number]> = {
                    ArrowLeft: [-1, 0],
                    ArrowRight: [1, 0],
                    ArrowUp: [0, -1],
                    ArrowDown: [0, 1],
                  };
                  if (delta[e.key]) {
                    e.preventDefault();
                    const [dx, dy] = delta[e.key];
                    const p: [number, number] = [
                      Math.max(0, Math.min(data.width - 1, coordinate[0] + dx)),
                      Math.max(0, Math.min(data.height - 1, coordinate[1] + dy)),
                    ];
                    setCoordinate(p);
                    setHover(p);
                  }
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (pointMode === 'pan') setStart(coordinate);
                    else choose(coordinate);
                  }
                }}
                onClick={(e) => {
                  if (pointMode !== 'pan') choose(coords(e));
                }}
              />
            </div>
            <div className="map-legend">
              <span>
                <i className="legend-start" />
                Start
              </span>
              <span>
                <i className="legend-destination" />
                Destination
              </span>
              {activeMarkers.length > 0 && (
                <span>
                  <i className="legend-stop" />
                  {markerLabel}
                </span>
              )}
              {useObstacles && obstacles.length > 0 && (
                <span>
                  <i className="legend-obstacle" />
                  Saved obstacles
                </span>
              )}
              <span>
                {data.width} × {data.height} tiles
              </span>
            </div>
            <p role="status">
              {hover ? `Tile ${hover.join(', ')}. ` : ''}
              {start ? `Start: ${start.join(', ')}. ` : ''}
              {end ? `Destination: ${end.join(', ')}. ` : ''}
              {path
                ? `${path.length - 1} walking steps.`
                : start && end
                  ? 'No static walking route. Choose walkable ground; water cannot be walked on.'
                  : ''}
            </p>
          </>
        )}
        <p className="fine-print">
          Detected saved obstacles are shown in red. Unrecognized objects, story changes, doors and
          live characters may still obstruct the route. Animated tiles use their first frame. This
          does not reveal an unsaved player position.
        </p>
      </section>
    </MapWorkspace>,
  );
}
