import type { ReactNode } from 'react';

import { cx } from './cx.ts';

/** Pipeline-Spalte: Kopf mit Anzahl, Karten mit Pass-Status, Tastatursteuerung. */
export function PipelineColumn({ title, count, children, id }: { title: ReactNode; count: number; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={`${id}-title`} className="flex w-72 shrink-0 flex-col rounded-card border border-line-300 bg-surface-50">
      <header className="flex items-center justify-between border-b border-line-200 px-3 py-2.5">
        <h2 id={`${id}-title`} className="text-caption text-ink-900">
          {title}
        </h2>
        <span className="font-mono text-micro text-ink-500 tabular">{count}</span>
      </header>
      <ul className="flex flex-col gap-2 p-2">{children}</ul>
    </section>
  );
}

export function PipelineCard({
  title,
  meta,
  status,
  selected,
  href,
  onFocus,
  dataId,
}: {
  title: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
  selected?: boolean;
  href: string;
  onFocus?: () => void;
  dataId: string;
}) {
  return (
    <li>
      <a
        href={href}
        data-card-id={dataId}
        onFocus={onFocus}
        aria-current={selected ? 'true' : undefined}
        className={cx(
          'flex flex-col gap-1.5 rounded-control border bg-surface-0 px-3 py-2.5 hover:border-ink-500',
          selected ? 'border-accent-600 bg-accent-50' : 'border-line-300',
        )}
      >
        <span className="text-body-s font-medium text-ink-900">{title}</span>
        {meta ? <span className="text-micro text-ink-500">{meta}</span> : null}
        {status ? <span className="flex flex-wrap gap-1">{status}</span> : null}
      </a>
    </li>
  );
}
