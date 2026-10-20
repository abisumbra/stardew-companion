import { describe, it, expect } from 'vitest';
import { guides, knowledge, sources } from './knowledge';
import { CatalogSchema, GuideSchema, SourceSchema } from './models';
describe('bundled knowledge contract', () => {
  it('validates the bundle and unique IDs', () => {
    expect(CatalogSchema.safeParse(knowledge).success).toBe(true);
    for (const g of Object.values(guides)) expect(GuideSchema.safeParse(g).success).toBe(true);
    for (const s of Object.values(sources)) expect(SourceSchema.safeParse(s).success).toBe(true);
    expect(new Set(knowledge.entries.map((e) => e.id)).size).toBe(knowledge.entries.length);
    expect(new Set(knowledge.steam.achievements.map((e) => e.id)).size).toBe(
      knowledge.steam.observedTotal,
    );
  });
  it('retains an explicit source, date and version on every entry and guide', () => {
    for (const e of [...knowledge.entries, ...Object.values(guides)]) {
      expect(e.versions.length).toBeGreaterThan(0);
      expect(e.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const id of e.sources) expect(sources[id]?.url).toMatch(/^https:\/\//);
    }
    for (const g of Object.values(guides)) {
      expect(knowledge.entries.some((e) => e.id === g.entryId)).toBe(true);
      for (const i of g.ingredients ?? [])
        for (const id of i.sources) expect(sources[id]).toBeDefined();
    }
  });
  it('matches observed official Steam count without treating hidden descriptions as known', () => {
    expect(knowledge.steam.achievements.length).toBe(knowledge.steam.observedTotal);
    const hidden = knowledge.steam.achievements.filter((a) => a.description === null);
    expect(hidden.length).toBeGreaterThan(0);
    expect(hidden.every((a) => a.verification === 'hidden-description')).toBe(true);
  });
});
