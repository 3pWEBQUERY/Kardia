import { CircleAlert, Info, TriangleAlert } from 'lucide-react';


import { cx } from './cx.ts';
import { Icon } from './Icon.tsx';

import type { ReactNode } from 'react';

/** Leerzustand: ein Satz + eine Handlung, keine Illustration (PRD 7.4, 8.5). */
export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line-300 bg-surface-0 px-5 py-6">
      <p className="text-body-s text-ink-700">{children}</p>
      {action}
    </div>
  );
}

/** Jeder Fehler nennt Ursache und Lösung in einem Satz; keine Codes ohne Erklärung. */
export function Callout({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: 'info' | 'warn' | 'critical';
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  const icon = tone === 'critical' ? CircleAlert : tone === 'warn' ? TriangleAlert : Info;
  return (
    <div
      role={tone === 'critical' ? 'alert' : 'status'}
      className={cx(
        'flex gap-3 rounded-card border bg-surface-0 px-4 py-3',
        tone === 'critical' ? 'border-critical-600' : tone === 'warn' ? 'border-warn-600' : 'border-line-300',
      )}
    >
      <span className={cx('mt-0.5', tone === 'critical' ? 'text-critical-600' : tone === 'warn' ? 'text-warn-600' : 'text-accent-600')}>
        <Icon icon={icon} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? <p className="text-body-s font-semibold text-ink-900">{title}</p> : null}
        <div className="text-body-s text-ink-700">{children}</div>
        {action ? <div className="mt-1">{action}</div> : null}
      </div>
    </div>
  );
}

/** Ladezustand als Skeleton in Endform, nie Spinner (PRD 7.4). */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cx('block animate-pulse rounded-control bg-surface-100 motion-reduce:animate-none', className)} />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <span aria-hidden className="flex flex-col gap-2">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cx('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </span>
  );
}
