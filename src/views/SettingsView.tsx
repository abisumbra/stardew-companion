import { localize } from '../lib/locale';
import { useLocale, setLocale } from '../lib/locale';
import { languageNames } from '../locales/catalog';
import { useTextScale, setTextScale } from '../lib/display';
import { FolderOpen, Leaf, ShieldCheck, Sparkles } from 'lucide-react';
import { Sources, Tag } from '../components/common';
import { guides, knowledge } from '../domain/knowledge';
import * as backend from '../lib/backend';

import type { CompanionContext } from '../companion';
import { Sprite, useArtwork } from '../components/Artwork';
import { useState } from 'react';
import type { Backup } from '../domain/backup';

export function SettingsView({
  reduceMotion,
  setReduceMotion,
  report,
  save,
  navigate,
  retryState,
}: Pick<
  CompanionContext,
  'selected' | 'reduceMotion' | 'setReduceMotion' | 'report' | 'save' | 'navigate' | 'retryState'
>) {
  const artwork = useArtwork();
  const language = useLocale();
  const textScale = useTextScale();
  const [backup, setBackup] = useState<Backup | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [currentBackup, setCurrentBackup] = useState<Backup | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupNotice, setBackupNotice] = useState('');
  async function backupAction(action: () => Promise<void>) {
    setBackupBusy(true);
    setBackupNotice('');
    try {
      await action();
    } catch (e) {
      report(e);
    } finally {
      setBackupBusy(false);
    }
  }
  return localize(
    <>
      <div className="view-intro">
        <div>
          <span className="eyebrow">A QUIET LITTLE WORKSPACE</span>
          <h1>Settings</h1>
          <p>Local by design, transparent about what is supported.</p>
        </div>
        <Tag>Development preview</Tag>
      </div>
      <div className="settings-columns">
        <section className="panel">
          <h3>Back up your plans</h3>
          <p>
            Save all farm plans, personal notes, manual achievements and farm preferences in a JSON
            file.
          </p>
          <div className="button-row">
            <button
              className="button"
              disabled={!backend.desktop || backupBusy}
              onClick={() =>
                void backupAction(async () => {
                  if (await backend.exportBackup()) setBackupNotice('Backup saved.');
                })
              }
            >
              Export backup
            </button>
            <button
              className="button"
              disabled={!backend.desktop || backupBusy}
              onClick={() =>
                void backupAction(async () => {
                  const next = await backend.readBackup();
                  setCurrentBackup(await backend.backupSnapshot());
                  setBackup(next);
                  setSelectedSections(Object.keys(next?.states ?? {}));
                })
              }
            >
              Choose backup
            </button>
            <button
              className="button"
              disabled={!backend.desktop || backupBusy}
              onClick={() =>
                void backupAction(async () => {
                  await backend.undoRestore();
                  retryState();
                  setBackupNotice('Previous application data restored.');
                })
              }
            >
              Undo last backup restore
            </button>
            <button className="button" disabled={backupBusy} onClick={retryState}>
              Retry saved data
            </button>
          </div>
          {backup && (
            <div className="panel">
              <p>
                {Object.keys(backup.states).filter((s) => s.startsWith('farm:')).length} farm plans
              </p>
              <p>
                Matching plans and account records will be replaced. Other farms will be kept. Game
                saves are never changed.
              </p>
              {Object.keys(backup.states).map((scope) => (
                <label className="setting-row" key={scope}>
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(scope)}
                    onChange={(e) =>
                      setSelectedSections(
                        e.target.checked
                          ? [...selectedSections, scope]
                          : selectedSections.filter((k) => k !== scope),
                      )
                    }
                  />
                  <span data-l10n="off">{scope}</span>
                  <span>
                    {JSON.stringify(currentBackup?.states[scope]) ===
                    JSON.stringify(backup.states[scope])
                      ? 'Unchanged'
                      : currentBackup?.states[scope]
                        ? 'Replace existing data'
                        : 'Add new data'}
                  </span>
                </label>
              ))}
              <p>
                A recovery copy is saved before replacement. Undo restores the selected sections to
                their previous values.
              </p>
              <button
                className="button primary"
                disabled={backupBusy || !selectedSections.length}
                onClick={() =>
                  void backupAction(async () => {
                    await backend.restoreBackup({
                      ...backup,
                      states: Object.fromEntries(
                        Object.entries(backup.states).filter(([scope]) =>
                          selectedSections.includes(scope),
                        ),
                      ),
                    });
                    setBackup(null);
                    retryState();
                    setBackupNotice('Backup restored.');
                  })
                }
              >
                Restore this backup
              </button>
              <button className="button" disabled={backupBusy} onClick={() => setBackup(null)}>
                Cancel
              </button>
            </div>
          )}
          {backupNotice && <p role="status">{backupNotice}</p>}
        </section>
        <section className="panel artwork-settings">
          <div className="artwork-heading">
            <Sprite id="object:24" name="Parsnip" size={48} decorative />
            <div>
              <h3>Original game artwork</h3>
              <p>Item icons, recipes, character portraits and monsters.</p>
            </div>
          </div>
          <Tag tone={artwork.data.root ? 'green' : 'amber'}>
            {artwork.loading
              ? 'Loading…'
              : artwork.data.root
                ? 'Game connected'
                : 'Game folder needed'}
          </Tag>
          {artwork.data.root && <p className="game-path">{artwork.data.root}</p>}
          <p>
            {artwork.data.items.length} items · {artwork.data.characters.length} portraits ·{' '}
            {artwork.data.monsters.length} monster sheets
          </p>
          <p className="fine-print">
            Artwork is decoded in memory from your installed Stardew Valley 1.6+ copy. Game files
            are read-only. No game art is included in the installer.
          </p>
          <div className="button-row">
            <button
              className="button primary"
              disabled={!backend.desktop || artwork.loading}
              onClick={() => void artwork.choose()}
            >
              <FolderOpen size={16} />
              Choose game folder
            </button>
            <button
              className="button"
              disabled={!backend.desktop || artwork.loading}
              onClick={() => void artwork.reload()}
            >
              Reload artwork
            </button>
          </div>
          {artwork.error && <p role="alert">{artwork.error}</p>}
          {artwork.data.warnings.length > 0 && (
            <details>
              <summary>{artwork.data.warnings.length} artwork loading issues</summary>
              {artwork.data.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </details>
          )}
        </section>
        <section className="panel">
          <h3>Your privacy</h3>
          <label className="setting-row">
            Text size
            <select
              aria-label="Text size"
              value={textScale}
              onChange={(e) => setTextScale(Number(e.target.value))}
            >
              <option value="1">100%</option>
              <option value="1.15">115%</option>
              <option value="1.3">130%</option>
            </select>
          </label>
          <label className="setting-row">
            Language
            <select
              aria-label="Language"
              value={language}
              onChange={(e) => setLocale(e.target.value as 'tr' | 'en')}
            >
              {Object.entries(languageNames).map(([code, name]) => (
                <option key={code} value={code} data-l10n="off">
                  {name}
                </option>
              ))}
            </select>
          </label>
          <p className="fine-print language-note">
            Original game terms use the selected language. Some Companion guides still fall back to
            English.
          </p>
          <div className="setting-row">
            <ShieldCheck size={21} />
            <div>
              <strong>Save access and journal backups</strong>
              <p>
                Scans are read-only. Only an explicit journal transfer writes Companion notes to a
                save, after creating a full backup. Planner data stays in the application database.
              </p>
            </div>
            <Tag tone="green">Backed up</Tag>
          </div>
          <div className="setting-row">
            <Leaf size={21} />
            <div>
              <strong>Offline operation</strong>
              <p>
                No analytics or required sign-in. Public Steam reads and picture downloads run only
                when requested.
              </p>
            </div>
            <Tag tone="green">Always on</Tag>
          </div>
          <label className="setting-row">
            <Sparkles size={21} />
            <div>
              <strong>Reduce motion</strong>
              <p>Disable interface transitions and animation.</p>
            </div>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => {
                setReduceMotion(e.target.checked);
                void backend
                  .setPersisted('preferences', {
                    selected: save?.id ?? null,
                    reduceMotion: e.target.checked,
                  })
                  .catch(report);
              }}
            />
          </label>
          <button className="button" onClick={() => navigate('Save Manager')}>
            <FolderOpen size={16} />
            Manage save access
          </button>
        </section>
        <section className="panel">
          <h3>Knowledge coverage</h3>
          <p>Bundle {knowledge.version} · game 1.5 and 1.6 catalogs</p>
          <div className="coverage-number">
            <strong>{Object.keys(guides).length}</strong>
            <span>
              detailed guides
              <br />
              with source references
            </span>
          </div>
          <p>
            {knowledge.entries.filter((e) => e.versions.includes('1.6')).length} collection entries
            for 1.6. Connected game data adds all cooking/crafting ingredients, recipe sources,
            processing rules, crops, buildings, schedules and gift preferences. Some special
            conditions still require an in-game check.
          </p>
          <p className="fine-print">
            Modded content is tolerated, but mod-adjusted Perfection totals are unsupported. Wiki
            API access is unconfirmed; automated crawling is disabled. Updates require a reviewed
            local knowledge import.
          </p>
        </section>
      </div>
      <section className="panel">
        <h3>Attribution</h3>
        <p>
          Unofficial fan project. Not affiliated with ConcernedApe, Stardew Valley or Valve. No game
          artwork is bundled. Application code is MIT; applicable wiki-derived content is CC
          BY-NC-SA 3.0 and has noncommercial/share-alike requirements.
        </p>
        <Sources
          ids={[
            'wiki-perfection',
            'wiki-cooking',
            'wiki-crafting',
            'wiki-collections',
            'checkup',
            'steam',
          ]}
          onError={report}
        />
      </section>
    </>,
  );
}
