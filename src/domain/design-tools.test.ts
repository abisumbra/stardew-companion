import { describe, it, expect } from 'vitest';
import { blankDesign, furnitureBrush, placementIssue } from './farm-design';
import { paintDesign, lineTiles, sprinklerCoverage } from './design-tools';
import { BackupSchema } from './backup';
import { locationMapIdentity } from './tilemap';
import type { ArtworkData } from '../components/Artwork';
const brush = { name: 'Path', itemId: '(O)331', kind: 'object' as const, width: 1, height: 1 };
describe('continuous design editing', () => {
  it('fills gaps in a fast pointer stroke, skips duplicates and keeps one reversible snapshot', () => {
    const before = blankDesign(),
      next = paintDesign(before, [...lineTiles([1, 1], [5, 1]), [3, 1]], brush, false, null);
    expect(before.items).toHaveLength(0);
    expect(next.items.map((i) => [i.x, i.y])).toEqual([
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
    ]);
    expect(paintDesign(next, [[2, 1]], brush, false, null)).toBe(next);
    expect(
      paintDesign(next, lineTiles([2, 1], [4, 1]), null, true, null).items.map((i) => i.x),
    ).toEqual([1, 5]);
  });
  it('rejects out-of-map paint and erases an entire footprint when its edge is touched', () => {
    const map = { width: 2, height: 2, walkable: Array(4).fill(true) } as any;
    const next = paintDesign(
      blankDesign(),
      [
        [-1, 0],
        [0, 0],
        [2, 0],
      ],
      brush,
      false,
      map,
    );
    expect(next.items).toHaveLength(1);
    next.items[0].width = 2;
    expect(paintDesign(next, [[1, 0]], null, true, map).items).toHaveLength(0);
  });
  it('uses original furniture collision dimensions and supports rugs beneath furniture', () => {
    const art = {
      gameData: {
        furniture: {
          1: 'Oak Chair/chair/-1/-1/4',
          2: 'Double Bed/bed double/3 4/3 3/1',
          3: 'Rug/rug/-1/-1/1',
        },
      },
      items: [],
    } as unknown as ArtworkData;
    expect(furnitureBrush('furniture:2', art)).toMatchObject({ width: 3, height: 3 });
    const rug = { ...furnitureBrush('furniture:3', art)!, id: 'rug', x: 2, y: 2 };
    expect(
      placementIssue({ ...furnitureBrush('furniture:1', art)!, id: 'chair', x: 2, y: 2 }, [rug]),
    ).toBeNull();
    expect(furnitureBrush('furniture:999', art)).toBeNull();
  });
  it('backs up home designs independently and resolves instance maps from saved evidence', () => {
    const d = blankDesign('Family home');
    const backup = BackupSchema.parse({
      format: 'stardew-companion-backup',
      version: 1,
      states: { 'home-designs': { version: 1, designs: [d] } },
    });
    expect(backup.states['home-designs']).toBeTruthy();
    expect(
      locationMapIdentity('Shed-unique', 'Standard', { 'Shed-unique': 'Building/Big Shed' }),
    ).toBe('Building/Big Shed');
    expect(sprinklerCoverage('(O)645')).toHaveLength(24);
    expect(sprinklerCoverage('(O)621')).toHaveLength(8);
  });
});
