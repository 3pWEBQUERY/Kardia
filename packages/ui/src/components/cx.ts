/** Klassen zusammenführen; falsy-Werte fallen weg. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
