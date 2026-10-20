import { localize } from '../lib/locale';
import { CalendarDays, FolderOpen, Plus, Sprout } from 'lucide-react';
import { Empty, Tag } from '../components/common';
import { calculateProgress } from '../domain/progress';
import * as backend from '../lib/backend';

import type { CompanionContext } from '../companion';
import { formatTime, titleCase } from '../companion';
import { PanelHeading } from '../components/common';

export function SaveManagerView({
  scan,
  history,
  report,
  refresh,
  save,
  chooseSave,
  addDirectory,
  importSave,
}: Pick<
  CompanionContext,
  | 'scan'
  | 'season'
  | 'history'
  | 'report'
  | 'refresh'
  | 'save'
  | 'chooseSave'
  | 'addDirectory'
  | 'importSave'
>) {
  return localize(
    <>
      <div className="view-intro">
        <div>
          <span className="eyebrow">ROOTED IN YOUR REAL PROGRESS</span>
          <h1>Save Manager</h1>
          <p>Automatic discovery and safe, read-only synchronization.</p>
        </div>
        <div className="button-row">
          <button
            className="button"
            disabled={!backend.desktop}
            onClick={() => void backend.restoreHiddenSaves().then(refresh).catch(report)}
          >
            Show hidden saves
          </button>
          <button className="button" disabled={!backend.desktop} onClick={() => void importSave()}>
            <FolderOpen size={16} />
            Import save
          </button>
          <button
            className="button primary"
            disabled={!backend.desktop}
            onClick={() => void addDirectory()}
          >
            <Plus size={16} />
            Add folder
          </button>
        </div>
      </div>
      <div className="save-grid">
        {scan.saves.map((s) => (
          <div className="save-card-wrap" key={s.id}>
            <button
              className={`panel save-card ${save?.id === s.id ? 'selected' : ''}`}
              key={s.id}
              onClick={() => chooseSave(s.id)}
            >
              <div className="save-card-heading">
                <span className="farm-avatar">
                  <Sprout size={24} />
                </span>
                {save?.id === s.id && <Tag tone="green">Selected</Tag>}
              </div>
              <h3>{s.farmName} Farm</h3>
              <p>
                {s.players[0].name} · {s.farmType}
              </p>
              <div className="save-date">
                <CalendarDays size={15} />
                {titleCase(s.season)} {s.day}, Year {s.year}
              </div>
              <small>
                Game {s.gameVersion ?? 'unknown'} · {s.players.length} farmer(s)
              </small>
              <small>Last saved {formatTime(s.savedAt)}</small>
              <small>
                Perfection{' '}
                {(() => {
                  const p = calculateProgress(s);
                  return p.total === null ? 'Unknown / partial evidence' : `${p.total.toFixed(1)}%`;
                })()}
              </small>
            </button>
            <button
              className="text-button"
              disabled={!backend.desktop}
              onClick={() => void backend.hideSave(s.path).then(refresh).catch(report)}
            >
              Hide from list
            </button>
          </div>
        ))}
      </div>
      {scan.saves.length === 0 && (
        <Empty title="No readable saves yet">
          {backend.desktop
            ? 'Add a directory or import the full save file. SaveGameInfo is only a summary and cannot be analyzed.'
            : 'Launch the Tauri desktop application to access local saves.'}
        </Empty>
      )}
      <section className="panel">
        <PanelHeading title="Watched directories" action="Rescan" onAction={() => void refresh()} />
        {scan.directories.length === 0 ? (
          <p className="muted">No native directory access in browser preview.</p>
        ) : (
          scan.directories.map((path) => (
            <div className="directory-row" key={path}>
              <FolderOpen size={17} />
              <code>{path}</code>
              <button
                className="text-button"
                disabled={!scan.customDirectories.includes(path)}
                onClick={() => void backend.removeDirectory(path).then(refresh).catch(report)}
              >
                {scan.customDirectories.includes(path)
                  ? 'Remove custom access'
                  : 'Default directory'}
              </button>
            </div>
          ))
        )}
        <p className="fine-print">
          The platform’s standard save directory is always checked. “Remove custom access” removes
          only an added directory. Default paths cannot be removed here.
        </p>
      </section>
      {scan.issues.length > 0 && (
        <section className="panel">
          <h3>Files needing attention</h3>
          {scan.issues.map((i) => (
            <div className="scan-issue" key={i.path}>
              <code>{i.path}</code>
              <p>{i.message}</p>
              {/[\\/]/.test(i.path) && (
                <button
                  className="text-button"
                  disabled={!backend.desktop}
                  onClick={() => void backend.hideSave(i.path).then(refresh).catch(report)}
                >
                  Hide this file
                </button>
              )}
            </div>
          ))}
        </section>
      )}
      {save && history.length > 0 && (
        <section className="panel">
          <h3>Local progress history</h3>
          <p className="muted">A new snapshot is recorded only when this save’s content changes.</p>
          {history.map((h, i) => (
            <details className="history-entry" key={i}>
              <summary className="history-row">
                <span>{formatTime(h.at)}</span>
                <strong>
                  {titleCase(h.summary.season)} {h.summary.day}, Y{h.summary.year}
                </strong>
                <small>
                  {h.summary.cooked ?? '?'} dishes cooked · {h.summary.fish ?? '?'} fish types
                </small>
                {h.summary.perfection !== undefined && (
                  <strong>
                    {h.summary.perfection === null
                      ? 'Unknown'
                      : `${h.summary.perfection.toFixed(1)}%`}
                  </strong>
                )}
              </summary>
              {h.summary.criteria && (
                <div className="history-criteria">
                  {h.summary.criteria.map((c) => (
                    <div key={c.id}>
                      <span>{c.name}</span>
                      <strong>{c.ratio === null ? 'Unknown' : `${c.current} / ${c.total}`}</strong>
                    </div>
                  ))}
                </div>
              )}
            </details>
          ))}
        </section>
      )}
    </>,
  );
}
