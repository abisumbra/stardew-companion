import { invoke, isTauri } from '@tauri-apps/api/core';
import { open, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { AppearanceSchema, BackupSchema, type Backup } from '../domain/backup';
import { openUrl } from '@tauri-apps/plugin-opener';
import { listen } from '@tauri-apps/api/event';
import { ScanSchema, SaveSchema, type ScanResult } from '../domain/models';
import { setLocale } from './locale';
import { setTextScale } from './display';
import { calculateProgress } from '../domain/progress';
import type { SaveProfile } from '../domain/models';
export const desktop = isTauri();
export async function scan(): Promise<ScanResult> {
  return desktop
    ? ScanSchema.parse(await invoke('scan_saves'))
    : { saves: [], issues: [], directories: [], customDirectories: [] };
}
export async function addDirectory() {
  if (!desktop) throw new Error('Save access is available in the desktop application.');
  const path = await open({
    directory: true,
    multiple: false,
    title: 'Choose a Stardew Valley Saves directory',
  });
  if (path) await invoke('add_directory', { path });
  return Boolean(path);
}
export async function importSave() {
  if (!desktop) throw new Error('Save access is available in the desktop application.');
  const path = await open({
    directory: false,
    multiple: false,
    title: 'Choose the full save file (not SaveGameInfo)',
  });
  return path ? SaveSchema.parse(await invoke('import_save', { path })) : null;
}
export async function removeDirectory(path: string) {
  await invoke('remove_directory', { path });
}
export async function hideSave(path: string) {
  if (desktop) await invoke('hide_save', { path });
}
export async function restoreHiddenSaves() {
  if (desktop) await invoke('restore_hidden_saves');
}
let pending: Promise<unknown> = Promise.resolve();
export async function getPersisted(scope: string): Promise<unknown> {
  // A newly mounted page must observe queued writes from the page it replaces.
  await pending.catch(() => {});
  if (desktop) return invoke('get_state', { scope });
  const raw = localStorage.getItem(`companion:${scope}`);
  return raw ? JSON.parse(raw) : null;
}
export async function setPersisted(scope: string, value: unknown) {
  const write = () =>
    desktop
      ? invoke('set_state', { scope, value })
      : Promise.resolve(localStorage.setItem(`companion:${scope}`, JSON.stringify(value)));
  const next = pending.catch(() => {}).then(write);
  pending = next;
  return next;
}
export async function watchSaves(callback: () => void) {
  return desktop ? listen('saves-changed', callback) : () => {};
}
export async function backupSnapshot() {
  await setPersisted(
    'appearance',
    AppearanceSchema.parse({
      version: 1,
      language: document.documentElement.lang || 'en',
      textScale: Number(localStorage.getItem('companion:text-scale') ?? 1),
    }),
  );
  await pending;
  return BackupSchema.parse(await invoke('export_backup'));
}
export async function exportBackup() {
  const backup = await backupSnapshot();
  const path = await saveDialog({
    defaultPath: 'stardew-companion-backup.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (!path) return false;
  await invoke('write_backup', { path, backup });
  return true;
}
export async function readBackup(): Promise<Backup | null> {
  const path = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] });
  return path ? BackupSchema.parse(await invoke('read_backup', { path })) : null;
}
export async function restoreBackup(backup: Backup) {
  await pending;
  await backupSnapshot();
  await invoke('restore_backup', { backup: BackupSchema.parse(backup) });
  await applyAppearance();
}
async function applyAppearance() {
  const raw = await getPersisted('appearance');
  if (raw) {
    const value = AppearanceSchema.parse(raw);
    if (!(await setLocale(value.language))) throw Error('Language could not be loaded. Retry.');
    setTextScale(value.textScale);
  }
}
export async function undoRestore() {
  await pending;
  await invoke('undo_restore');
  await applyAppearance();
}
export async function sourceLink(url: string) {
  if (
    !/^https:\/\/(?:www\.)?(?:stardewvalleywiki\.com|steamcommunity\.com|github\.com)(?:\/|$)/.test(
      url,
    )
  )
    throw new Error('Untrusted source URL');
  if (desktop) await openUrl(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}
export async function getHistory(id: string): Promise<
  {
    at: number;
    summary: {
      season: string;
      day: number;
      year: number;
      cooked: number | null;
      fish: number | null;
      natural?: number | null;
      perfection?: number | null;
      waivers?: number | null;
      criteria?: {
        id: string;
        name: string;
        current: number;
        total: number;
        ratio: number | null;
      }[];
    };
  }[]
> {
  return desktop ? invoke('progress_history', { id }) : [];
}
export async function recordProgress(save: SaveProfile) {
  if (!desktop) return;
  const p = calculateProgress(save),
    count = (record: Record<string, number> | null) =>
      record === null ? null : Object.values(record).filter((n) => n > 0).length;
  await invoke('record_progress', {
    id: save.id,
    fingerprint: save.fingerprint,
    summary: {
      season: save.season,
      day: save.day,
      year: save.year,
      cooked: count(save.players[0].cooked),
      fish: count(save.players[0].fish),
      natural: p.natural,
      perfection: p.total,
      waivers: p.waivers,
      criteria: p.criteria.map(({ id, name, current, total, ratio }) => ({
        id,
        name,
        current,
        total,
        ratio,
      })),
    },
  });
}
