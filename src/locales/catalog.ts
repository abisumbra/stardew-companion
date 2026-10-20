import english from './runtime-en.json';
import turkish from './tr.json';
import { languages } from './languages';
export const catalogs: Record<string, Record<string, string>> = {
  en: english,
  tr: turkish,
};
const loaders: Record<string, () => Promise<{ default: Record<string, string> }>> = {
  de: () => import('./de.json'),
  es: () => import('./es.json'),
  fr: () => import('./fr.json'),
  hu: () => import('./hu.json'),
  it: () => import('./it.json'),
  ja: () => import('./ja.json'),
  ko: () => import('./ko.json'),
  pt: () => import('./pt.json'),
  ru: () => import('./ru.json'),
  zh: () => import('./zh.json'),
};
const loading = new Map<string, Promise<void>>();
export function loadCatalog(code: string): Promise<void> {
  if (catalogs[code]) return Promise.resolve();
  if (!loaders[code]) return Promise.reject(new Error('Unsupported language'));
  let promise = loading.get(code);
  if (!promise) {
    promise = loaders[code]()
      .then((module) => {
        catalogs[code] = module.default;
      })
      .catch((error) => {
        loading.delete(code);
        throw error;
      });
    loading.set(code, promise);
  }
  return promise;
}
export const languageNames = Object.fromEntries(
  Object.entries(languages).map(([code, data]) => [code, data.name]),
);
export const catalogPair = (key: string) => ({
  en: catalogs.en[key] ?? key,
  tr: catalogs.tr[key] ?? key,
});
