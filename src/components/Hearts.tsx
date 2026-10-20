import { localize } from '../lib/locale';
import type { Farmer } from '../domain/models';
import { socialState } from '../domain/social';
import { Sprite, useArtwork } from './Artwork';
export function Hearts({
  name,
  farmer,
  compact = false,
}: {
  name: string;
  farmer: Farmer | null;
  compact?: boolean;
}) {
  const state = socialState(name, farmer);
  const { data: art } = useArtwork();
  if (!state.friendable)
    return localize(
      <span className="social-no-record">Friendship is not tracked for this character.</span>,
    );
  const label =
    state.hearts === null
      ? `${name}: friendship unknown`
      : `${name}: ${state.hearts} of ${state.slots} hearts${state.cap !== null && state.cap < state.slots ? `; ${state.slots - state.cap} hearts locked` : ''}`;
  return localize(
    <div className={`hearts-meter ${compact ? 'compact' : ''}`}>
      <div className="heart-slots" role="img" aria-label={label}>
        {Array.from({ length: state.slots }, (_, i) => {
          const locked = state.cap !== null && i >= state.cap;
          return localize(
            art.sprites['ui:heart-filled'] ? (
              <span
                key={i}
                className={`game-heart pixel-heart ${locked ? 'locked' : state.hearts !== null && i < state.hearts ? 'filled' : 'unfilled'} ${!state.known ? 'unknown' : ''}`}
              >
                <Sprite
                  id={
                    state.hearts !== null && i < state.hearts && !locked
                      ? 'ui:heart-filled'
                      : 'ui:heart-empty'
                  }
                  size={compact ? 14 : 21}
                  decorative
                />
              </span>
            ) : (
              <svg
                key={i}
                viewBox="0 0 7 6"
                className={`pixel-heart ${locked ? 'locked' : state.hearts !== null && i < state.hearts ? 'filled' : 'unfilled'} ${!state.known ? 'unknown' : ''}`}
                aria-hidden="true"
                shapeRendering="crispEdges"
              >
                <path
                  className="heart-edge"
                  d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z"
                />
                <path className="heart-fill" d="M1 1h2v1h1V1h2v2H5v1H4v1H3V4H2V3H1z" />
                <path className="heart-shine" d="M1 1h1v1H1z" />
              </svg>
            ),
          );
        })}
      </div>
      <span className="hearts-caption">
        {state.hearts === null
          ? farmer
            ? 'Friendship points unavailable in this save'
            : 'Select a save to see friendship'
          : `${state.hearts} / ${state.slots} hearts · ${state.points?.toLocaleString()} points`}
      </span>
      {!compact &&
        state.points !== null &&
        state.cap !== null &&
        state.points < state.cap * 250 && (
          <div className="next-heart">
            <span>Next heart: {state.next} / 250 points</span>
            <div
              className="progress"
              role="progressbar"
              aria-label={`Points toward ${name}’s next heart`}
              aria-valuenow={state.next ?? 0}
              aria-valuemin={0}
              aria-valuemax={250}
            >
              <span style={{ width: `${((state.next ?? 0) / 250) * 100}%` }} />
            </div>
          </div>
        )}
    </div>,
  );
}
