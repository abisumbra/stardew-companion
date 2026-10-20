import { describe, it, expect } from 'vitest';
import { walkingPath } from './tilemap';
import { plantingWindow } from './installed';
describe('static walking references', () => {
  it('takes a shortest detour without crossing water, boundaries or wrapping rows', () => {
    const map = {
      width: 3,
      height: 3,
      walkable: [true, false, true, true, false, true, true, true, true],
    };
    expect(walkingPath(map, [0, 0], [2, 0])).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 2],
      [2, 1],
      [2, 0],
    ]);
    expect(walkingPath(map, [-1, 0], [2, 0])).toBeNull();
    expect(walkingPath(map, [0, 0], [1, 0])).toBeNull();
    expect(
      walkingPath(
        { ...map, walkable: map.walkable.map((v, i) => (i === 7 ? false : v)) },
        [0, 0],
        [2, 0],
      ),
    ).toBeNull();
  });
  it('does not give a false month-end deadline to multi-season or all-year crops', () => {
    expect(plantingWindow({ Seasons: [0], DaysInPhase: [1, 2, 1] }, 'spring').deadline).toBe(24);
    expect(
      plantingWindow({ Seasons: [1, 2], DaysInPhase: [1, 3, 3, 3, 4] }, 'summer').deadline,
    ).toBe(42);
    expect(plantingWindow({ Seasons: [1, 2], DaysInPhase: [1, 3, 3, 3, 4] }, 'fall').deadline).toBe(
      14,
    );
    expect(plantingWindow({ Seasons: [0, 1, 2, 3], DaysInPhase: [7] }, 'winter').allYear).toBe(
      true,
    );
    expect(plantingWindow({ Seasons: [1], DaysInPhase: [7] }, 'winter').deadline).toBeNull();
  });
});
