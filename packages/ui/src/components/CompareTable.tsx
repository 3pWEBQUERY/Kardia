'use client';

import { useMemo, useState, type ReactNode } from 'react';

import { cx } from './cx.ts';
import { Switch } from './Field.tsx';

export interface CompareRow {
  key: string;
  label: ReactNode;
  /** Anzeige je Spalte. */
  cells: ReactNode[];
  /** Rohwerte zum Ermitteln der besten Ausprägung und identischer Zeilen. */
  raw: (number | string | boolean | null)[];
  better?: 'higher' | 'lower' | 'true';
}

function bestIndexes(row: CompareRow): Set<number> {
  if (!row.better) return new Set();
  const values = row.raw.map((v) => (typeof v === 'boolean' ? Number(v) : typeof v === 'number' ? v : null));
  const present = values.filter((v): v is number => v != null);
  if (present.length < 2) return new Set();
  const target = row.better === 'lower' ? Math.min(...present) : Math.max(...present);
  if (present.every((v) => v === target)) return new Set();
  return new Set(values.flatMap((v, i) => (v === target ? [i] : [])));
}

/**
 * Stellen-Vergleich (PRD 7.1): bis zu 4 Stellen nebeneinander, Zeilen = Felder des
 * Stationsprofils. Beste Ausprägung je Zeile fett; "nur Unterschiede" blendet
 * identische Zeilen aus. Erste Spalte sticky.
 */
export function CompareTable({
  columns,
  rows,
  caption,
  onlyDifferencesLabel = 'Nur Unterschiede',
  bestLabel = 'beste Ausprägung',
}: {
  columns: ReactNode[];
  rows: CompareRow[];
  caption: string;
  onlyDifferencesLabel?: string;
  bestLabel?: string;
}) {
  const [onlyDiff, setOnlyDiff] = useState(false);
  const visible = useMemo(
    () => (onlyDiff ? rows.filter((r) => new Set(r.raw.map((v) => JSON.stringify(v))).size > 1) : rows),
    [onlyDiff, rows],
  );
  return (
    <div className="flex flex-col gap-3">
      <Switch label={onlyDifferencesLabel} checked={onlyDiff} onCheckedChange={setOnlyDiff} />
      <div className="overflow-x-auto border border-line-300 bg-surface-0">
        <table className="w-full min-w-[640px] border-collapse text-body-s">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-surface-100">
              <th scope="col" className="sticky left-0 z-10 w-48 bg-surface-100 px-4 py-3 text-left text-caption text-ink-700" />
              {columns.map((c, i) => (
                <th key={i} scope="col" className="px-4 py-3 text-left align-top text-caption text-ink-900">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const best = bestIndexes(row);
              return (
                <tr key={row.key} className="h-row border-t border-line-200">
                  <th scope="row" className="sticky left-0 z-10 bg-surface-0 px-4 py-2 text-left font-normal text-ink-700">
                    {row.label}
                  </th>
                  {row.cells.map((cell, i) => (
                    <td key={i} className={cx('px-4 py-2 tabular', best.has(i) ? 'font-semibold text-ink-900' : 'text-ink-900')}>
                      {cell}
                      {best.has(i) ? <span className="sr-only"> ({bestLabel})</span> : null}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
