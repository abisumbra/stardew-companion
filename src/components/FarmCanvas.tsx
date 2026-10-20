import { memo, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { TileMap } from '../domain/tilemap';
import { placementIssue, type DesignItem, type FarmDesign } from '../domain/farm-design';
import { lineTiles, sprinklerCoverage, type Tile } from '../domain/design-tools';
import { Sprite, useArtwork, spriteKey } from './Artwork';
import { renderOriginalMap } from '../lib/map-renderer';
import { useMapWheel } from '../lib/map-gestures';
import { translate } from '../lib/locale';
type Brush = Omit<DesignItem, 'id' | 'x' | 'y'>;
const DesignSprite = memo(function DesignSprite({
  item,
  zoom,
}: {
  item: Pick<DesignItem, 'itemId' | 'name' | 'width' | 'height'>;
  zoom: number;
}) {
  const { data } = useArtwork(),
    rect = data.sprites[spriteKey(item.itemId, data.sprites)];
  const size = rect
    ? (Math.max(rect.width, rect.height) * zoom) / 16
    : Math.max(item.width, item.height) * zoom;
  return (
    <span className="design-natural-sprite">
      <Sprite id={item.itemId} name={item.name} size={size} smooth decorative />
    </span>
  );
});
type Gesture = {
  mode: 'pan' | 'move' | 'paint' | 'erase' | 'select';
  start: Tile;
  last: Tile;
  cells: Tile[];
  id?: string;
  offset?: Tile;
  client: Tile;
  scroll: Tile;
  node?: HTMLElement;
};
export function FarmCanvas({
  map,
  design,
  selected,
  onSelect,
  zoom: requestedZoom,
  grid,
  tool,
  brush,
  onZoom,
  onStroke,
  onMove,
  onDelete,
  onUndo,
  onRedo,
  onCancel,
  coverage = false,
  hidden = [],
  locked = [],
  selectedIds = [],
  onGroup,
  onNudge,
}: {
  map: TileMap | null;
  design: FarmDesign;
  selected: string | null;
  onSelect: (id: string) => void;
  zoom: number;
  grid: boolean;
  tool: string;
  brush: Brush | null;
  onZoom: (n: number) => void;
  onStroke: (cells: Tile[], erase: boolean) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCancel: () => void;
  coverage?: boolean;
  hidden?: string[];
  locked?: string[];
  selectedIds?: string[];
  onGroup?: (ids: string[]) => void;
  onNudge?: (dx: number, dy: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    viewport = useRef<HTMLDivElement>(null),
    board = useRef<HTMLDivElement>(null),
    ghost = useRef<HTMLDivElement>(null),
    strokeCanvas = useRef<HTMLCanvasElement>(null);
  const gesture = useRef<Gesture | null>(null),
    space = useRef(false);
  const [error, setError] = useState(''),
    [viewportSize, setViewportSize] = useState({ width: 800, height: 540 });
  const width = map?.width ?? 80,
    height = map?.height ?? 65;
  const zoom =
    requestedZoom ||
    Math.max(4, Math.min(64, (viewportSize.width - 4) / width, (viewportSize.height - 4) / height));
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const measure = () => setViewportSize({ width: node.clientWidth, height: node.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    return () => observer.disconnect();
  }, []);
  useMapWheel(viewport, zoom, onZoom, 4, 64);
  useEffect(() => {
    let active = true;
    setError('');
    if (map)
      void renderOriginalMap(map)
        .then((image) => {
          if (active && canvas.current) {
            canvas.current.getContext('2d')?.drawImage(image, 0, 0);
          }
        })
        .catch((e) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [map]);
  function fit() {
    onZoom(0);
    requestAnimationFrame(() => viewport.current?.scrollTo(0, 0));
  }
  const point = (e: PointerEvent): Tile => {
    const box = board.current!.getBoundingClientRect();
    return [
      Math.max(-1, Math.min(width, Math.floor((e.clientX - box.left) / zoom))),
      Math.floor((e.clientY - box.top) / zoom),
    ];
  };
  function preview(p: Tile, item: Brush | DesignItem | null = brush) {
    if (!ghost.current || !item) return;
    const issue = placementIssue(
      { ...item, id: 'id' in item ? item.id : 'preview', x: p[0], y: p[1] },
      design.items,
      map,
    );
    Object.assign(ghost.current.style, {
      display: 'block',
      left: `${p[0] * 16}px`,
      top: `${p[1] * 16}px`,
      width: `${item.width * 16}px`,
      height: `${item.height * 16}px`,
    });
    ghost.current.dataset.move = String('id' in item);
    ghost.current.dataset.invalid = String(
      !!issue && (issue.includes('outside') || issue.includes('overlaps')),
    );
  }
  function stroke(cells: Tile[], erase: boolean) {
    const ctx = strokeCanvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = erase ? '#ec655688' : '#7fcc68aa';
    ctx.strokeStyle = '#fff1aa';
    for (const [x, y] of cells) {
      const w = erase ? 1 : (brush?.width ?? 1),
        h = erase ? 1 : (brush?.height ?? 1);
      ctx.fillRect(x * 16, y * 16, w * 16, h * 16);
      ctx.strokeRect(x * 16 + 0.5, y * 16 + 0.5, w * 16 - 1, h * 16 - 1);
    }
  }
  function finish(e: PointerEvent, cancel = false) {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (g.node) g.node.style.transform = '';
    if (ghost.current) ghost.current.style.display = 'none';
    strokeCanvas.current?.getContext('2d')?.clearRect(0, 0, width * 16, height * 16);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (cancel) return;
    if (g.mode === 'select')
      onGroup?.(
        design.items
          .filter(
            (i) =>
              !hidden.includes(i.kind) &&
              !locked.includes(i.kind) &&
              i.x + i.width > Math.min(g.start[0], g.last[0]) &&
              i.x <= Math.max(g.start[0], g.last[0]) &&
              i.y + i.height > Math.min(g.start[1], g.last[1]) &&
              i.y <= Math.max(g.start[1], g.last[1]),
          )
          .map((i) => i.id),
      );
    if (g.mode === 'move' && g.id)
      onMove(g.id, g.last[0] - (g.offset?.[0] ?? 0), g.last[1] - (g.offset?.[1] ?? 0));
    if (g.mode === 'paint' || g.mode === 'erase') onStroke(g.cells, g.mode === 'erase');
  }
  return (
    <div className="designer-surface">
      <div className="map-quick-controls">
        <button className="button" onClick={fit}>
          {translate('Fit map')}
        </button>
        <label>
          {translate('Zoom')}{' '}
          <input
            aria-label={translate('Design zoom')}
            type="range"
            min={4}
            max={64}
            step={0.25}
            value={zoom}
            onChange={(e) => onZoom(Number(e.target.value))}
          />
        </label>
        <span>{Math.round((zoom / 16) * 100)}%</span>
        <small>
          {translate('Wheel: zoom · Space + drag: pan · Right drag: erase · Ctrl+Z: undo')}
        </small>
      </div>
      <div
        ref={viewport}
        className={`farm-canvas-scroll tool-${tool}`}
        tabIndex={0}
        aria-label={translate('Design map workspace')}
        onKeyDown={(e) => {
          const delta: Record<string, [number, number]> = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
          };
          if (delta[e.key]) {
            e.preventDefault();
            onNudge?.(...delta[e.key]);
          }
          if (e.key === ' ') {
            e.preventDefault();
            space.current = true;
          }
          if (e.key === 'Escape') {
            e.stopPropagation();
            onCancel();
          }
          if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            onDelete();
          }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) onRedo();
            else onUndo();
          }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            onRedo();
          }
          if (e.key.toLowerCase() === 'f') {
            e.preventDefault();
            fit();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ') space.current = false;
        }}
        onBlur={() => (space.current = false)}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (!board.current || ![0, 1, 2].includes(e.button)) return;
          e.preventDefault();
          viewport.current?.focus({ preventScroll: true });
          const p = point(e),
            box = viewport.current!,
            pan = e.button === 1 || space.current || tool === 'pan';
          const node = (e.target as HTMLElement).closest<HTMLElement>('[data-placement]');
          if (
            node &&
            locked.includes(design.items.find((i) => i.id === node.dataset.placement)?.kind ?? '')
          )
            return;
          if (e.shiftKey && node) {
            const id = node.dataset.placement!;
            onGroup?.(
              selectedIds.includes(id) ? selectedIds.filter((k) => k !== id) : [...selectedIds, id],
            );
            return;
          }
          const g: Gesture = {
            mode: e.shiftKey
              ? 'select'
              : pan
                ? 'pan'
                : e.button === 2 || tool === 'erase'
                  ? 'erase'
                  : tool === 'place' && brush
                    ? 'paint'
                    : 'move',
            start: p,
            last: p,
            cells: [p],
            client: [e.clientX, e.clientY],
            scroll: [box.scrollLeft, box.scrollTop],
          };
          if (g.mode === 'move') {
            if (!node) {
              if (tool === 'move' && selected) {
                g.id = selected;
                g.offset = [0, 0];
                gesture.current = g;
                e.currentTarget.setPointerCapture(e.pointerId);
              }
              return;
            }
            const id = node.dataset.placement!,
              item = design.items.find((i) => i.id === id)!;
            g.id = id;
            g.node = node;
            g.offset = [p[0] - item.x, p[1] - item.y];
            onSelect(id);
          }
          if (g.mode === 'paint') preview(p);
          if (g.mode === 'paint' || g.mode === 'erase') stroke([p], g.mode === 'erase');
          gesture.current = g;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const p = point(e),
            g = gesture.current;
          if (!g) {
            if (tool === 'place' && brush) preview(p);
            else if (ghost.current) ghost.current.style.display = 'none';
            return;
          }
          if (g.mode === 'select') {
            strokeCanvas.current?.getContext('2d')?.clearRect(0, 0, width * 16, height * 16);
            const ctx = strokeCanvas.current?.getContext('2d');
            if (ctx) {
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.strokeRect(
                g.start[0] * 16,
                g.start[1] * 16,
                (p[0] - g.start[0] + 1) * 16,
                (p[1] - g.start[1] + 1) * 16,
              );
            }
            g.last = p;
            return;
          }
          if (g.mode === 'pan') {
            viewport.current!.scrollLeft = g.scroll[0] - (e.clientX - g.client[0]);
            viewport.current!.scrollTop = g.scroll[1] - (e.clientY - g.client[1]);
            return;
          }
          if (p[0] === g.last[0] && p[1] === g.last[1]) return;
          if (g.mode === 'paint' || g.mode === 'erase') {
            if (g.mode === 'erase' || (brush?.width === 1 && brush.height === 1)) {
              const cells = lineTiles(g.last, p);
              g.cells.push(...cells);
              stroke(cells, g.mode === 'erase');
            } else {
              g.cells = [p];
              strokeCanvas.current?.getContext('2d')?.clearRect(0, 0, width * 16, height * 16);
              stroke([p], false);
            }
            preview(p);
          }
          if (g.mode === 'move' && g.node) {
            const item = design.items.find((i) => i.id === g.id)!;
            g.node.style.transform = `translate(${(p[0] - g.start[0]) * 16}px,${(p[1] - g.start[1]) * 16}px)`;
            preview([p[0] - g.offset![0], p[1] - g.offset![1]], item);
          }
          g.last = p;
        }}
        onPointerUp={(e) => finish(e)}
        onPointerCancel={(e) => finish(e, true)}
        onLostPointerCapture={(e) => {
          if (gesture.current) finish(e, true);
        }}
        onPointerLeave={() => {
          if (!gesture.current && ghost.current) ghost.current.style.display = 'none';
        }}
      >
        <div className="farm-canvas-extent" style={{ width: width * zoom, height: height * zoom }}>
          <div
            ref={board}
            className={`farm-canvas ${grid ? 'has-grid' : ''}`}
            style={{
              width: width * 16,
              height: height * 16,
              backgroundSize: `16px 16px`,
              transform: `scale(${zoom / 16})`,
              transformOrigin: 'top left',
            }}
          >
            {map && (
              <canvas
                ref={canvas}
                width={width * map.tileWidth}
                height={height * map.tileHeight}
                style={{ width: '100%', height: '100%' }}
                aria-label={translate('Original design map')}
              />
            )}
            {coverage &&
              design.items.flatMap((item) =>
                sprinklerCoverage(item.itemId).map(([dx, dy]) => {
                  const x = item.x + dx,
                    y = item.y + dy;
                  return x >= 0 && y >= 0 && x < width && y < height ? (
                    <i
                      key={`${item.id}:${dx}:${dy}`}
                      className="sprinkler-cell"
                      style={{ left: x * 16, top: y * 16, width: 16, height: 16 }}
                    />
                  ) : null;
                }),
              )}
            {design.items
              .filter((i) => !hidden.includes(i.kind))
              .map((item) => (
                <button
                  data-placement={item.id}
                  aria-pressed={selected === item.id || selectedIds.includes(item.id)}
                  disabled={locked.includes(item.kind)}
                  key={item.id}
                  className={`farm-placement ${selected === item.id || selectedIds.includes(item.id) ? 'selected' : ''} ${item.kind} ${item.floorCovering ? 'floor-covering' : ''}`}
                  style={{
                    left: item.x * 16,
                    top: item.y * 16,
                    width: item.width * 16,
                    height: item.height * 16,
                  }}
                  title={`${translate(item.name)} (${item.x}, ${item.y})`}
                  aria-label={`${item.name} at ${item.x}, ${item.y}`}
                  onClick={(e) => {
                    if (e.detail === 0) {
                      if (e.shiftKey)
                        onGroup?.(
                          selectedIds.includes(item.id)
                            ? selectedIds.filter((k) => k !== item.id)
                            : [...selectedIds, item.id],
                        );
                      else onSelect(item.id);
                    }
                  }}
                >
                  <DesignSprite item={item} zoom={16} />
                </button>
              ))}
            <canvas
              ref={strokeCanvas}
              className="design-stroke-preview"
              width={width * 16}
              height={height * 16}
              aria-hidden="true"
            />
            <div ref={ghost} className="placement-ghost" aria-hidden="true">
              {brush && <DesignSprite item={brush} zoom={16} />}
            </div>
          </div>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
