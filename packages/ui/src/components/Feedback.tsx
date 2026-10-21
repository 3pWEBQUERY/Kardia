import { CircleAlert, Info, TriangleAlert } from 'lucide-react';


import { cx } from './cx.ts';
import { Icon } from './Icon.tsx';

import type { ReactNode } from 'react';

/**
 * Leerzustand: ein Satz + eine Handlung (PRD 7.4, 8.5). Statt einer Illustration nur die
 * Pulsmarke der Bildsprache in einer getönten Kachel (dekorativ, flach).
 */
export function EmptyState({ children, action, icon }: { children: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-card border border-dashed border-line-300 bg-surface-0 px-5 py-6 sm:flex-row sm:items-center">
      <span aria-hidden className="inline-flex size-12 shrink-0 items-center justify-center rounded-card bg-accent-50 text-accent-600">
        {icon ?? (
          <svg viewBox="0 0 32 20" className="h-5 w-8" focusable="false">
            <path d="M1 12 H8 L10 9 L12 12 L15.5 2 L19 18 L21 12 H31" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
        <p className="text-body-s text-ink-700">{children}</p>
        {action}
      </div>
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
