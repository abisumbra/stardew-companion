import { useEffect, useState, useSyncExternalStore } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Trophy } from 'lucide-react';
import { AccountSchema, type AccountState } from '../domain/models';
import { localize, formatTimestamp } from '../lib/locale';
import { desktop, setPersisted } from '../lib/backend';
let icons: Record<string, string> = {},
  loaded = false;
const listeners = new Set<() => void>();
function setIcons(next: Record<string, string>) {
  icons = next;
  listeners.forEach((fn) => fn());
}
function useIcons() {
  useEffect(() => {
    if (desktop && !loaded) {
      loaded = true;
      void invoke<Record<string, string>>('steam_icons', { download: false })
        .then(setIcons)
        .catch(() => {});
    }
  }, []);
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => icons,
  );
}
export function SteamIcon({ id, name, size = 64 }: { id: string; name?: string; size?: number }) {
  const data = useIcons();
  return data[id] ? (
    <img
      className="steam-icon"
      style={{ width: size, height: size }}
      src={data[id]}
      alt={name ?? ''}
    />
  ) : (
    <Trophy size={Math.min(size, 32)} aria-hidden="true" />
  );
}
export function SteamConnection({
  account,
  onChange,
  disabled = false,
}: {
  account: AccountState;
  onChange: (a: AccountState) => void;
  disabled?: boolean;
}) {
  const [profile, setProfile] = useState(account.steam?.profileId ?? ''),
    [busy, setBusy] = useState(false),
    [loadingIcons, setLoadingIcons] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const pictures = useIcons();
  async function connect() {
    setBusy(true);
    setError('');
    try {
      const steam = await invoke('read_steam_profile', { profile });
      const next = AccountSchema.parse({ ...account, steam });
      await setPersisted('steam-account', next);
      onChange(next);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    setLoadingIcons(true);
    setError('');
    try {
      const data = await invoke<Record<string, string>>('steam_icons', { download: true });
      setIcons(data);
      setMessage(
        Object.keys(data).length === 49
          ? 'All 49 official achievement pictures are cached for offline use.'
          : 'Some achievement pictures could not be downloaded. Cached pictures remain available; retry when online.',
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingIcons(false);
    }
  }
  return localize(
    <section className="panel">
      <div className="steam-connect">
        <label>
          Steam profile
          <input
            aria-label="Steam profile"
            value={profile}
            placeholder="https://steamcommunity.com/id/…"
            maxLength={180}
            onChange={(e) => setProfile(e.target.value)}
          />
        </label>
        <button
          className="button primary"
          disabled={!desktop || disabled || busy || !profile.trim()}
          onClick={() => void connect()}
        >
          {busy ? 'Connecting…' : 'Connect public profile'}
        </button>
        {account.steam && (
          <button
            className="button"
            disabled={disabled || busy}
            onClick={() => {
              const next = { ...account, steam: null };
              void setPersisted('steam-account', next)
                .then(() => onChange(next))
                .catch((e) => setError(String(e)));
            }}
          >
            Disconnect
          </button>
        )}
        <button
          className="button"
          disabled={!desktop || loadingIcons}
          onClick={() => void download()}
        >
          {loadingIcons ? 'Loading pictures…' : 'Download official achievement pictures'}
        </button>
      </div>
      <p className="fine-print">
        Optional internet connection. Only public Steam game details are read after you click
        Connect. No password, API key or Steam login is requested. Save evidence stays separate.
      </p>
      {account.steam ? (
        <p>
          {account.steam.unlocked.length} Steam verified ·{' '}
          {formatTimestamp(account.steam.fetchedAt)} ·{' '}
          <span data-l10n="off">{account.steam.profileId}</span>
        </p>
      ) : (
        <p>
          No public profile connected. Save Requirements Met does not prove Steam awarded an
          achievement.
        </p>
      )}
      <p className="fine-print">{Object.keys(pictures).length} / 49 official pictures cached</p>
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="notice amber" role="alert">
          {error}
        </p>
      )}
    </section>,
  );
}
