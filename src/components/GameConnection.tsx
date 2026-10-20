import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Play, Radio } from 'lucide-react';
import { desktop } from '../lib/backend';
import { localize, useLocale } from '../lib/locale';
import { useArtwork } from './Artwork';
import type { SaveProfile, PlannerState } from '../domain/models';
import { liveGoals } from '../domain/connection';
import { useConnectionStatus, refreshConnection } from '../lib/connection-status';
import { goalLabel } from '../domain/objectives';
export function GameConnection({ save, state }: { save: SaveProfile; state: PlannerState }) {
  const { data: art } = useArtwork(),
    locale = useLocale();
  const model = useMemo(() => liveGoals(save, state, art), [save, state, art, locale]);
  const [enabled, setEnabled] = useState(false),
    status = useConnectionStatus(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const farmerId = save.players.find((f) => f.id === state.farmerId)?.id ?? save.players[0].id;
  const supported = save.gameVersion === '1.6.15';
  async function publish() {
    await invoke('set_connection_plan', {
      path: save.path,
      fingerprint: save.fingerprint,
      farmerId,
      goals: model.goals,
    });
  }
  useEffect(() => {
    if (enabled && supported && model.goals.length <= 80)
      void publish().catch((e) => setError(String(e)));
  }, [enabled, supported, save.fingerprint, farmerId, JSON.stringify(model.goals)]);
  async function launch() {
    setBusy(true);
    setError('');
    try {
      await publish();
      await invoke('launch_connected_game');
      setEnabled(true);
      void refreshConnection();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return localize(
    <section className="panel game-connection">
      <div className="connection-heading">
        <h2>
          <Radio size={20} /> Live game connection
        </h2>
        <strong>
          {status.state === 'active'
            ? 'Connected in game'
            : status.state === 'connected'
              ? 'Waiting for a farm'
              : status.state === 'starting'
                ? 'Starting game…'
                : status.state === 'error'
                  ? 'Connection needs attention'
                  : 'Not connected'}
        </strong>
      </div>
      <p>
        Start Stardew Valley here to track tasks during play. No separate SMAPI or mod installation
        is needed. The connection keeps running if Companion closes.
      </p>
      <p className="fine-print">
        In-game tasks follow the game’s language. Companion’s interface language can be selected
        independently.
      </p>
      <p className="fine-print">
        Shipping completes when the game processes the sale overnight, not when an item is placed in
        the bin. Only tasks with a confirmed measurable condition are sent. Personal notes remain in
        Companion.
      </p>
      <p>
        {model.goals.length} measurable goals · {model.unsupported.length} Companion-only goals
      </p>
      {status.state === 'active' &&
        status.saveId === `${save.id}:${farmerId}` &&
        Boolean(status.completed?.length) && (
          <p className="notice">
            {status.completed!.length} goals confirmed by live game data. Save confirmation updates
            after the next game save.
          </p>
        )}
      {model.goals.length > 80 && (
        <p className="notice amber">
          The live journal accepts at most 80 measured goals. Reduce the selected Planner goals
          before updating.
        </p>
      )}
      <p className="fine-print">
        The live connection currently supports single-player sessions only.
      </p>
      {model.unsupported.length > 0 && (
        <details>
          <summary>Goals kept in Companion</summary>
          <ul>
            {model.unsupported.map((id) => (
              <li key={id} data-l10n={state.manual.some((t) => t.id === id) ? 'off' : undefined}>
                {state.manual.find((t) => t.id === id)?.title ?? goalLabel(id, save, art)}
              </li>
            ))}
          </ul>
          <p>
            These goals have no validated live condition yet. They are not sent as misleading
            automatic tasks.
          </p>
        </details>
      )}
      {!supported && (
        <p className="notice amber">
          Live connection currently supports Windows and vanilla Stardew Valley 1.6.15 only.
        </p>
      )}
      <div className="journal-actions">
        <button className="button" onClick={() => void refreshConnection()}>
          Retry connection
        </button>
        <button
          className="button primary"
          disabled={!desktop || busy || !supported || model.goals.length > 80}
          onClick={() => void launch()}
        >
          <Play size={17} />
          {busy ? 'Starting…' : 'Start game with Companion'}
        </button>
        <button
          className="button"
          disabled={!desktop || busy || !supported || model.goals.length > 80}
          onClick={() => {
            setError('');
            void publish()
              .then(() => setEnabled(true))
              .catch((e) => setError(String(e)));
          }}
        >
          Update live tasks
        </button>
      </div>
      <p className="fine-print">
        Existing game files stay unchanged. The connection edits only Companion journal entries in
        game memory; the game saves them normally.
      </p>
      {(error || status.error) && (
        <p className="notice amber" role="alert">
          {error || status.error}
        </p>
      )}
    </section>,
  );
}
