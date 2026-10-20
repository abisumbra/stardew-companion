import { useEffect, useMemo, useState } from 'react';
import { NotebookPen, Upload, Undo2, ShieldCheck } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { desktop } from '../lib/backend';
import { localize, useLocale } from '../lib/locale';
import { offlineJournalNotes, type JournalReceipt } from '../domain/journal';
import type { SaveProfile, PlannerState } from '../domain/models';
import type { Task } from '../domain/planner';
import { useArtwork } from './Artwork';
export function JournalTransfer({
  save,
  state,
  tasks,
  completedGoals,
  onRefresh,
}: {
  save: SaveProfile;
  state: PlannerState;
  tasks: Task[];
  completedGoals: string[];
  onRefresh: () => Promise<void>;
}) {
  const { data: art } = useArtwork(),
    locale = useLocale();
  const notes = useMemo(
    () => offlineJournalNotes(save, state, art, tasks, completedGoals),
    [save, state, art, tasks, completedGoals, locale],
  );
  const signature = notes.map((n) => n.id).join('|');
  const farmer = save.players.find((f) => f.id === state.farmerId) ?? save.players[0];
  const existingNotes =
    farmer.quests?.filter((q) => q.id.startsWith('StardewCompanion:')).length ?? 0;
  const [selected, setSelected] = useState(() => notes.slice(0, 80).map((n) => n.id)),
    [closed, setClosed] = useState(false),
    [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState<JournalReceipt | null>(null),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  useEffect(() => setSelected(notes.slice(0, 80).map((n) => n.id)), [signature]);
  useEffect(() => {
    let active = true;
    if (desktop)
      void invoke<JournalReceipt | null>('journal_receipt', { path: save.path, saveId: save.id })
        .then((r) => {
          if (active) setReceipt(r);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [save.path, save.fingerprint]);
  async function transfer(undo = false) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (undo) {
        await invoke('undo_journal', { path: save.path, saveId: save.id });
        setReceipt(null);
        setMessage('Journal transfer undone. The previous save was restored.');
      } else {
        const r = await invoke<JournalReceipt>('sync_journal', {
          path: save.path,
          fingerprint: save.fingerprint,
          farmerId: farmer.id,
          tasks: notes.filter((n) => selected.includes(n.id)),
        });
        setReceipt(r);
        setMessage('Journal updated. Load this save in Stardew Valley to see the notes.');
      }
      await onRefresh();
      setClosed(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return localize(
    <details className="panel journal-transfer">
      <summary>
        <NotebookPen size={21} />
        Offline cooking and crafting export<span>{notes.length} notes</span>
      </summary>
      <p>Close the game, transfer the selected tasks, then reload your save.</p>
      <p>
        On 1.6.9 or newer saves, cooking and crafting tasks are tracked by the game. When completed,
        reward-free tasks disappear from the journal. Other goals stay in Companion.
      </p>
      <p className="fine-print">
        This offline fallback uses English text for font compatibility. The live connection uses
        the game's current language and supports more task types.
      </p>
      <p className="fine-print">
        Requires a Stardew Valley 1.6 save. Transfer is manual; notes do not appear while the game
        is running.
      </p>
      <p className="fine-print">
        {existingNotes} existing game notes · {notes.length} pending Planner notes
      </p>
      <p className="fine-print">
        Completed goals are excluded from the next transfer. Clear the selection and transfer to
        remove old Companion notes, even after the game has saved new progress.
      </p>
      <p className="notice amber">
        <ShieldCheck size={17} />
        This action updates only this farmer’s Companion notes in the save. A full backup is created
        before writing. Existing story quests are preserved.
      </p>
      <div className="journal-pick-controls">
        <button
          className="text-button"
          onClick={() => setSelected(notes.slice(0, 80).map((n) => n.id))}
        >
          Select first 80
        </button>
        <button className="text-button" onClick={() => setSelected([])}>
          Clear selection
        </button>
        <strong>{selected.length} selected</strong>
      </div>
      <div className="journal-preview">
        {notes.map((n) => (
          <label key={n.id}>
            <input
              type="checkbox"
              checked={selected.includes(n.id)}
              disabled={!selected.includes(n.id) && selected.length >= 80}
              onChange={(e) =>
                setSelected(
                  e.target.checked ? [...selected, n.id] : selected.filter((id) => id !== n.id),
                )
              }
            />
            <span>
              <strong data-l10n="off">{n.title}</strong>
              {n.objective !== n.title && <small data-l10n="off">{n.objective}</small>}
              <small>{n.tracking ? 'Game tracks this action' : 'Reminder only'}</small>
            </span>
          </label>
        ))}
        {!notes.length && <p>No pending Planner goals or personal tasks.</p>}
      </div>
      <label className="checkbox-label">
        <input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} />I
        have closed Stardew Valley
      </label>
      <div className="journal-actions">
        <button
          className="button primary"
          disabled={!desktop || busy || !closed || (!selected.length && !receipt && !existingNotes)}
          onClick={() => void transfer()}
        >
          <Upload size={17} />
          {busy
            ? 'Working…'
            : selected.length
              ? 'Transfer selected notes'
              : 'Remove Companion notes'}
        </button>
        <button
          className="button"
          disabled={
            !desktop ||
            busy ||
            !closed ||
            !receipt ||
            save.fingerprint !== receipt.appliedFingerprint
          }
          onClick={() => void transfer(true)}
        >
          <Undo2 size={17} />
          Undo last transfer
        </button>
      </div>
      <p className="fine-print">
        These notes do not grant money, items, friendship or achievement credit. Progress updates
        after the next saved game scan. Undo is available until the game saves new progress.
      </p>
      {receipt && <small>Backup: {receipt.backupId}</small>}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {error && (
        <div className="route-unknown" role="alert">
          <p>{error}</p>
          {error.includes('The save changed. Rescan before transferring tasks') && (
            <>
              <p>
                To protect newer progress, nothing was written. Close the game, rescan this save,
                then review your notes and transfer again.
              </p>
              <button className="button" disabled={busy} onClick={() => void onRefresh()}>
                Rescan saves
              </button>
            </>
          )}
        </div>
      )}
    </details>,
  );
}
