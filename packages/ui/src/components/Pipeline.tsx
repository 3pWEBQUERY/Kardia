import { cx } from './cx.ts';

import type { ReactNode } from 'react';

export type StageTone = 'pulse' | 'accent' | 'ok' | 'critical' | 'neutral';

const MARKER: Record<StageTone, string> = {
  pulse: 'bg-pulse-500',
  accent: 'bg-accent-600',
  ok: 'bg-ok-600',
  critical: 'bg-critical-600',
  neutral: 'bg-ink-500',
};

/** Pipeline-Spalte: Kopf mit Stufenmarker und Anzahl, Karten mit Pass-Status, Tastatursteuerung. */
export function PipelineColumn({
  title,
  count,
  children,
  id,
  tone = 'accent',
}: {
  title: ReactNode;
  count: number;
  children: ReactNode;
  id: string;
  tone?: StageTone;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="flex w-72 shrink-0 flex-col rounded-card border border-line-200 bg-surface-50">
      <header className="flex items-center justify-between gap-2 border-b border-line-200 px-3.5 py-3">
        <h2 id={`${id}-title`} className="flex items-center gap-2 text-body-s font-semibold text-ink-900">
          <span aria-hidden className={cx('size-2.5 rounded-full', MARKER[tone])} />
          {title}
        </h2>
        <span className="inline-flex min-w-7 items-center justify-center rounded-chip bg-surface-0 px-2 py-0.5 text-caption font-semibold text-ink-900 tabular">{count}</span>
      </header>
      <ul className="flex min-h-24 flex-col gap-2 p-2">{children}</ul>
    </section>
  );
}

function initials(text: ReactNode): string | null {
  if (typeof text !== 'string') return null;
  const parts = text.trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '');
  return letters.toUpperCase() || null;
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
  const ini = initials(title);
  return (
    <li>
      <a
        href={href}
        data-card-id={dataId}
        onFocus={onFocus}
        aria-current={selected ? 'true' : undefined}
        className={cx(
          'flex gap-3 rounded-control border bg-surface-0 px-3 py-2.5 transition-colors hover:border-accent-600',
          selected ? 'border-accent-600 bg-accent-50' : 'border-line-200',
        )}
      >
        {ini ? (
          <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-950 text-micro font-semibold text-brand-100">
            {ini}
          </span>
        ) : null}
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="truncate text-body-s font-semibold text-ink-900">{title}</span>
          {meta ? <span className="text-micro text-ink-500">{meta}</span> : null}
          {status ? <span className="flex flex-wrap gap-1">{status}</span> : null}
        </span>
      </a>
    </li>
  );
}
