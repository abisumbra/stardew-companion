import { useMemo } from 'react';
import type { PlannerState, SaveProfile } from '../domain/models';
import { agenda, gameDay, dateFromDay } from '../domain/agenda';
import { useArtwork } from './Artwork';
import { localize, useLocale } from '../lib/locale';
export function Agenda({
  save,
  state,
  onDetail,
}: {
  save: SaveProfile;
  state: PlannerState;
  onDetail: (id: string) => void;
}) {
  const { data } = useArtwork();
  const locale = useLocale();
  const rows = useMemo(() => agenda(save, state, data), [save, state, data, locale]);
  const today = gameDay(save.year, save.season, save.day);
  return localize(
    <section className="panel agenda">
      <h2>Today and upcoming</h2>
      <p>
        Based on the saved game date. Personal tasks include overdue dates; guide events cover the
        next seven days.
      </p>
      {!rows.length && <p>No upcoming entries.</p>}
      <div className="agenda-list">
        {rows.map((row) => {
          const d = dateFromDay(row.day);
          return (
            <article key={row.id}>
              <strong data-l10n={row.manual ? 'off' : undefined}>{row.title}</strong>
              <span>
                {row.day < today ? 'Overdue' : row.day === today ? 'Today' : 'Upcoming'} ·{' '}
                {d.season} {d.day}, {d.year}
              </span>
              {row.caution && <small>{row.caution}</small>}
              {row.detail && (
                <button className="text-button" onClick={() => onDetail(row.detail!)}>
                  Open field notes
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>,
  );
}
