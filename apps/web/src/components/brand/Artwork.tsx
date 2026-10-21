import { cx } from '@kardia/ui';

import { CONTOURS, PULSE, RIDGE_FAR, RIDGE_FRONT, RIDGE_MID, SUMMIT } from './artworkPaths.ts';

/**
 * Markengrafik «Puls & Alpen»: Ein Herzschlag, dessen Spitze zum Gipfel wird, über
 * Höhenlinien wie auf einer Landeskarte. Flach – nur Flächen und Linien aus den
 * Marken-Tokens, keine Verläufe, keine Schatten, kein Blur (PRD 8.1). Rein dekorativ.
 */
export function AlpinePulse({ className, animate = true, dots = true }: { className?: string; animate?: boolean; dots?: boolean }) {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      focusable="false"
      className={cx('pointer-events-none select-none', className)}
    >
      <defs>
        <pattern id="k-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.4" className="fill-brand-800" />
        </pattern>
      </defs>
      <rect width="1600" height="900" className="fill-brand-950" />
      {dots ? <rect width="760" height="680" fill="url(#k-dots)" /> : null}
      <g className="fill-none stroke-brand-800" strokeWidth="1.2">
        {CONTOURS.map((d) => (
          <path key={d.slice(0, 24)} d={d} />
        ))}
      </g>
      <path d={RIDGE_FAR} className="fill-brand-800" />
      <path d={RIDGE_MID} className="fill-brand-900" />
      <path
        d={PULSE}
        className={cx('fill-none stroke-pulse-500', animate && 'k-pulse-draw')}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
      />
      <circle cx={SUMMIT.x} cy={SUMMIT.y} r="7" className="fill-pulse-500" />
      <circle cx={SUMMIT.x} cy={SUMMIT.y} r="15" className={cx('fill-none stroke-pulse-500', animate && 'k-ping')} strokeWidth="1.5" />
      <path d={RIDGE_FRONT} className="fill-brand-950 stroke-brand-700" strokeWidth="2" />
    </svg>
  );
}

/**
 * Nur Bergketten und Puls als Band am unteren Rand eines Heros: Der Inhalt darüber bleibt
 * frei, egal wie hoch der Hero wird. Höhe über die Klasse steuern (z. B. h-[clamp(…)]).
 */
export function AlpineBand({ className, animate = true }: { className?: string; animate?: boolean }) {
  return (
    <svg viewBox="0 380 1600 520" preserveAspectRatio="xMidYMin slice" aria-hidden focusable="false" className={cx('pointer-events-none select-none', className)}>
      <path d={RIDGE_FAR} className="fill-brand-800" />
      <path d={RIDGE_MID} className="fill-brand-900" />
      <path
        d={PULSE}
        className={cx('fill-none stroke-pulse-500', animate && 'k-pulse-draw')}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
      />
      <circle cx={SUMMIT.x} cy={SUMMIT.y} r="7" className="fill-pulse-500" />
      <circle cx={SUMMIT.x} cy={SUMMIT.y} r="15" className={cx('fill-none stroke-pulse-500', animate && 'k-ping')} strokeWidth="1.5" />
      <path d={RIDGE_FRONT} className="fill-brand-950 stroke-brand-700" strokeWidth="2" />
    </svg>
  );
}

/** Punktraster als ruhige Textur (dekorativ). */
export function DotField({ className }: { className?: string }) {
  return (
    <svg aria-hidden focusable="false" className={cx('pointer-events-none select-none', className)}>
      <defs>
        <pattern id="k-dotfield" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.4" className="fill-brand-800" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#k-dotfield)" />
    </svg>
  );
}

/** Nur Höhenlinien – ruhiger Hintergrund für Footer, CTA-Bänder und Login. */
export function ContourField({ className, tone = 'brand' }: { className?: string; tone?: 'brand' | 'sand' | 'accent' }) {
  const stroke = tone === 'brand' ? 'stroke-brand-800' : tone === 'sand' ? 'stroke-sand-200' : 'stroke-accent-50';
  return (
    <svg viewBox="560 -100 1240 900" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false" className={cx('pointer-events-none select-none', className)}>
      <g className={cx('fill-none', stroke)} strokeWidth="1.2">
        {CONTOURS.map((d) => (
          <path key={d.slice(0, 24)} d={d} />
        ))}
      </g>
    </svg>
  );
}

/** Eine Pulslinie als Trenner oder Akzent; die Spitze sitzt bei `peakAt` (0–1). */
export function PulseLine({ className, peakAt = 0.62, animate = false }: { className?: string; peakAt?: number; animate?: boolean }) {
  const x = Math.round(1000 * peakAt);
  const d = `M0,40 L${x - 70},40 L${x - 58},32 L${x - 46},40 L${x - 30},40 L${x - 22},48 L${x - 8},2 L${x + 6},58 L${x + 18},40 L${x + 46},40 L${x + 64},28 L${x + 84},40 L1000,40`;
  return (
    <svg viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden focusable="false" className={cx('pointer-events-none select-none', className)}>
      <path d={d} className={cx('fill-none stroke-current', animate && 'k-pulse-draw')} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" pathLength={1} />
    </svg>
  );
}
