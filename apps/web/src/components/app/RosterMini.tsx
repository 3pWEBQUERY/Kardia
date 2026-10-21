import { cx } from '@kardia/ui';

import type { RosterCode } from '@kardia/ui';

const CELL: Record<RosterCode, string> = {
  F: 'bg-accent-600',
  S: 'bg-accent-700',
  N: 'bg-ink-900',
  T: 'bg-brand-500',
  X: 'bg-surface-100',
};

/**
 * Dienstrhythmus als Mini-Balken für Listen: 28 schmale Zellen, Wochen getrennt.
 * Rein grafisch – die Zusammenfassung steht im `label` (Screenreader) und daneben im Text.
 */
export function RosterMini({ pattern, label, className }: { pattern: readonly RosterCode[]; label: string; className?: string }) {
  if (pattern.length !== 28) return null;
  return (
    <span role="img" aria-label={label} className={cx('inline-grid grid-cols-4 gap-1', className)}>
      {[0, 1, 2, 3].map((w) => (
        <span key={w} className="grid grid-cols-7 gap-px">
          {pattern.slice(w * 7, w * 7 + 7).map((c, i) => (
            <span key={i} className={cx('h-3.5 w-1.5 rounded-[2px]', CELL[c])} />
          ))}
        </span>
      ))}
    </span>
  );
}
