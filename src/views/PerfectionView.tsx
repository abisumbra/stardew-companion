import { localize } from '../lib/locale';
import { useState } from 'react';
import {
  Check,
  ChevronRight,
  ListPlus,
  CheckCircle2,
  CircleDashed,
  CircleHelp,
} from 'lucide-react';
import { Sprite } from '../components/Artwork';
import { Empty, ProgressBar, Sources, Tag, countLabel } from '../components/common';
import type { CompanionContext } from '../companion';
import {
  criterionCounts,
  completionHint,
  completionLabel,
  matchesCompletion,
  type CompletionFilter,
} from '../domain/perfection-display';
export function PerfectionView({
  setDetail,
  category,
  setCategory,
  missingOnly,
  setMissingOnly,
  report,
  save,
  progress,
  matches,
  activeCriterion,
  displayPct,
  planner,
  plannerReady,
  updatePlanner,
}: Pick<
  CompanionContext,
  | 'setDetail'
  | 'category'
  | 'setCategory'
  | 'missingOnly'
  | 'setMissingOnly'
  | 'report'
  | 'save'
  | 'progress'
  | 'matches'
  | 'activeCriterion'
  | 'displayPct'
  | 'planner'
  | 'plannerReady'
  | 'updatePlanner'
>) {
  const [filter, setFilter] = useState<CompletionFilter>(missingOnly ? 'incomplete' : 'all'),
    [evidence, setEvidence] = useState(false),
    [sort, setSort] = useState('status');
  const counts = activeCriterion
    ? criterionCounts(activeCriterion)
    : { complete: 0, incomplete: 0, unknown: 0 };
  const visible = (activeCriterion?.items ?? [])
    .filter((i) => matchesCompletion(i, filter) && matches(i.name))
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : Number(a.done === true) - Number(b.done === true) ||
          Number(a.done === null) - Number(b.done === null) ||
          a.name.localeCompare(b.name),
    );
  const missing = visible.filter((i) => i.done === false && !planner.goals.includes(i.id));
  const choose = (value: CompletionFilter) => {
    setFilter(value);
    setMissingOnly(value === 'incomplete');
  };
  return localize(
    <>
      <div className="view-intro perfection-intro">
        <div>
          <span className="eyebrow">EVERY LITTLE THING COUNTS</span>
          <h1>Perfection</h1>
          <p>Eleven official criteria, with the evidence behind every step.</p>
        </div>
        <div className="perfection-total">
          {displayPct}
          <small>{progress?.waivers ?? '?'} waiver points shown separately</small>
        </div>
      </div>
      {!save ? (
        <Empty title="Connect your farm first">
          Perfection is calculated from your full disk save, never from example numbers.
        </Empty>
      ) : (
        <>
          <label className="compact-criterion-picker">
            Perfection criterion
            <select
              aria-label="Perfection criterion"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {progress?.criteria.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.ratio === null ? 'Unknown' : c.current + ' / ' + c.total}
                </option>
              ))}
            </select>
          </label>
          <div className="criteria-strip">
            {progress?.criteria.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={category === c.id ? 'active' : ''}
                aria-pressed={category === c.id}
              >
                <span>{c.name}</span>
                <strong>
                  {c.ratio === null
                    ? 'Unknown'
                    : c.ratio === 1
                      ? 'Complete'
                      : c.current + ' / ' + c.total}
                </strong>
                <ProgressBar value={c.ratio} label={c.name} />
                <small>{c.weight}% maximum contribution</small>
              </button>
            ))}
          </div>
          {activeCriterion && (
            <section className="panel perfection-panel">
              <div className="perfection-panel-heading">
                <div>
                  <span className="eyebrow">{activeCriterion.weight}% OF OFFICIAL PERFECTION</span>
                  <h2>{activeCriterion.name}</h2>
                  <p>{countLabel(activeCriterion)}</p>
                  {activeCriterion.farmer && (
                    <p className="fine-print">
                      Best farmer for this criterion:{' '}
                      <span data-l10n="off">{activeCriterion.farmer}</span>
                    </p>
                  )}
                </div>
                <div className="perfection-actions">
                  <div
                    className="completion-filter-buttons"
                    role="group"
                    aria-label="Perfection status filter"
                  >
                    {(['all', 'incomplete', 'complete', 'unknown'] as CompletionFilter[]).map(
                      (value) => (
                        <button
                          key={value}
                          className={'button ' + (filter === value ? 'primary' : '')}
                          aria-pressed={filter === value}
                          onClick={() => choose(value)}
                        >
                          {
                            {
                              all: 'All',
                              incomplete: 'Incomplete',
                              complete: 'Complete',
                              unknown: 'Unknown',
                            }[value]
                          }
                        </button>
                      ),
                    )}
                  </div>
                  <div className="perfection-secondary-actions">
                    <select
                      aria-label="Sort Perfection entries"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="status">Status first</option>
                      <option value="name">Name</option>
                    </select>
                    <button
                      className="button"
                      disabled={!plannerReady || !missing.length}
                      onClick={() =>
                        updatePlanner({
                          ...planner,
                          farmerId: activeCriterion.farmerId ?? planner.farmerId,
                          goals: [...new Set([...planner.goals, ...missing.map((i) => i.id)])],
                        })
                      }
                    >
                      <ListPlus size={16} />
                      Plan filtered missing ({missing.length})
                    </button>
                  </div>
                  {activeCriterion.farmer && (
                    <small>
                      Plan for: <span data-l10n="off">{activeCriterion.farmer}</span>
                    </small>
                  )}
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={evidence}
                      onChange={(e) => setEvidence(e.target.checked)}
                    />
                    Show saved evidence
                  </label>
                </div>
              </div>
              <div className="completion-summary">
                <div>
                  <CheckCircle2 size={20} />
                  <strong>{counts.complete}</strong>
                  <span>Confirmed complete</span>
                </div>
                <div>
                  <CircleDashed size={20} />
                  <strong>{counts.incomplete}</strong>
                  <span>Incomplete</span>
                </div>
                <div>
                  <CircleHelp size={20} />
                  <strong>{counts.unknown}</strong>
                  <span>Unknown</span>
                </div>
                <div>
                  <strong>
                    {activeCriterion.ratio === null
                      ? '?'
                      : (activeCriterion.ratio * activeCriterion.weight).toFixed(2)}{' '}
                    / {activeCriterion.weight}
                  </strong>
                  <span>Perfection points earned</span>
                </div>
              </div>
              {activeCriterion.binary && (
                <p className="notice amber">
                  This criterion awards its points only after every required objective is complete.
                  Partial targets still appear below.
                </p>
              )}
              <p className="fine-print">
                Completion comes from the save. Recipe knowledge and item ownership are shown
                separately.
              </p>
              <div className="collection-list perfection-collection">
                {visible.map((i) => (
                  <button
                    className={
                      'collection-row perfection-row ' +
                      (i.done === true
                        ? 'is-complete'
                        : i.done === null
                          ? 'is-unknown'
                          : 'is-incomplete')
                    }
                    key={i.id}
                    onClick={() => setDetail(i.id, undefined, activeCriterion.farmerId)}
                  >
                    <span
                      className={
                        'status-dot ' +
                        (i.done === true ? 'done' : i.done === null ? 'unknown' : '')
                      }
                    >
                      {i.done === true ? <Check size={13} /> : null}
                    </span>
                    <Sprite id={i.id} name={i.name} size={40} decorative />
                    <span className="perfection-row-content">
                      <strong>{i.name}</strong>
                      {i.detail && <small className="perfection-item-detail">{i.detail}</small>}
                      <small>{completionHint(i, category)}</small>
                      {evidence && <code className="saved-evidence">{i.evidence.reason}</code>}
                    </span>
                    <span className="perfection-row-status">
                      <Tag tone={i.done === true ? 'green' : i.done === null ? 'neutral' : 'amber'}>
                        {completionLabel(i, category)}
                      </Tag>
                      {i.known !== undefined && (
                        <small>
                          {i.known === null
                            ? 'Recipe knowledge unknown'
                            : i.known
                              ? 'Recipe learned'
                              : 'Recipe not learned'}
                        </small>
                      )}
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
              {!visible.length && (
                <Empty title="No entries match this status">
                  Choose another status or clear the search.
                </Empty>
              )}
              <Sources ids={['wiki-perfection']} onError={report} />
            </section>
          )}
        </>
      )}
    </>,
  );
}
