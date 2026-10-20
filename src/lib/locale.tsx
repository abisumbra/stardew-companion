import {
  Children,
  cloneElement,
  isValidElement,
  useSyncExternalStore,
  type ReactNode,
  type ReactElement,
} from 'react';
import { catalogs, loadCatalog } from '../locales/catalog';
import { translatePattern } from '../locales/patterns';
import { languages, isLocale, type Locale } from '../locales/languages';
export type { Locale } from '../locales/languages';
const initialLocale: Locale = (() => {
  try {
    const saved = localStorage.getItem('companion:language');
    return isLocale(saved)
      ? saved
      : isLocale(navigator.language.split('-')[0])
        ? (navigator.language.split('-')[0] as Locale)
        : 'en';
  } catch {
    return 'en';
  }
})();
let locale: Locale = catalogs[initialLocale] ? initialLocale : 'en';
let localeRequest = 0;
const listeners = new Set<() => void>();
if (typeof document !== 'undefined') document.documentElement.lang = locale;
const lookupKey = (s: string) =>
  s
    .normalize('NFC')
    .replace(/[’‘]/g, "'")
    .replace(/\^/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
const foldedCatalogs = new Map(
  Object.entries(catalogs).map(([code, entries]) => [
    code,
    new Map(Object.entries(entries).map(([en, text]) => [lookupKey(en), text])),
  ]),
);
const gameCatalogs = new Map<Locale, Map<string, string>>();
const notify = () => listeners.forEach((fn) => fn());
export async function setLocale(value: string) {
  if (!isLocale(value)) return false;
  const request = ++localeRequest;
  if (!catalogs[value]) {
    try {
      await loadCatalog(value);
    } catch {
      return false;
    }
    if (request !== localeRequest) return false;
    foldedCatalogs.set(
      value,
      new Map(
        Object.entries(catalogs[value] as Record<string, string>).map(([en, text]) => [
          lookupKey(en),
          text,
        ]),
      ),
    );
  }
  locale = value;
  try {
    localStorage.setItem('companion:language', value);
  } catch {
    /* The session still supports language selection. */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = value;
  notify();
  return true;
}
if (initialLocale !== locale) void setLocale(initialLocale);
export function useLocale() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => locale,
  );
}
export function formatTimestamp(stamp: number): string {
  return stamp
    ? new Date(stamp * 1000).toLocaleString(languages[locale].region)
    : translate('Unavailable');
}
export function formatNumber(value: number): string {
  return value.toLocaleString(languages[locale].region);
}
export function registerGameTranslations(
  value: Record<string, string> = {},
  language: Locale = 'tr',
) {
  gameCatalogs.set(
    language,
    new Map(
      Object.entries(value).map(([en, tr]) => [
        lookupKey(en),
        tr.normalize('NFC').replace(/\^/g, '\n'),
      ]),
    ),
  );
  notify();
}
export function translate(value: string): string {
  if (!value.trim()) return value;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (locale === 'en')
    return catalogs.en[normalized] ? value.replace(value.trim(), catalogs.en[normalized]) : value;
  const exact =
    gameCatalogs.get(locale)?.get(lookupKey(normalized)) ??
    catalogs[locale]?.[normalized] ??
    foldedCatalogs.get(locale)?.get(lookupKey(normalized));
  if (exact) return value.replace(value.trim(), exact);
  // Templates keep player names, quantities and coordinates intact.
  const patterned = locale === 'tr' ? translatePattern(normalized, translate) : undefined;
  if (patterned !== undefined) return patterned;
  const sentences = normalized.split(/(?<=[.!?])\s+(?=[A-Za-z])/);
  if (sentences.length > 1) return sentences.map(translate).join(' ');
  const segments = normalized.split(' · ');
  if (segments.length > 1) return segments.map(translate).join(' · ');
  return value;
}
// Translate the React render tree; IDs, event handlers, control values and stored data stay intact.
// Components call this on their own returned tree, so hooks and component identities are preserved.
export function localize<T extends ReactNode>(node: T): T {
  if (typeof node === 'string') return translate(node) as T;
  if (Array.isArray(node)) return node.map((n) => localize(n)) as unknown as T;
  if (!isValidElement(node)) return node;
  const e = node as ReactElement<Record<string, any>>,
    p = e.props;
  if (
    p['data-l10n'] === 'off' ||
    ['style', 'script', 'code', 'pre', 'textarea'].includes(String(e.type))
  )
    return node;
  const next: Record<string, unknown> = {};
  if (e.type === 'option' && p.value === undefined)
    next.value = Children.toArray(p.children)
      .filter((v) => typeof v === 'string' || typeof v === 'number')
      .join('');
  if (typeof e.type === 'string')
    for (const attr of ['title', 'aria-label', 'placeholder', 'alt'])
      if (typeof p[attr] === 'string') next[attr] = translate(p[attr]);
  if (p.children !== undefined) {
    const translated: ReactNode[] = [];
    let text = '';
    const flush = () => {
      if (text) {
        translated.push(translate(text));
        text = '';
      }
    };
    // Keep array boundaries and empty conditional slots. Flattening them on a
    // language change remounts unkeyed views and discards their local selection.
    for (const child of Array.isArray(p.children) ? p.children : [p.children]) {
      if (typeof child === 'string' || typeof child === 'number') text += String(child);
      else {
        flush();
        translated.push(localize(child));
      }
    }
    flush();
    next.children = translated;
  }
  // Variadic children retain React's static-child validation and existing element keys.
  // Passing a newly-created children array as a prop would report false missing-key warnings.
  const { children, ...attributes } = next;
  return (
    children === undefined
      ? cloneElement(e, attributes)
      : cloneElement(e, attributes, ...(children as ReactNode[]))
  ) as T;
}
