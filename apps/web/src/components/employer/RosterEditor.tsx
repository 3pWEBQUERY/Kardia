'use client';

import { useTranslations } from 'next-intl';

import { RosterStrip, cx, type RosterCode } from '@kardia/ui';

const CYCLE: RosterCode[] = ['F', 'S', 'N', 'T', 'X'];

/**
 * Muster-Dienstplan bearbeiten: 28 Zellen, Klick wechselt F → S → N → T → frei.
 * Vorschau als Dienstrhythmus-Streifen, wie Fachpersonen ihn sehen (PRD 7.1).
 */
export function RosterEditor({
  value,
  onChange,
  error,
}: {
  value: RosterCode[];
  onChange: (next: RosterCode[]) => void;
  error?: string | undefined;
}) {
  const t = useTranslations();
  const labels = {
    F: t('enums.RosterCode.F'),
    S: t('enums.RosterCode.S'),
    N: t('enums.RosterCode.N'),
    T: t('enums.RosterCode.T'),
    X: t('enums.RosterCode.X'),
  };
  const weekdays = t.raw('common.roster.weekdays') as string[];
  const cells = value.length === 28 ? value : Array.from({ length: 28 }, (_, i) => value[i] ?? 'X');
  const set = (i: number) => {
    const next = [...cells];
    const cur = next[i] ?? 'X';
    next[i] = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length] ?? 'X';
    onChange(next);
  };
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-caption text-ink-700">
        {t('fields.rosterPattern')}{' '}
        <span className="text-ink-500">· {t('employer.form.required')}</span>
      </legend>
      <p className="text-micro text-ink-500">{t('employer.ward.rosterHint')}</p>
      <div className="grid grid-cols-7 gap-1 sm:grid-cols-[repeat(14,minmax(0,1fr))] lg:grid-cols-[repeat(28,minmax(0,1fr))]">
        {cells.map((code, i) => (
          <button
            key={i}
            type="button"
            onClick={() => set(i)}
            aria-label={`${t('employer.ward.week', { n: Math.floor(i / 7) + 1 })}, ${weekdays[i % 7] ?? ''}: ${labels[code]}`}
            className={cx(
              'flex h-touch flex-col items-center justify-center rounded-control border font-mono text-micro',
              code === 'X'
                ? 'border-line-300 bg-surface-0 text-ink-500'
                : 'border-accent-600 bg-accent-50 text-accent-700',
              i % 7 >= 5 && 'border-dashed',
            )}
          >
            <span className="text-micro leading-none text-ink-500">{weekdays[i % 7]}</span>
            {code === 'X' ? '·' : code}
          </button>
        ))}
      </div>
      <RosterStrip
        pattern={cells}
        labels={labels}
        weekdays={weekdays}
        caption={t('employer.ward.rosterPreview')}
        compact
      />
      {error ? <p className="text-micro text-critical-600">{error}</p> : null}
    </fieldset>
  );
}
