/** Sprachen, in die KI-6 die Stations-Freitexte übersetzt; Deutsch ist die Quelle. */
const TRANSLATED_LOCALES = ['fr-CH', 'it-CH', 'en'] as const;

/**
 * Beschreibung der Station in der Sprache der Anfrage (KI-6). Fehlt die Übersetzung,
 * bleibt der deutsche Text. `translated` steuert den Hinweis "Automatisch übersetzt".
 */
export function localizedWardText(
  description: string | null,
  translations: unknown,
  locale: string,
): { text: string | null; translated: boolean } {
  if (!description || !(TRANSLATED_LOCALES as readonly string[]).includes(locale)) return { text: description, translated: false };
  const entry = translations && typeof translations === 'object' ? (translations as Record<string, unknown>)[locale] : undefined;
  const text = entry && typeof entry === 'object' ? (entry as { description?: unknown }).description : undefined;
  return typeof text === 'string' && text.trim() ? { text, translated: true } : { text: description, translated: false };
}
