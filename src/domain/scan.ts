import type { ScanResult } from './models';

export function retainLatestSnapshots(previous: ScanResult, next: ScanResult): ScanResult {
  const saves = new Map(next.saves.map((save) => [save.id, save]));
  for (const old of previous.saves) {
    const replacement = saves.get(old.id);
    if (
      next.issues.some((issue) => issue.path === old.path) &&
      (!replacement || replacement.savedAt <= old.savedAt)
    ) {
      saves.set(old.id, {
        ...old,
        warnings: [
          ...old.warnings.filter((w) => !w.startsWith('Latest read failed')),
          'Latest read failed; showing the last successfully parsed disk save.',
        ],
      });
    }
  }
  return { ...next, saves: [...saves.values()].sort((a, b) => b.savedAt - a.savedAt) };
}
