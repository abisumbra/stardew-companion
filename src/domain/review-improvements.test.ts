import { describe, it, expect } from 'vitest';
import {
  blankDesign,
  FarmDesignsSchema,
  updateLibrary,
  portableDesign,
  moveGroup,
  reconcileTransfer,
} from './farm-design';
import { syntheticSave } from './test-fixture';
import { emptyPlanner } from './models';
import { agenda, completeManual, gameDay, dateFromDay } from './agenda';
import { storageSummary, type Container } from './storage-search';
import { BackupSchema } from './backup';
import type { ArtworkData } from '../components/Artwork';
const art: ArtworkData = {
  root: null,
  sheets: {},
  sprites: {},
  items: [],
  characters: [],
  monsters: [],
  recipes: {},
  warnings: [],
};
const design = () => ({
  ...blankDesign(),
  items: [
    {
      id: 'a',
      name: 'Chest',
      itemId: '(BC)130',
      kind: 'object' as const,
      width: 1,
      height: 1,
      x: 1,
      y: 1,
      sourceTile: [0, 0] as [number, number],
    },
  ],
});
describe('design safety', () => {
  it('recovers deleted designs and keeps earlier persisted versions', () => {
    const first = design(),
      changed = { ...first, name: 'Changed' };
    const library = updateLibrary(FarmDesignsSchema.parse({ version: 1, designs: [first] }), [
      changed,
    ]);
    expect(library.history[0].name).toBe(first.name);
    const deleted = updateLibrary(library, []);
    expect(deleted.trash[0]).toEqual(changed);
    expect(FarmDesignsSchema.parse(JSON.parse(JSON.stringify(deleted))).history).toHaveLength(1);
  });
  it('portable copies cannot move objects in another world', () => {
    const original = design(),
      copy = portableDesign(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.items[0].id).not.toBe(original.items[0].id);
    expect(copy.items[0].sourceTile).toBeUndefined();
  });
  it('reconciles only applied items from the sent snapshot, retaining later edits', () => {
    const sent = design(),
      current = { ...sent, items: [{ ...sent.items[0], x: 8, y: 9 }] };
    const result = reconcileTransfer(current, sent, ['a']);
    expect(result.items[0]).toMatchObject({ x: 8, y: 9, sourceTile: [1, 1] });
    expect(reconcileTransfer(current, sent, []).items[0].sourceTile).toEqual([0, 0]);
    expect(reconcileTransfer({ ...current, id: 'other' }, sent, ['a']).items[0].sourceTile).toEqual(
      [0, 0],
    );
  });
  it('group moves reject collisions without mutating the original and copies shed source identities', () => {
    const original = design();
    original.items.push({ ...original.items[0], id: 'b', x: 2 });
    expect(() => moveGroup(original, ['a'], 1, 0, false, null)).toThrow(/overlaps/);
    expect(original.items[0].x).toBe(1);
    expect(moveGroup(original, ['a', 'b'], 0, 2, false, null).items.map((i) => i.y)).toEqual([
      3, 3,
    ]);
    expect(moveGroup(original, ['a'], 0, 4, true, null).items[2].sourceTile).toBeUndefined();
    expect(() => moveGroup(original, ['a'], -2, 0, false, null)).toThrow(/outside/);
  });
});
describe('game agenda', () => {
  it('rolls over year boundaries and advances recurring overdue notes once', () => {
    expect(dateFromDay(gameDay(1, 'winter', 28) + 1)).toEqual({
      year: 2,
      season: 'spring',
      day: 1,
    });
    const task = {
      id: 'x',
      title: 'Weekly',
      priority: 'normal' as const,
      done: false,
      dueDay: 4,
      repeatDays: 7,
    };
    expect(completeManual(task, 20)).toMatchObject({ done: false, dueDay: 25 });
  });
  it('separates farmer notes and marks overdue without inventing weather', () => {
    const save = syntheticSave(),
      state = emptyPlanner(),
      now = gameDay(save.year, save.season, save.day);
    state.manual = [
      {
        id: 'mine',
        title: 'Private',
        priority: 'normal',
        done: false,
        dueDay: now - 1,
        farmerId: save.players[0].id,
      },
      {
        id: 'other',
        title: 'Other',
        priority: 'normal',
        done: false,
        dueDay: now,
        farmerId: 'other',
      },
    ];
    const rows = agenda(save, state, art);
    expect(rows.some((r) => r.id === 'mine' && r.day < now)).toBe(true);
    expect(rows.some((r) => r.id === 'other')).toBe(false);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });
});
it('counts only matching quality and deduplicates Junimo contents while preserving locations', () => {
  const c: Container = {
    id: 'one',
    name: 'Chest',
    location: 'Farm',
    tile: [1, 1],
    kind: 'junimo',
    sharedGroup: 'shared',
    contentsKnown: true,
    items: [
      { id: '(O)388', quantity: 10, quality: 0 },
      { id: '(O)390', quantity: 20, quality: 2 },
    ],
  };
  const rows = storageSummary([c, { ...c, id: 'two' }], '388', 0, art);
  expect(rows).toHaveLength(1);
  expect(rows[0].quantity).toBe(10);
  expect(rows[0].containers).toEqual(['one', 'two']);
  expect(storageSummary([c], '388', 2, art)).toHaveLength(0);
});
it('accepts old backups and validates new appearance preferences', () => {
  expect(
    BackupSchema.parse({
      format: 'stardew-companion-backup',
      version: 1,
      states: { preferences: { selected: null, reduceMotion: false } },
    }).version,
  ).toBe(1);
  expect(() =>
    BackupSchema.parse({
      format: 'stardew-companion-backup',
      version: 1,
      states: { appearance: { version: 1, language: 'bad', textScale: 1 } },
    }),
  ).toThrow();
});
