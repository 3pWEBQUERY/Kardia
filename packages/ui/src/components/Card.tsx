import type { HTMLAttributes, ReactNode } from 'react';

import { cx } from './cx.ts';

/** Karte: Fläche surface-0 + 1 px Rand line-300, Radius 10 px. Tiefe nur über Linien. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-card border border-line-300 bg-surface-0', className)} {...props} />;
}

export function CardHeader({ title, meta, actions, as: Heading = 'h3' }: { title: ReactNode; meta?: ReactNode; actions?: ReactNode; as?: 'h2' | 'h3' }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line-200 px-5 py-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Heading className="text-h3 text-ink-900">{title}</Heading>
        {meta ? <p className="text-micro text-ink-500">{meta}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('px-5 py-4', className)} {...props} />;
}

/** Kennzahl-Kachel für Cockpit und Admin (KPIs). */
export function Stat({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-line-300 bg-surface-0 px-5 py-4">
      <span className="text-caption text-ink-700">{label}</span>
      <span className="font-mono text-h2 text-ink-900 tabular">{value}</span>
      {hint ? <span className="text-micro text-ink-500">{hint}</span> : null}
    </div>
  );
}
