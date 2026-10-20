import { localize } from '../lib/locale';
import { ArrowRight, ListTodo, Sparkles, Trophy } from 'lucide-react';
import { knowledge } from '../domain/knowledge';

import type { CompanionContext } from '../companion';
import { CompletionCollections } from '../components/CompletionCollections';

export function CompletionistView({
  planner,
  account,
  navigate,
  displayPct,
  save,
  updatePlanner,
  addGoal,
  setDetail,
  report,
}: Pick<
  CompanionContext,
  | 'planner'
  | 'account'
  | 'navigate'
  | 'displayPct'
  | 'save'
  | 'updatePlanner'
  | 'addGoal'
  | 'setDetail'
  | 'report'
>) {
  return localize(
    <>
      <div className="view-intro">
        <div>
          <span className="eyebrow">BEYOND THE SUMMIT</span>
          <h1>Completionist</h1>
          <p>Optional goals stay separate from official Perfection and Steam account records.</p>
        </div>
      </div>
      <div className="intro-grid">
        <section className="panel">
          <Sparkles size={26} />
          <h3>Official Perfection</h3>
          <strong className="big-number">{displayPct}</strong>
          <p>Calculated only from supported save evidence.</p>
          <button className="text-button" onClick={() => navigate('Perfection')}>
            View criteria <ArrowRight size={14} />
          </button>
        </section>
        <section className="panel">
          <Trophy size={26} />
          <h3>Steam account records</h3>
          <strong className="big-number">
            {account.manuallyMarked.length} / {knowledge.steam.observedTotal}
          </strong>
          <p>Manually marked. No account unlocks are automatically verified.</p>
          <button className="text-button" onClick={() => navigate('Steam Achievements')}>
            View achievements <ArrowRight size={14} />
          </button>
        </section>
        <section className="panel">
          <ListTodo size={26} />
          <h3>Personal completion</h3>
          <strong className="big-number">
            {planner.manual.filter((t) => t.done).length} / {planner.manual.length}
          </strong>
          <p>
            Manual tasks for the selected farm; a personal checklist, separate from save completion.
          </p>
          <button className="text-button" onClick={() => navigate('Smart Planner')}>
            Open personal tasks <ArrowRight size={14} />
          </button>
        </section>
      </div>
      {save && (
        <CompletionCollections
          save={save}
          planner={planner}
          onChange={updatePlanner}
          onAdd={addGoal}
          onDetail={setDetail}
          onError={report}
        />
      )}
    </>,
  );
}
