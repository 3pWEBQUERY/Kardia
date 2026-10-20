import { CircleCheck, CircleHelp, CircleX, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cx } from './cx.ts';
import { Icon } from './Icon.tsx';

export type ConditionState = 'met' | 'unmet' | 'unknown';

const STATE_STYLE: Record<ConditionState, string> = {
  met: 'text-ok-600 border-line-300',
  unmet: 'text-critical-600 border-critical-600',
  unknown: 'text-ink-500 border-line-300 border-dashed',
};

const STATE_ICON = { met: CircleCheck, unmet: CircleX, unknown: CircleHelp } as const;

/**
 * Bedingungs-Chip (PRD 8.5): Zustand immer als Icon + Text, nie nur Farbe. Der
 * Zustandstext (`stateLabel`) steht für Screenreader im Label.
 */
export function ConditionChip({
  state,
  children,
  stateLabel,
  mode,
  modeLabel,
  onRemove,
  removeLabel = 'Entfernen',
}: {
  state: ConditionState;
  children: ReactNode;
  stateLabel: string;
  mode?: 'must' | 'wish';
  modeLabel?: string;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex h-7 items-center gap-1.5 rounded-chip border bg-surface-0 pl-2 text-caption whitespace-nowrap',
        onRemove ? 'pr-1' : 'pr-2.5',
        STATE_STYLE[state],
      )}
    >
      <Icon icon={STATE_ICON[state]} size={16} label={stateLabel} />
      <span className="text-ink-900">{children}</span>
      {mode && modeLabel ? (
        <span className={cx('text-micro', mode === 'must' ? 'text-ink-700' : 'text-ink-500')}>{modeLabel}</span>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="ml-0.5 inline-flex size-6 items-center justify-center rounded-chip text-ink-500 hover:bg-surface-100 hover:text-ink-900 pointer-coarse:size-touch"
        >
          <Icon icon={X} size={14} />
        </button>
      ) : null}
    </span>
  );
}

/** Bedingungszeile pro Treffer – eine Zeile, keine Prozent-Scores, keine Sterne. */
export function ConditionLine({ children, label }: { children: ReactNode; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {children}
    </ul>
  );
}

export type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'critical';

const TONE: Record<Tone, string> = {
  neutral: 'text-ink-700 border-line-300 bg-surface-0',
  accent: 'text-accent-600 border-accent-600 bg-accent-50',
  ok: 'text-ok-600 border-line-300 bg-surface-0',
  warn: 'text-warn-600 border-warn-600 bg-surface-0',
  critical: 'text-critical-600 border-critical-600 bg-surface-0',
};

/** Status-Chip (Radius 999 px nur für Status-Chips). */
export function StatusChip({ tone = 'neutral', icon, children }: { tone?: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex h-6 items-center gap-1 rounded-chip border px-2 text-micro whitespace-nowrap',
        TONE[tone],
      )}
    >
      {icon}
      {children}
    </span>
  );
}
