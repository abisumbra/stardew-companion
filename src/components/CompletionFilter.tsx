import { localize } from '../lib/locale';
import type { CompletionFilter as Filter } from '../domain/perfection-display';
export function CompletionFilter({
  value,
  onChange,
  values,
}: {
  value: Filter;
  onChange: (v: Filter) => void;
  values: (boolean | null)[];
}) {
  return localize(
    <div className="completion-filter-buttons" role="group" aria-label="Collection status filter">
      {(['all', 'incomplete', 'complete', 'unknown'] as Filter[]).map((key) => (
        <button
          key={key}
          className={'button ' + (value === key ? 'primary' : '')}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
        >
          {{ all: 'All', incomplete: 'Incomplete', complete: 'Complete', unknown: 'Unknown' }[key]}{' '}
          <b>
            {
              values.filter(
                (done) =>
                  key === 'all' ||
                  (key === 'complete'
                    ? done === true
                    : key === 'incomplete'
                      ? done === false
                      : done === null),
              ).length
            }
          </b>
        </button>
      ))}
    </div>,
  );
}
