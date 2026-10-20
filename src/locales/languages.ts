export const languages = {
  en: { name: 'English', region: 'en-US' },
  tr: { name: 'Türkçe', region: 'tr-TR' },
  de: { name: 'Deutsch', region: 'de-DE' },
  es: { name: 'Español', region: 'es-ES' },
  fr: { name: 'Français', region: 'fr-FR' },
  hu: { name: 'Magyar', region: 'hu-HU' },
  it: { name: 'Italiano', region: 'it-IT' },
  ja: { name: '日本語', region: 'ja-JP' },
  ko: { name: '한국어', region: 'ko-KR' },
  pt: { name: 'Português (Brasil)', region: 'pt-BR' },
  ru: { name: 'Русский', region: 'ru-RU' },
  zh: { name: '简体中文', region: 'zh-CN' },
} as const;
export type Locale = keyof typeof languages;
export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && Object.hasOwn(languages, value);
