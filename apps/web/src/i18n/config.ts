/** UI viersprachig ab R1 vorbereitet (PRD 4): de-CH, fr-CH, it-CH, en. */
export const LOCALES = ['de-CH', 'fr-CH', 'it-CH', 'en'] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = 'de-CH';
export const LOCALE_COOKIE = 'kardia_locale';

export const NAMESPACES = ['common', 'enums', 'fields', 'public', 'candidate', 'employer', 'admin', 'auth', 'errors'] as const;

export function isLocale(value: string | undefined | null): value is AppLocale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/** Datenbank-Enum `Locale` ↔ BCP-47. */
export const DB_LOCALE: Record<AppLocale, 'DE_CH' | 'FR_CH' | 'IT_CH' | 'EN'> = {
  'de-CH': 'DE_CH',
  'fr-CH': 'FR_CH',
  'it-CH': 'IT_CH',
  en: 'EN',
};
