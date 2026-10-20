import { localize, translate } from '../lib/locale';
import type { Task } from '../domain/planner';
import { Sprite } from './Artwork';
import { Tag } from './common';
import { taskBrief } from '../domain/next-steps';
export function NextSteps({ tasks, onDetail }: { tasks: Task[]; onDetail: (id: string) => void }) {
  return localize(
    <ol className="next-step-list">
      {tasks.map((task, index) => {
        const reason = translate(task.reason),
          brief = translate(taskBrief(task));
        return (
          <li key={task.id}>
            <span className="step-number">{index + 1}</span>
            <div>
              <div className="next-step-title">
                {task.entryId && (
                  <Sprite id={task.entryId} name={task.title} size={32} decorative />
                )}
                <strong>{task.title}</strong>
              </div>
              <Tag tone={task.category === 'Available Now' ? 'green' : 'amber'}>
                {task.category}
              </Tag>
              <p>{brief}</p>
              {reason !== brief && (
                <details>
                  <summary>Preparation details</summary>
                  <p>{reason}</p>
                </details>
              )}
              <button
                className="text-button"
                onClick={() => onDetail(task.entryId ?? task.goalIds[0])}
              >
                Open field notes →
              </button>
            </div>
          </li>
        );
      })}
    </ol>,
  );
}
