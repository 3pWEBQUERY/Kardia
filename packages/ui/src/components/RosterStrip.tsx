import { cx } from './cx.ts';

export type RosterCode = 'F' | 'S' | 'N' | 'T' | 'X';

const CELL: Record<RosterCode, string> = {
  F: 'bg-accent-50 text-accent-700',
  S: 'bg-surface-100 text-ink-900',
  N: 'bg-ink-900 text-surface-0',
  T: 'bg-accent-600 text-on-accent',
  X: 'bg-surface-0 text-ink-500',
};

export const DEFAULT_ROSTER_LABELS: Record<RosterCode, string> = {
  F: 'Früh',
  S: 'Spät',
  N: 'Nacht',
  T: 'Tag 12 h',
  X: 'frei',
};

const WEEKDAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/**
 * Dienstrhythmus-Streifen (PRD 7.1): 28 Zellen, Dienstcode als Buchstabe,
 * Wochenenden durch eine feine vertikale Linie getrennt, Legende darunter.
 * Planbarkeit in 2 Sekunden sichtbar – Farbe ergänzt nur, der Buchstabe trägt.
 */
export function RosterStrip({
  pattern,
  labels = DEFAULT_ROSTER_LABELS,
  weekdays = WEEKDAYS_DE,
  caption,
  showLegend = true,
  compact = false,
}: {
  pattern: readonly RosterCode[];
  labels?: Record<RosterCode, string>;
  weekdays?: string[];
  caption: string;
  showLegend?: boolean;
  compact?: boolean;
}) {
  const used = (['F', 'S', 'N', 'T', 'X'] as const).filter((c) => pattern.includes(c));
  return (
    <figure className="flex flex-col gap-2">
      <ol
        aria-label={caption}
        className="grid grid-cols-[repeat(28,minmax(0,1fr))] overflow-hidden rounded-control border border-line-300"
      >
        {pattern.map((code, i) => {
            const weekEnd = i % 7 === 6 && i < pattern.length - 1;
            const weekendStart = i % 7 === 5;
            return (
              <li
                key={i}
                aria-label={`Woche ${Math.floor(i / 7) + 1}, ${weekdays[i % 7] ?? ''}: ${labels[code]}`}
                className={cx(
                  'flex items-center justify-center font-mono text-micro tabular',
                  compact ? 'h-6' : 'h-8',
                  CELL[code],
                  weekendStart && 'border-l border-line-200',
                  weekEnd && 'border-r border-line-300',
                )}
              >
                <span aria-hidden>{code === 'X' ? '·' : code}</span>
              </li>
            );
          })}
      </ol>
      {showLegend ? (
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-micro text-ink-500">
          {used.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5">
              <span className={cx('inline-flex size-4 items-center justify-center rounded-[3px] font-mono', CELL[c])}>
                {c === 'X' ? '·' : c}
              </span>
              {labels[c]}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}
