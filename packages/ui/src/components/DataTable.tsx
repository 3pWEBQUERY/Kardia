'use client';

import { ArrowDown, ArrowUp, Columns3 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { Button } from './Button.tsx';
import { cx } from './cx.ts';
import { Checkbox } from './Field.tsx';
import { Icon } from './Icon.tsx';
import { Popover } from './Overlay.tsx';

export interface DataColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => number | string | null;
  align?: 'left' | 'right';
  /** Standardmässig sichtbar? */
  defaultVisible?: boolean;
}

/** Datentabelle: sortierbar, Spaltenauswahl, Zeilenhöhe 44 px, Zebra aus, Radius 0. */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  columnsLabel = 'Spalten',
  empty,
}: {
  rows: readonly T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  caption: string;
  columnsLabel?: string;
  empty?: ReactNode;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [visible, setVisible] = useState(() => new Set(columns.filter((c) => c.defaultVisible !== false).map((c) => c.key)));

  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key);
    if (!sort || !col?.sortValue) return rows;
    const get = col.sortValue;
    const dir = sort.dir;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va == null) return 1;
      if (vb == null) return -1;
      const r = va < vb ? -1 : va > vb ? 1 : 0;
      return dir === 'asc' ? r : -r;
    });
  }, [rows, columns, sort]);

  const shown = columns.filter((c) => visible.has(c.key));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Popover
          align="end"
          trigger={
            <Button size="s" variant="ghost">
              <Icon icon={Columns3} size={16} />
              {columnsLabel}
            </Button>
          }
        >
          <div className="flex flex-col gap-1">
            {columns.map((c) => (
              <Checkbox
                key={c.key}
                label={c.header}
                checked={visible.has(c.key)}
                onCheckedChange={(on) =>
                  setVisible((prev) => {
                    const next = new Set(prev);
                    if (on) next.add(c.key);
                    else if (next.size > 1) next.delete(c.key);
                    return next;
                  })
                }
              />
            ))}
          </div>
        </Popover>
      </div>
      <div className="overflow-x-auto border border-line-300 bg-surface-0">
        <table className="w-full border-collapse text-body-s">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-surface-100">
              {shown.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cx('h-row px-3 text-caption text-ink-700', c.align === 'right' ? 'text-right' : 'text-left')}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-ink-900"
                        onClick={() =>
                          setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'asc' }))
                        }
                      >
                        {c.header}
                        {active ? <Icon icon={sort.dir === 'asc' ? ArrowUp : ArrowDown} size={14} /> : null}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={shown.length} className="px-3 py-4">
                  {empty}
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={rowKey(row)} className="h-row border-t border-line-200 hover:bg-surface-50">
                  {shown.map((c) => (
                    <td key={c.key} className={cx('px-3 tabular text-ink-900', c.align === 'right' ? 'text-right' : 'text-left')}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
