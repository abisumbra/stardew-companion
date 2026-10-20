import { completeManual, gameDay } from '../domain/agenda';
import { Agenda } from './Agenda';
import { localize } from '../lib/locale';
import { translate } from '../lib/locale';
import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Circle,
  Pin,
  Plus,
  Trash2,
  ChevronDown,
  ArrowUpRight,
  Layers,
  Package,
} from 'lucide-react';
import type { PlannerState, SaveProfile } from '../domain/models';
import { buildPlan } from '../domain/planner';
import { goalLabel } from '../domain/objectives';
import { Sprite, useArtwork } from './Artwork';
import { Empty, Tag } from './common';
import { compareTaskPriority } from '../domain/task-order';
import { JournalTransfer } from './JournalTransfer';
import { GameConnection } from './GameConnection';
import { selectedFarmer } from '../domain/supplies';
import { nextActions, taskBrief } from '../domain/next-steps';
import { NextSteps } from './NextSteps';
export function PlannerView({
  save,
  state,
  onChange,
  onDetail,
  search,
  plan: providedPlan,
  savedCompleted,
  onFindMaterial,
  onRefresh = async () => {},
}: {
  save: SaveProfile | null;
  state: PlannerState;
  onChange: (s: PlannerState) => void;
  onDetail: (id: string) => void;
  search: string;
  plan?: ReturnType<typeof buildPlan>;
  savedCompleted?: string[];
  onFindMaterial?: (id: string) => void;
  onRefresh?: () => Promise<void>;
}) {
  const { data: art } = useArtwork();
  const [scheduled, setScheduled] = useState(false),
    [dueYear, setDueYear] = useState(save?.year ?? 1),
    [dueSeason, setDueSeason] = useState(save?.season ?? 'spring'),
    [dueDate, setDueDate] = useState(save?.day ?? 1),
    [repeat, setRepeat] = useState(0);
  const [taskPage, setTaskPage] = useState(0);
  useEffect(() => setTaskPage(0), [search, state.goals, state.farmerId, save?.id]);
  const [title, setTitle] = useState(''),
    [filter, setFilter] = useState('All tasks'),
    [tab, setTab] = useState<'tasks' | 'materials'>('tasks'),
    [goalFilter, setGoalFilter] = useState('all'),
    [taskStatus, setTaskStatus] = useState('open');
  const plan = useMemo(
    () =>
      providedPlan ??
      (save
        ? buildPlan(save, state, art)
        : { tasks: [], materials: [], completedGoals: [], acquisitionOptions: [] }),
    [save, state, art, providedPlan],
  );
  const savedComplete = useMemo(
    () => savedCompleted ?? (save ? buildPlan(save, state, art).completedGoals : []),
    [savedCompleted, save, state, art],
  );
  const toggleStep = (id: string) =>
    onChange({
      ...state,
      completedSteps: state.completedSteps.includes(id)
        ? state.completedSteps.filter((x) => x !== id)
        : [...state.completedSteps, id],
    });
  const priorities = { high: 0, normal: 1, low: 2 };
  const tasks = plan.tasks
    .filter(
      (t) =>
        (filter === 'All tasks' || t.category === filter) &&
        (goalFilter === 'all' || t.goalIds.includes(goalFilter)) &&
        (taskStatus === 'all' || (taskStatus === 'open' ? !t.manualDone : t.manualDone)) &&
        `${t.title} ${translate(t.title)} ${t.reason} ${translate(t.reason)}`
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase()),
    )
    .sort((a, b) => compareTaskPriority(a, b, state));
  const goalName = (id: string) => goalLabel(id, save, art);
  if (!save)
    return localize(
      <Empty title="Your plans belong to a farm">
        Select or import a save to keep goals, preferences and manual tasks together.
      </Empty>,
    );
  const receipts = state.goalReceipts[selectedFarmer(save, state.farmerId).id] ?? {};
  return localize(
    <>
      <div className="view-intro">
        <div>
          <span className="eyebrow">ONE STEP AT A TIME</span>
          <h1>Smart Planner</h1>
          <p>Connected goals, shared materials, and a clear next step.</p>
        </div>
        <Tag tone="green">{state.goals.length} tracked goals</Tag>
      </div>
      <div className="planner-overview" aria-label="Planner overview">
        <div>
          <strong>{state.goals.length - plan.completedGoals.length}</strong>
          <span>Open goals</span>
        </div>
        <div>
          <strong>{plan.tasks.filter((t) => !t.manualDone).length}</strong>
          <span>Remaining steps</span>
        </div>
        <div>
          <strong>{plan.materials.filter((m) => m.missing > 0).length}</strong>
          <span>Materials to gather</span>
        </div>
        <div>
          <strong>{plan.completedGoals.length}</strong>
          <span>Completed goals</span>
        </div>
      </div>
      {plan.tasks.some((t) => !t.manualDone) && (
        <section className="panel planner-next">
          <div className="section-heading">
            <h2>What’s next?</h2>
            <span>Start with these steps</span>
          </div>
          <NextSteps tasks={nextActions(plan.tasks, state)} onDetail={onDetail} />
        </section>
      )}
      <Agenda save={save} state={state} onDetail={onDetail} />
      <GameConnection save={save} state={state} />
      <JournalTransfer
        key={`${save.id}:${state.farmerId}`}
        save={save}
        state={state}
        tasks={plan.tasks}
        completedGoals={savedComplete}
        onRefresh={onRefresh}
      />
      <section className="panel planner-sync-summary" aria-label="Saved goal progress">
        <div>
          <h3>Verified after saving</h3>
          <Tag tone="green">{savedComplete.length} confirmed goals</Tag>
        </div>
        <details>
          <summary>How progress updates</summary>
          <p>
            Supported goals complete automatically when a new game save confirms the action.
            Progress made while Companion is closed is checked on the next launch. Personal notes
            still require your own checkmark.
          </p>
          <p className="fine-print">
            Cooking and crafting tasks can complete in the game after a new transfer. Other goals
            remain reminders and are refreshed while the game is closed.
          </p>
        </details>
      </section>
      <div className="planner-options">
        <label>
          Plan for farmer
          <select
            aria-label="Planner farmer"
            value={state.farmerId ?? save.players[0].id}
            onChange={(e) => onChange({ ...state, farmerId: e.target.value })}
          >
            {save.players.map((f) => (
              <option key={f.id} value={f.id} data-l10n="off">
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={state.resolveIntermediate}
            onChange={(e) => onChange({ ...state, resolveIntermediate: e.target.checked })}
          />
          Resolve intermediate recipes
        </label>
      </div>
      {plan.acquisitionOptions && plan.acquisitionOptions.length > 0 && (
        <details className="panel acquisition-options">
          <summary>Compare acquisition routes</summary>
          <p>
            Choose an input route or acquire the finished item. Shops still require access,
            available stock and a price check.
          </p>
          {plan.acquisitionOptions.map((r) => (
            <label key={r.id}>
              {r.name}
              <select
                aria-label={`Acquisition route for ${r.name}`}
                value={r.selected}
                onChange={(e) =>
                  onChange({
                    ...state,
                    acquisitionRoutes: { ...state.acquisitionRoutes, [r.id]: e.target.value },
                  })
                }
              >
                {r.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </details>
      )}
      <div className="planner-layout">
        <div>
          <div className="panel-tabs">
            <button className={tab === 'tasks' ? 'active' : ''} onClick={() => setTab('tasks')}>
              <Layers size={16} />
              Tasks <Tag>{plan.tasks.length}</Tag>
            </button>
            <button
              className={tab === 'materials' ? 'active' : ''}
              onClick={() => setTab('materials')}
            >
              <Package size={16} />
              Materials <Tag>{plan.materials.length}</Tag>
            </button>
          </div>
          {tab === 'tasks' ? (
            <>
              <div className="toolbar">
                <label>
                  Goal
                  <select
                    aria-label="Filter by goal"
                    value={goalFilter}
                    onChange={(e) => {
                      setGoalFilter(e.target.value);
                      setTaskPage(0);
                    }}
                  >
                    <option value="all">All goals</option>
                    {state.goals
                      .filter((id) => !plan.completedGoals.includes(id))
                      .map((id) => (
                        <option value={id} key={id}>
                          {goalName(id)}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Status
                  <select
                    aria-label="Filter by task status"
                    value={taskStatus}
                    onChange={(e) => {
                      setTaskStatus(e.target.value);
                      setTaskPage(0);
                    }}
                  >
                    <option value="open">Remaining steps</option>
                    <option value="manual">Manually checked steps</option>
                    <option value="all">All steps</option>
                  </select>
                </label>
                <select
                  aria-label="Filter planner tasks"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setTaskPage(0);
                  }}
                >
                  {[
                    'All tasks',
                    'Available Now',
                    'Almost Complete',
                    'Check Conditions',
                    'Seasonal',
                    'Missing Materials',
                    'Locked Behind Prerequisites',
                    'Long-Term Goals',
                    'Achievement Goals',
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <span className="muted">Regenerated from the last disk save</span>
              </div>
              {tasks.length === 0 ? (
                <Empty title="Make room for your next goal">
                  Open an item or achievement and choose Add to Planner. You can also write a manual
                  task below.
                </Empty>
              ) : (
                <div className="task-list">
                  {tasks
                    .slice(
                      Math.min(taskPage, Math.max(0, Math.ceil(tasks.length / 40) - 1)) * 40,
                      (Math.min(taskPage, Math.max(0, Math.ceil(tasks.length / 40) - 1)) + 1) * 40,
                    )
                    .map((t) => (
                      <article className={`task ${t.manualDone ? 'manually-done' : ''}`} key={t.id}>
                        <button
                          className="check-button"
                          aria-label={`${t.manualDone ? 'Unmark' : 'Manually mark'} ${t.title}`}
                          onClick={() => toggleStep(t.id)}
                        >
                          {t.manualDone ? <Check size={18} /> : <Circle size={18} />}
                        </button>
                        <div className="task-body">
                          <div className="task-title">
                            {t.entryId && (
                              <Sprite id={t.entryId} name={t.title} size={32} decorative />
                            )}
                            <h3>{t.title}</h3>
                            <Tag
                              tone={
                                t.category === 'Available Now'
                                  ? 'green'
                                  : t.category === 'Seasonal'
                                    ? 'amber'
                                    : 'neutral'
                              }
                            >
                              {t.category}
                            </Tag>
                          </div>
                          <p className="task-brief">{taskBrief(t)}</p>
                          {translate(t.reason) !== translate(taskBrief(t)) && (
                            <details className="task-explanation">
                              <summary>Preparation details</summary>
                              <p>{t.reason}</p>
                            </details>
                          )}
                          <div className="task-meta">
                            {t.goalIds.map((id) => (
                              <span key={id}>{goalName(id)}</span>
                            ))}
                            {t.entryId && (
                              <button className="text-button" onClick={() => onDetail(t.entryId!)}>
                                Open field notes <ArrowUpRight size={13} />
                              </button>
                            )}
                          </div>
                          {t.dependencies.length > 0 && (
                            <details>
                              <summary>
                                <ChevronDown size={13} />
                                {t.dependencies.length} prerequisite steps
                              </summary>
                              <ul>
                                {t.dependencies.map((id) => (
                                  <li key={id}>
                                    {plan.tasks.find((x) => x.id === id)?.title ?? id}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                          {t.manualDone && (
                            <p className="manual-note">
                              Manual record preserved.{' '}
                              {t.discrepancy
                                ? 'The saved action record still shows this objective incomplete.'
                                : 'This step is not save-verified.'}
                            </p>
                          )}
                        </div>
                      </article>
                    ))}
                </div>
              )}
              {tasks.length > 40 && (
                <nav className="pagination" aria-label="Planner pages">
                  <button
                    className="button"
                    disabled={taskPage === 0}
                    onClick={() => setTaskPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </button>
                  <span>
                    Page {Math.min(taskPage + 1, Math.ceil(tasks.length / 40))} of{' '}
                    {Math.ceil(tasks.length / 40)}
                  </span>
                  <button
                    className="button"
                    disabled={taskPage >= Math.ceil(tasks.length / 40) - 1}
                    onClick={() => setTaskPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </nav>
              )}
              <section className="panel manual-panel">
                <h3>
                  Personal notes & tasks <Tag>{state.manual.length}</Tag>
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!title.trim()) return;
                    onChange({
                      ...state,
                      manual: [
                        ...state.manual,
                        {
                          id: crypto.randomUUID(),
                          title: title.trim(),
                          done: false,
                          priority: 'normal',
                          ...(scheduled
                            ? {
                                dueDay: gameDay(dueYear, dueSeason, dueDate),
                                farmerId: selectedFarmer(save, state.farmerId).id,
                                ...(repeat > 0 ? { repeatDays: repeat } : {}),
                              }
                            : {}),
                        },
                      ],
                    });
                    setTitle('');
                  }}
                >
                  <input
                    placeholder="Something to remember on this farm…"
                    aria-label="New manual task"
                    value={title}
                    maxLength={500}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={scheduled}
                      onChange={(e) => setScheduled(e.target.checked)}
                    />
                    Game date
                  </label>
                  {scheduled && (
                    <div className="toolbar">
                      <label>
                        Year
                        <input
                          aria-label="Task year"
                          type="number"
                          min="1"
                          max="9999"
                          value={dueYear}
                          onChange={(e) =>
                            setDueYear(
                              Math.max(1, Math.min(9999, Math.floor(Number(e.target.value)))),
                            )
                          }
                        />
                      </label>
                      <label>
                        Season
                        <select
                          aria-label="Task season"
                          value={dueSeason}
                          onChange={(e) => setDueSeason(e.target.value as typeof dueSeason)}
                        >
                          {['spring', 'summer', 'fall', 'winter'].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Day
                        <input
                          aria-label="Task day"
                          type="number"
                          min="1"
                          max="28"
                          value={dueDate}
                          onChange={(e) =>
                            setDueDate(
                              Math.max(1, Math.min(28, Math.floor(Number(e.target.value)))),
                            )
                          }
                        />
                      </label>
                      <label>
                        Repeat every days
                        <input
                          aria-label="Repeat days"
                          type="number"
                          min="0"
                          max="112"
                          value={repeat}
                          onChange={(e) =>
                            setRepeat(
                              Math.max(0, Math.min(112, Math.floor(Number(e.target.value)))),
                            )
                          }
                        />
                      </label>
                      <small>0 means no repeat. Dates belong to the selected farmer.</small>
                    </div>
                  )}
                  <button className="button primary" disabled={!title.trim()}>
                    <Plus size={16} />
                    Add
                  </button>
                </form>
                {state.manual
                  .filter(
                    (t) =>
                      (!t.farmerId || t.farmerId === selectedFarmer(save, state.farmerId).id) &&
                      t.title.toLowerCase().includes(search.toLowerCase()),
                  )
                  .sort((a, b) => priorities[a.priority] - priorities[b.priority])
                  .map((t) => (
                    <div className="manual-row" key={t.id}>
                      <button
                        className="check-button"
                        aria-label={`Toggle ${t.title}`}
                        onClick={() =>
                          onChange({
                            ...state,
                            manual: state.manual.map((x) =>
                              x.id === t.id
                                ? completeManual(x, gameDay(save.year, save.season, save.day))
                                : x,
                            ),
                          })
                        }
                      >
                        {t.done ? <Check size={17} /> : <Circle size={17} />}
                      </button>
                      <span data-l10n="off" className={t.done ? 'strike' : ''}>
                        {t.title}
                      </span>
                      <select
                        aria-label={`Priority for ${t.title}`}
                        value={t.priority}
                        onChange={(e) =>
                          onChange({
                            ...state,
                            manual: state.manual.map((x) =>
                              x.id === t.id
                                ? { ...x, priority: e.target.value as 'high' | 'normal' | 'low' }
                                : x,
                            ),
                          })
                        }
                      >
                        {['high', 'normal', 'low'].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                      <button
                        className="icon-button"
                        onClick={() =>
                          onChange({ ...state, manual: state.manual.filter((x) => x.id !== t.id) })
                        }
                        aria-label={`Delete ${t.title}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
              </section>
            </>
          ) : (
            <section className="panel">
              <h3>Materials across your goals</h3>
              <p className="muted">
                Compatible requirements are added together. Each detected stack is reserved once.
              </p>
              {plan.materials.length === 0 ? (
                <Empty title="No material requirements yet">
                  Add a goal with a verified recipe guide to calculate its ingredients.
                </Empty>
              ) : (
                <>
                  <table className="material-table">
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th>Needed</th>
                        <th>Available</th>
                        <th>Short</th>
                        <th>Manual total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.materials.map((m) => (
                        <tr key={m.id}>
                          <td>
                            <span className="material-name">
                              <Sprite id={m.id} name={m.name} size={32} decorative />
                              <strong>{m.name}</strong>
                            </span>
                            <small>{m.acquire}</small>
                            {onFindMaterial && (
                              <button className="text-button" onClick={() => onFindMaterial(m.id)}>
                                Find in storage
                              </button>
                            )}
                          </td>
                          <td>{m.required}</td>
                          <td>
                            {m.quantityKnown === false ? `${m.available}+` : m.available}
                            {m.manual ? ' *' : ''}
                          </td>
                          <td>
                            <Tag tone={m.missing ? 'amber' : 'green'}>
                              {m.quantityKnown === false && m.missing ? 'Unknown' : m.missing}
                            </Tag>
                            {Boolean(m.planned) && (
                              <small>{m.planned} from planned production</small>
                            )}
                          </td>
                          <td>
                            <input
                              aria-label={`Override ${m.name} availability`}
                              type="number"
                              min="0"
                              max="999999"
                              placeholder="Auto"
                              value={state.resources[m.id] ?? ''}
                              onChange={(e) => {
                                const resources = { ...state.resources };
                                if (e.target.value === '') delete resources[m.id];
                                else
                                  resources[m.id] = Math.max(
                                    0,
                                    Math.min(999999, Math.floor(Number(e.target.value))),
                                  );
                                onChange({ ...state, resources });
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="fine-print">
                    * Manual totals replace detected availability for that material. Clear the field
                    to return to automatic detection. {save.storageScope}
                  </p>
                </>
              )}
            </section>
          )}
        </div>
        <aside className="panel goals-panel">
          <h3>Your goals</h3>
          {state.goals.length === 0 ? (
            <p className="muted">Your first goal starts with a field note.</p>
          ) : (
            state.goals.map((id) => (
              <div className="goal-card" key={id}>
                <div>
                  <button className="text-button goal-name" onClick={() => onDetail(id)}>
                    {goalName(id)}
                  </button>
                  <button
                    className={`icon-button ${state.pinned.includes(id) ? 'pinned' : ''}`}
                    aria-label={`Pin ${goalName(id)}`}
                    onClick={() =>
                      onChange({
                        ...state,
                        pinned: state.pinned.includes(id)
                          ? state.pinned.filter((x) => x !== id)
                          : [...state.pinned, id],
                      })
                    }
                  >
                    <Pin size={14} />
                  </button>
                </div>
                {plan.completedGoals.includes(id) && (
                  <>
                    <Tag tone="green">Save requirements met</Tag>
                    {receipts[id] && (
                      <p className="fine-print">
                        Verified from save · {receipts[id].season} {receipts[id].day}, Year{' '}
                        {receipts[id].year}
                      </p>
                    )}
                  </>
                )}
                <div>
                  <select
                    aria-label={`Priority for ${goalName(id)}`}
                    value={state.priorities[id] ?? 'normal'}
                    onChange={(e) =>
                      onChange({
                        ...state,
                        priorities: {
                          ...state.priorities,
                          [id]: e.target.value as 'high' | 'normal' | 'low',
                        },
                      })
                    }
                  >
                    {['high', 'normal', 'low'].map((v) => (
                      <option key={v}>{v} priority</option>
                    ))}
                  </select>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${goalName(id)}`}
                    onClick={() =>
                      onChange({
                        ...state,
                        goals: state.goals.filter((x) => x !== id),
                        pinned: state.pinned.filter((x) => x !== id),
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
          <p className="fine-print">
            Planner suggestions use the selected farmer. Multiplayer Perfection may use another
            farmer’s best category.
          </p>
        </aside>
      </div>
    </>,
  );
}
