/**
 * Schweizer Formatierung (PRD 7.4): Tausender mit Apostroph (95'000), CHF vor dem
 * Betrag, Datum TT.MM.JJJJ, 24-Stunden-Zeit. Bewusst ohne Intl-Gruppierung, weil
 * de-CH je nach ICU-Version U+2019 statt des geraden Apostrophs liefert.
 */

const TIME_ZONE = 'Europe/Zurich';

export function formatNumber(value: number, fractionDigits = 0): string {
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(fractionDigits);
  const [int = '0', frac] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${negative ? '-' : ''}${grouped}${frac ? `.${frac}` : ''}`;
}

export function formatChf(value: number): string {
  return `CHF ${formatNumber(Math.round(value))}`;
}

/** "CHF 88'000–102'000" */
export function formatChfRange(min: number, max: number): string {
  return min === max ? formatChf(min) : `CHF ${formatNumber(min)}–${formatNumber(max)}`;
}

/** Kompakte Form für Bedingungs-Chips: 95000 → "95k". */
export function formatChfShort(value: number): string {
  return value >= 1000 ? `${formatNumber(Math.round(value / 1000))}k` : formatNumber(value);
}

export function formatPct(value: number): string {
  return `${formatNumber(value)} %`;
}

function parts(date: Date, options: Intl.DateTimeFormatOptions): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('de-CH', {
    timeZone: TIME_ZONE,
    ...options,
  }).formatToParts(date)) {
    result[part.type] = part.value;
  }
  return result;
}

/** TT.MM.JJJJ in Schweizer Zeit. */
export function formatDate(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const p = parts(date, { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${p.day}.${p.month}.${p.year}`;
}

/** HH:MM, 24 Stunden. */
export function formatTime(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const p = parts(date, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${p.hour}:${p.minute}`;
}

export function formatDateTime(input: Date | string): string {
  return `${formatDate(input)} ${formatTime(input)}`;
}

/** Reines Datum (@db.Date) ohne Zeitzonen-Verschiebung formatieren. */
export function formatPlainDate(input: Date | string): string {
  const iso = typeof input === 'string' ? input : input.toISOString();
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
