import { describe, expect, it } from 'vitest';
import { syntheticSave } from './test-fixture';
import { emptyPlanner, type ScanResult } from './models';
import { retainLatestSnapshots } from './scan';
import { compareTaskPriority } from './task-order';
import { installedMaterials, purchaseRecipes, recipeRouteId } from './materials';
import { BackupSchema } from './backup';
import type { ArtworkData } from '../components/Artwork';

describe('follow-up audit', () => {
  it('retains the latest successful snapshot when only an older duplicate can be read', () => {
    const latest = { ...syntheticSave(), savedAt: 200, path: 'current' };
    const previous: ScanResult = {
      saves: [latest],
      issues: [],
      directories: [],
      customDirectories: [],
    };
    const next = {
      ...previous,
      saves: [{ ...latest, path: 'copy', savedAt: 100 }],
      issues: [{ path: 'current', message: 'partial write' }],
    };
    const merged = retainLatestSnapshots(previous, next);
    expect(merged.saves).toHaveLength(1);
    expect(merged.saves[0].path).toBe('current');
    expect(
      retainLatestSnapshots(previous, {
        ...next,
        saves: [{ ...latest, path: 'copy' }],
      }).saves[0].path,
    ).toBe('current');
    expect(merged.saves[0].warnings).toContain(
      'Latest read failed; showing the last successfully parsed disk save.',
    );
    expect(retainLatestSnapshots(previous, { ...next, issues: [] }).saves[0].path).toBe('copy');
    expect(
      retainLatestSnapshots(previous, { ...next, saves: [{ ...latest, savedAt: 300 }] }).saves[0]
        .savedAt,
    ).toBe(300);
  });
  it('uses all owners when sorting shared prerequisites', () => {
    const state = {
      ...emptyPlanner(),
      pinned: ['second'],
      priorities: { first: 'low' as const, second: 'high' as const },
    };
    expect(
      compareTaskPriority({ goalIds: ['first', 'second'] }, { goalIds: ['other'] }, state),
    ).toBeLessThan(0);
    state.pinned = [];
    expect(
      compareTaskPriority({ goalIds: ['first', 'second'] }, { goalIds: ['other'] }, state),
    ).toBeLessThan(0);
  });
  it('keeps conditional shop offers separate and chooses the accessible one', () => {
    const art: ArtworkData = {
      root: null,
      sheets: {},
      sprites: {},
      items: [],
      characters: [],
      monsters: [],
      recipes: {},
      warnings: [],
      gameData: {
        shops: {
          Shop: {
            Items: [
              { ItemId: '(O)388', Price: 10, Condition: 'SEASON spring' },
              { ItemId: '(O)388', Price: 10, Condition: 'SEASON fall' },
            ],
          },
        },
      },
    };
    const offers = purchaseRecipes(art);
    expect(recipeRouteId(offers[0])).not.toBe(recipeRouteId(offers[1]));
    const result = installedMaterials({ '388': 2 }, { 'currency:gold': 20 }, art, true, {
      accessible: (r) => r.accessCondition === 'SEASON fall',
    });
    expect(result.alternatives.get('388')).toHaveLength(2);
    expect(result.recipes.get('388')?.accessCondition).toBe('SEASON fall');
    expect(result.leaves['currency:gold'].missing).toBe(0);
  });
  it('validates every backup section before restoring any state', () => {
    const backup = {
      format: 'stardew-companion-backup',
      version: 1,
      states: {
        'farm:one': emptyPlanner(),
        'steam-account': { version: 1, manuallyMarked: ['test'] },
      },
    };
    expect(BackupSchema.parse(backup).states['farm:one']).toEqual(emptyPlanner());
    expect(
      BackupSchema.safeParse({
        ...backup,
        states: { ...backup.states, 'farm:bad': { version: 1 } },
      }).success,
    ).toBe(false);
    expect(
      BackupSchema.safeParse({ ...backup, states: { artwork: { root: 'arbitrary' } } }).success,
    ).toBe(false);
  });
});
