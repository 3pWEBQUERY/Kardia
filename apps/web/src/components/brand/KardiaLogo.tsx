import { cx } from '@kardia/ui';

/** Bildmarke: Pulsschlag, dessen Spitze ein Gipfel ist – in einer Kachel (currentColor). */
export function KardiaMark({ className, tone = 'brand' }: { className?: string; tone?: 'brand' | 'inverse' }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden focusable="false" className={cx('shrink-0', className)}>
      <rect width="32" height="32" rx="8" className={tone === 'brand' ? 'fill-brand-950' : 'fill-brand-100'} />
      <path
        d="M4 19 H10 L12 15.5 L14 19 L16.5 6 L19.5 24 L21.5 19 H28"
        className={cx('fill-none', tone === 'brand' ? 'stroke-pulse-500' : 'stroke-brand-950')}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Bildmarke + Wortmarke. */
export function KardiaLogo({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <KardiaMark className="size-8" tone={inverse ? 'inverse' : 'brand'} />
      <span className={cx('text-h3 font-semibold tracking-tight', inverse ? 'text-brand-100' : 'text-ink-900')}>Kardia</span>
    </span>
  );
}
