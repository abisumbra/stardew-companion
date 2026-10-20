import { it, expect } from 'vitest';
import { syntheticSave } from './test-fixture';
import { knowledge } from './knowledge';
import { achievementProgress } from './achievements';
const account = { version: 1 as const, manuallyMarked: [] as string[] };
it('never claims a Steam unlock from save conditions', () => {
  const a = knowledge.steam.achievements.find((a) => a.name === 'Greenhorn')!;
  expect(achievementProgress(a, syntheticSave(), account).status).toBe('Save Requirements Met');
  expect(
    achievementProgress(a, syntheticSave(), { ...account, manuallyMarked: [a.id] }).status,
  ).toBe('Manually Marked');
});
it('unknown actions and unavailable saves stay unknown', () => {
  const a = knowledge.steam.achievements.find((a) => a.name === "Fector's Challenge")!;
  expect(achievementProgress(a, syntheticSave(), account).status).toBe('Unknown');
  expect(achievementProgress(knowledge.steam.achievements[0], null, account).status).toBe(
    'Unknown',
  );
});
it('cooking progress ignores meals merely owned', () => {
  const a = knowledge.steam.achievements.find((a) => a.name === 'Cook')!;
  expect(achievementProgress(a, syntheticSave(), account).current).toBe(1);
});
it('applies 1.6 catalogs only to supported versions', () => {
  const s = syntheticSave();
  s.gameVersion = '1.7';
  expect(achievementProgress(knowledge.steam.achievements[0], s, account).status).toBe('Unknown');
});
