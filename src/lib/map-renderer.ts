import type { TileMap } from '../domain/tilemap';
const rendered = new WeakMap<TileMap, Promise<HTMLCanvasElement>>();
/** Composite original pixels once. Zooming, dragging and opening a large view reuse this image. */
export function renderOriginalMap(map: TileMap) {
  let cached = rendered.get(map);
  if (cached) return cached;
  cached = (async () => {
    const entries = await Promise.all(
      Object.entries(map.images).map(async ([key, value]) => {
        const image = new Image();
        image.src = value.url;
        await image.decode();
        return [key, image] as const;
      }),
    );
    const images = new Map(entries),
      canvas = document.createElement('canvas');
    canvas.width = map.width * map.tileWidth;
    canvas.height = map.height * map.tileHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    for (const layer of map.layers)
      for (let i = 0; i < layer.tiles.length; i++) {
        const tile = layer.tiles[i];
        if (!tile) continue;
        const s = map.sheets[tile.sheet],
          image = s && images.get(s.image);
        if (!image) continue;
        ctx.drawImage(
          image,
          s.margin[0] + (tile.index % s.columns) * (s.tileWidth + s.spacing[0]),
          s.margin[1] + Math.floor(tile.index / s.columns) * (s.tileHeight + s.spacing[1]),
          s.tileWidth,
          s.tileHeight,
          (i % layer.width) * map.tileWidth,
          Math.floor(i / layer.width) * map.tileHeight,
          map.tileWidth,
          map.tileHeight,
        );
      }
    return canvas;
  })();
  rendered.set(map, cached);
  cached.catch(() => rendered.delete(map));
  return cached;
}
