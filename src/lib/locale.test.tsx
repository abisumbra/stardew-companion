import { afterEach, it, expect } from 'vitest';
import type { ReactElement } from 'react';
import {
  localize,
  translate,
  setLocale,
  registerGameTranslations,
  formatTimestamp,
} from './locale';
afterEach(() => setLocale('en'));
it('normalizes display lookup without translating identifiers or personal notes', () => {
  setLocale('tr');
  expect(translate('SAVE REQUIREMENTS MET')).toBe('Kayıt koşulları tamamlandı');
  expect(translate('Baby Brown Cow')).toBe('Yavru Kahverengi İnek');
  expect(translate('Cat · appearance 2')).toBe('Kedi · 2. görünüm');
  expect(translate('Leo: 4 hearts or more')).toBe('Leo: 4 kalp veya üzeri');
  expect(translate('Year 2 or later')).toBe('2. yıl veya sonrası');
  expect(translate('Seen event: Mod:Event_1')).toBe('Görülen etkinlik: Mod:Event_1');
  expect(translate('Seen event: Mod:Event_1 · Saved condition not met')).toBe(
    'Görülen etkinlik: Mod:Event_1 · Kayıtlı koşul karşılanmamış',
  );
  expect(
    translate(
      'Perfection’s friendship target is 10 hearts for Leo. The social meter can have a different maximum.',
    ),
  ).toBe(
    'Mükemmellik için Leo ile 10 kalbe ulaşmalısın. Arkadaşlık göstergesinin üst sınırı farklı olabilir.',
  );
  expect(
    translate('Mango Rice · 7 hearts · letter delivered after the requirement is reached.'),
  ).not.toContain('hearts');
  expect(
    translate('Original map and coordinates read from your installed game. fall reference.'),
  ).toBe('Özgün harita ve koordinatlar kurulu oyunundan okunur. Sonbahar haritası.');
  expect(translate('Saved date: Fall 8, Year 2. Future weather is unknown.')).toBe(
    'Kayıtlı tarih: Sonbahar 8, 2. yıl. Gelecekteki hava durumu bilinmiyor.',
  );
  expect(
    translate(
      '49 official entries · verified 2026-10-15. Account records stay separate from farm evidence.',
    ),
  ).not.toContain('official entries');
  expect(
    translate(
      'Last synced 18.10.2026 14:00:00. Unsaved actions in the running game are not visible.',
    ),
  ).toBe('Son güncelleme: 18.10.2026 14:00:00. Açık oyundaki kaydedilmemiş eylemler görünmez.');
  const stamp = Date.UTC(2026, 9, 18, 12) / 1000;
  expect(formatTimestamp(stamp)).toBe(new Date(stamp * 1000).toLocaleString('tr-TR'));
  registerGameTranslations({ 'A^B': 'Bir^İki' });
  expect(translate('A\nB')).toBe('Bir\nİki');
});
it('translates generated guidance and split gift counters while preserving identifiers', () => {
  setLocale('tr');
  expect(translate('One batch produces 3. Save overnight and rescan to confirm the action.')).toBe(
    'Bir üretimde 3 adet elde edilir. İşlemi doğrulamak için gece uyuyarak kaydet ve yeniden tara.',
  );
  expect(translate('0 in this farmer’s bag · Universal / default')).toContain(
    'Bu çiftçinin çantasında 0',
  );
  expect(translate('Letter / progression: CF_Fish')).toContain('CF_Fish');
});
it('preserves canonical option values and event handlers while translating labels', () => {
  setLocale('tr');
  const click = () => {};
  const tree = localize(
    <select onChange={click}>
      <option>Fishing</option>
      <option value="spring">Spring</option>
    </select>,
  );
  expect(tree.props.onChange).toBe(click);
  const [a, b] = tree.props.children as ReactElement<{ value: string; children: string }>[];
  expect(a.props.value).toBe('Fishing');
  expect(a.props.children).toContain('Balıklar');
  expect(b.props.value).toBe('spring');
  expect(translate('Welcome back, Ada.')).toBe('Tekrar hoş geldin, Ada.');
});
it('uses local game translations and keeps user-entered text and values intact', () => {
  registerGameTranslations({ Parsnip: 'Yaban Havucu' });
  setLocale('tr');
  expect(translate('Parsnip')).toBe('Yaban Havucu');
  const tree = localize(<input value="Fishing" placeholder="Search gifts…" />);
  expect(tree.props.value).toBe('Fishing');
  expect(tree.props.placeholder).toBe('Hediyelerde ara…');
  const user = localize(<span data-l10n="off">Fishing</span>);
  expect(user.props.children).toBe('Fishing');
});
