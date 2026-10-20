import { useState } from 'react';
import { localize } from '../lib/locale';
import { ArrowUpRight, Check, Plus } from 'lucide-react';
import { ProgressBar, Tag } from '../components/common';
import { knowledge } from '../domain/knowledge';
import { type AccountState } from '../domain/models';
import * as backend from '../lib/backend';

import type { CompanionContext } from '../companion';
import { SteamConnection, SteamIcon } from '../components/SteamConnection';

export function AchievementsView({
  setDetail,
  planner,
  plannerReady,
  account,
  setAccount,
  accountReady,
  achievementFilter,
  setAchievementFilter,
  report,
  save,
  addGoal,
  achievementStates,
  matches,
}: Pick<
  CompanionContext,
  | 'setDetail'
  | 'planner'
  | 'plannerReady'
  | 'account'
  | 'setAccount'
  | 'accountReady'
  | 'achievementFilter'
  | 'setAchievementFilter'
  | 'report'
  | 'save'
  | 'addGoal'
  | 'achievementStates'
  | 'matches'
>) {
  const [completion, setCompletion] = useState('all');
  const complete = (status: string) =>
    ['Steam Verified', 'Save Requirements Met', 'Manually Marked'].includes(status);
  const counts = {
    all: achievementStates.length,
    completed: achievementStates.filter((a) => complete(a.status)).length,
    incomplete: achievementStates.filter((a) => !complete(a.status) && a.status !== 'Unknown')
      .length,
    unknown: achievementStates.filter((a) => a.status === 'Unknown').length,
  };
  return localize(
    <>
      <div className="view-intro">
        <div>
          <span className="eyebrow">A COLLECTION OF MILESTONES</span>
          <h1>Steam Achievements</h1>
          <p>
            {knowledge.steam.observedTotal} official entries · verified {knowledge.steam.observedAt}
            . Account records stay separate from farm evidence.
          </p>
        </div>
        <Tag>
          {account.manuallyMarked.length} manually marked · {account.steam?.unlocked.length ?? 0}{' '}
          Steam verified
        </Tag>
      </div>
      <SteamConnection account={account} onChange={setAccount} disabled={!accountReady} />
      <div className="toolbar achievement-completion-filters">
        <div className="filter-tabs" role="group" aria-label="Achievement completion">
          {(
            [
              ['all', 'All'],
              ['completed', 'Completed'],
              ['incomplete', 'Incomplete'],
              ['unknown', 'Unknown'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              className={completion === key ? 'active' : ''}
              aria-pressed={completion === key}
              onClick={() => {
                setCompletion(key);
                setAchievementFilter('All states');
              }}
            >
              {label} ({counts[key]})
            </button>
          ))}
        </div>
        <p className="fine-print">
          Completed includes Steam verification, satisfied save requirements or your manual mark.
          Each card identifies its evidence. Unknown entries are kept separate.
        </p>
      </div>
      <div className="toolbar">
        <select
          aria-label="Achievement state filter"
          value={achievementFilter}
          onChange={(e) => setAchievementFilter(e.target.value)}
        >
          {[
            'All states',
            'Steam Verified',
            'Save Requirements Met',
            'In Progress',
            'Unknown',
            'Manually Marked',
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <span className="muted">Manual records are account-wide</span>
      </div>
      <div className="achievement-grid">
        {achievementStates
          .filter(
            (a) =>
              (completion === 'all' ||
                (completion === 'completed'
                  ? complete(a.status)
                  : completion === 'unknown'
                    ? a.status === 'Unknown'
                    : !complete(a.status) && a.status !== 'Unknown')) &&
              (achievementFilter === 'All states' || a.status === achievementFilter) &&
              matches(`${a.achievement.name} ${a.achievement.description}`),
          )
          .map((a) => (
            <article className="panel achievement-card" key={a.achievement.id}>
              <div className="achievement-heading">
                <span
                  className={`achievement-icon ${a.status === 'Save Requirements Met' ? 'complete' : ''}`}
                >
                  <SteamIcon id={a.achievement.id} name={a.achievement.name} />
                </span>
                <Tag
                  tone={
                    a.status === 'Save Requirements Met'
                      ? 'green'
                      : a.status === 'Unknown'
                        ? 'neutral'
                        : 'amber'
                  }
                >
                  {a.status}
                </Tag>
              </div>
              <button className="card-title" onClick={() => setDetail(a.achievement.id)}>
                {a.achievement.name}
                <ArrowUpRight size={14} />
              </button>
              <p>
                {a.achievement.description ??
                  'Hidden official description · guide not yet verified'}
              </p>
              {a.current !== null && a.total !== null && (
                <div className="achievement-progress">
                  <ProgressBar
                    value={Math.min(1, a.current / a.total)}
                    label={a.achievement.name}
                  />
                  <small>
                    {a.current.toLocaleString()} / {a.total.toLocaleString()}
                  </small>
                </div>
              )}
              <div className="achievement-actions">
                <button
                  className="text-button"
                  disabled={!save || !plannerReady}
                  onClick={() => addGoal(a.achievement.id)}
                >
                  {planner.goals.includes(a.achievement.id) ? (
                    <Check size={14} />
                  ) : (
                    <Plus size={14} />
                  )}
                  Planner
                </button>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    disabled={!accountReady}
                    checked={account.manuallyMarked.includes(a.achievement.id)}
                    onChange={() => {
                      const next: AccountState = {
                        ...account,
                        manuallyMarked: account.manuallyMarked.includes(a.achievement.id)
                          ? account.manuallyMarked.filter((id) => id !== a.achievement.id)
                          : [...account.manuallyMarked, a.achievement.id],
                      };
                      setAccount(next);
                      void backend.setPersisted('steam-account', next).catch(report);
                    }}
                  />
                  Manual
                </label>
              </div>
            </article>
          ))}
      </div>
    </>,
  );
}
