'use client';

import { useTranslations } from 'next-intl';

import { countShifts, scaleRoster } from '@kardia/core';
import { RosterStrip, type RosterCode } from '@kardia/ui';

/** Dienstrhythmus-Vorschau, auf das gewählte Pensum skaliert (PRD 7.1). */
export function Roster({ pattern, workloadPct = 100, compact = false, showLegend = true }: { pattern: RosterCode[]; workloadPct?: number; compact?: boolean; showLegend?: boolean }) {
  const t = useTranslations();
  if (pattern.length !== 28) return null;
  const scaled = scaleRoster(pattern, workloadPct) as RosterCode[];
  const shifts = 28 - countShifts(scaled).X;
  const labels = { F: t('enums.RosterCode.F'), S: t('enums.RosterCode.S'), N: t('enums.RosterCode.N'), T: t('enums.RosterCode.T'), X: t('enums.RosterCode.X') };
  return (
    <div className="flex flex-col gap-1">
      <RosterStrip
        pattern={scaled}
        labels={labels}
        weekdays={t.raw('common.roster.weekdays') as string[]}
        caption={t('common.roster.caption', { pct: workloadPct })}
        compact={compact}
        showLegend={showLegend}
      />
      <span className="text-micro text-ink-500">{t('common.roster.shifts', { count: shifts })}</span>
    </div>
  );
}
