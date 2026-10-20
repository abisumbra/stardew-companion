import { spriteKey } from '../domain/artwork-identity';
export { spriteKey } from '../domain/artwork-identity';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PackageOpen, Trophy, ScrollText, MapPin, Gift, Coins } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { desktop } from '../lib/backend';
import type { WorldMap } from '../domain/world-map';
import { registerGameTranslations, useLocale } from '../lib/locale';
import { validateArtwork } from '../domain/artwork-schema';
import { SteamIcon } from './SteamConnection';
const sheetVariable = (name: string) =>
  '--game-art-' + Array.from(name, (c) => c.charCodeAt(0).toString(16)).join('-');

export interface GalleryEntry {
  id: string;
  name: string;
  kind: string;
  description?: string;
}
interface Sheet {
  url: string;
  width: number;
  height: number;
}
interface SpriteRect {
  sheet: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Recipe {
  machineId?: string;
  shopId?: string;
  accessCondition?: string | null;
  name?: string;
  kind?: string;
  unlock?: string;
  output: string;
  quantity: number;
  ingredients: { id: string; quantity: number }[];
}
export interface ArtworkData {
  root: string | null;
  sheets: Record<string, Sheet>;
  sprites: Record<string, SpriteRect>;
  items: GalleryEntry[];
  characters: GalleryEntry[];
  monsters: GalleryEntry[];
  world?: GalleryEntry[];
  recipes: Record<string, Recipe>;
  gifts?: Record<string, { loved: string[]; liked: string[] }>;
  maps?: Record<string, WorldMap>;
  gameData?: Record<string, Record<string, any>>;
  schedules?: Record<string, Record<string, string>>;
  events?: Record<
    string,
    { id: string; location: string; friendshipPoints: number; conditions: string[] }[]
  >;
  translations?: Record<string, string>;
  warnings: string[];
  unavailable?: Record<string, string>;
}
const empty: ArtworkData = {
  root: null,
  sheets: {},
  sprites: {},
  items: [],
  characters: [],
  monsters: [],
  recipes: {},
  warnings: [],
};
const ArtworkContext = createContext({
  data: empty,
  loading: true,
  error: '',
  reload: async () => {},
  choose: async () => {},
});
let request: Promise<ArtworkData> | undefined;
function fetchArtwork(refresh = false): Promise<ArtworkData> {
  if (!desktop) return Promise.resolve(empty);
  if (!request || refresh)
    request = invoke<unknown>('get_artwork', { refresh })
      .then(validateArtwork)
      .catch((e) => {
        request = undefined;
        throw e;
      });
  return request;
}
export function ArtworkProvider({ children }: { children: ReactNode }) {
  const language = useLocale();
  const [data, setData] = useState(empty),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  useEffect(() => {
    if (!desktop || !data.root || language === 'en' || language === 'tr') return;
    registerGameTranslations({}, language);
    let active = true;
    void invoke<Record<string, string>>('get_game_translations', { language })
      .then((terms) => {
        if (active) registerGameTranslations(terms, language);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [language, data.root]);
  async function reload(refresh = true) {
    setLoading(true);
    setError('');
    try {
      const next = await fetchArtwork(refresh);
      registerGameTranslations(next.translations);
      setData(next);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    void fetchArtwork()
      .then((d) => {
        if (active) {
          registerGameTranslations(d.translations);
          setData(d);
        }
      })
      .catch((e) => {
        if (active) setError(String(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function choose() {
    if (!desktop) return;
    try {
      const path = await open({
        directory: true,
        multiple: false,
        title: 'Choose the Stardew Valley game folder',
      });
      if (path) {
        await invoke('set_artwork_directory', { path });
        await reload();
      }
    } catch (e) {
      setError(String(e));
    }
  }
  const sheetStyles = useMemo(
    () =>
      `:root{${Object.entries(data.sheets)
        .map(([name, sheet]) => `${sheetVariable(name)}:url("${sheet.url}");`)
        .join('')}}`,
    [data.sheets],
  );
  return (
    <ArtworkContext.Provider value={{ data, loading, error, reload, choose }}>
      <style>{sheetStyles}</style>
      {children}
    </ArtworkContext.Provider>
  );
}
export const useArtwork = () => useContext(ArtworkContext);
export function Sprite({
  id,
  name,
  size = 32,
  className = '',
  decorative = false,
  smooth = false,
}: {
  id: string;
  name?: string;
  size?: number;
  className?: string;
  decorative?: boolean;
  smooth?: boolean;
}) {
  const { data } = useArtwork();
  const resolvedId = id.startsWith('crop:')
    ? (data.gameData?.crops?.[id.slice(5)]?.HarvestItemId ?? id)
    : id;
  const sprite = data.sprites[spriteKey(resolvedId, data.sprites)];
  const sheet = sprite && data.sheets[sprite.sheet];
  const Icon = id.startsWith('achievement:')
    ? Trophy
    : id.startsWith('quest:')
      ? ScrollText
      : id.startsWith('location:')
        ? MapPin
        : id.startsWith('bundle:')
          ? Gift
          : id === 'currency:gold'
            ? Coins
            : null;
  const fit = sprite ? Math.min(size / sprite.width, size / sprite.height) : 1;
  const scale = smooth || /^(animal|monster):/.test(resolvedId) ? fit : fit >= 1 ? Math.floor(fit) : fit;
  return (
    <span
      className={`sprite-frame ${className} ${!sheet && !Icon ? 'artwork-missing' : ''}`}
      style={{ width: size, height: size }}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={
        decorative
          ? undefined
          : sheet || Icon
            ? (name ?? id)
            : `${name ?? id} — artwork unavailable`
      }
      title={
        !sheet && !Icon
          ? (data.unavailable?.[resolvedId] ??
            (data.root
              ? 'Artwork unavailable in the connected game installation.'
              : 'Connect your installed game in Settings to load original artwork'))
          : undefined
      }
    >
      {sheet && sprite ? (
        <span
          className="game-sprite"
          style={{
            width: sprite.width * scale,
            height: sprite.height * scale,
            backgroundImage: `var(${sheetVariable(sprite.sheet)})`,
            backgroundSize: `${sheet.width * scale}px ${sheet.height * scale}px`,
            backgroundPosition: `-${sprite.x * scale}px -${sprite.y * scale}px`,
          }}
        />
      ) : id.startsWith('achievement:') ? (
        <SteamIcon id={id} name={decorative ? undefined : name} size={size} />
      ) : Icon ? (
        <Icon size={Math.min(size, 40)} aria-hidden="true" />
      ) : (
        <PackageOpen size={Math.min(size, 24)} aria-hidden="true" />
      )}
    </span>
  );
}
