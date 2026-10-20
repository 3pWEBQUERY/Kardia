'use client';

import { useTranslations } from 'next-intl';

import { formatChfShort, type ConditionResult } from '@kardia/core';
import { ConditionChip, ConditionLine } from '@kardia/ui';

/**
 * Bedingungszeile pro Treffer (PRD 7.1): alle Muss- und Wunsch-Bedingungen als
 * Text-Chips mit Zustand. Kein Prozent-Score, keine Sterne.
 */
export function ConditionChips({ results, onRemove }: { results: ConditionResult[]; onRemove?: (key: string) => void }) {
  const t = useTranslations('common');
  if (results.length === 0) return null;
  return (
    <ConditionLine label={t('nav.search')}>
      {results.map((r) => {
        const c = r.condition;
        const value = 'value' in c ? (c.key === 'minSalary' ? formatChfShort(c.value) : c.value) : '';
        const transport = c.key === 'maxCommute' ? t(`conditions.transport.${c.transport}`) : '';
        const known = r.actual != null && typeof r.actual !== 'boolean';
        const label = t(`conditions.${c.key}.${known && c.key !== 'minSalary' ? 'actual' : 'wanted'}`, {
          value,
          actual: typeof r.actual === 'number' ? r.actual : String(r.actual ?? ''),
          transport,
        });
        return (
          <li key={c.key}>
            <ConditionChip
              state={r.state}
              stateLabel={t(`states.${r.state}`)}
              mode={c.mode}
              modeLabel={t(`states.${c.mode}`)}
              removeLabel={t('actions.remove')}
              {...(onRemove ? { onRemove: () => onRemove(c.key) } : {})}
            >
              {label}
            </ConditionChip>
          </li>
        );
      })}
    </ConditionLine>
  );
}
