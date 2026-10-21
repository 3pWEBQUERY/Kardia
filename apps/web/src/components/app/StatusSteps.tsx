import { cx } from '@kardia/ui';

const FLOW = ['NEW', 'SCREENED', 'INTERVIEW', 'OFFER', 'HIRED'] as const;

/**
 * Verlauf einer Bewerbung als fünf Punkte (Neu → Angestellt). Abgesagt/zurückgezogen:
 * alle Punkte neutral. Rein grafisch; der Status steht als Text daneben.
 */
export function StatusSteps({ status, className }: { status: string; className?: string }) {
  const at = FLOW.indexOf(status as (typeof FLOW)[number]);
  const closed = at < 0;
  return (
    <span aria-hidden className={cx('inline-flex items-center gap-1', className)}>
      {FLOW.map((s, i) => (
        <span key={s} className="inline-flex items-center gap-1">
          {i > 0 ? <span className={cx('h-px w-3', !closed && i <= at ? 'bg-accent-600' : 'bg-line-300')} /> : null}
          <span
            className={cx(
              'size-2 rounded-full',
              closed ? 'bg-line-300' : i < at ? 'bg-accent-600' : i === at ? 'bg-pulse-500 ring-2 ring-accent-50' : 'bg-line-300',
            )}
          />
        </span>
      ))}
    </span>
  );
}
