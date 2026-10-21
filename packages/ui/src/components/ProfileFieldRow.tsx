import { ShieldCheck, TriangleAlert } from 'lucide-react';


import { cx } from './cx.ts';
import { Icon } from './Icon.tsx';

import type { ReactNode } from 'react';

/**
 * Profil-Feldzeile (PRD 8.5): Label · Arbeitgeberwert · Team-Wert · Bestätigungsdatum.
 * Abweichungen des Realitäts-Checks werden mit einem Warn-Token markiert, nie versteckt.
 */
export function ProfileFieldRow({
  label,
  value,
  team,
  source,
  deviates = false,
  deviationLabel = 'Abweichung',
  employerComment,
  sourceShort,
}: {
  label: ReactNode;
  value: ReactNode;
  /** z. B. "Team 4 Wo, 7 Antworten" – nur ab 5 Antworten gesetzt. */
  team?: ReactNode;
  /** z. B. "bestätigt von Arbeitgeber am 02.10.2026" (AK-A2). */
  source?: ReactNode;
  /** Kurzform für die Anzeige rechts (z. B. "Arbeitgeber · 02.10.2026"); `source` bleibt für Screenreader. */
  sourceShort?: ReactNode;
  deviates?: boolean;
  deviationLabel?: string;
  employerComment?: ReactNode;
}) {
  return (
    <div className={cx('grid grid-cols-1 gap-x-6 gap-y-0.5 border-b border-line-200 py-3', sourceShort ? 'sm:grid-cols-[minmax(160px,1fr)_2fr_auto]' : 'sm:grid-cols-[minmax(160px,1fr)_2fr]')}>
      <dt className="text-body-s text-ink-700">{label}</dt>
      <dd className="flex flex-col gap-0.5">
        <span className="text-body-s font-medium text-ink-900 tabular">{value}</span>
        {team ? (
          <span className={cx('inline-flex items-center gap-1 text-micro', deviates ? 'text-warn-600' : 'text-ink-500')}>
            {deviates ? <Icon icon={TriangleAlert} size={14} label={deviationLabel} /> : null}
            {team}
          </span>
        ) : null}
        {employerComment ? <span className="text-micro text-ink-700">{employerComment}</span> : null}
        {source && !sourceShort ? <span className="text-micro text-ink-500">{source}</span> : null}
        {source && sourceShort ? <span className="sr-only">{source}</span> : null}
      </dd>
      {sourceShort ? (
        <span aria-hidden className="inline-flex items-center gap-1 self-start text-micro text-ink-500 sm:justify-self-end sm:pt-0.5">
          <Icon icon={ShieldCheck} size={14} className="text-ok-600" />
          {sourceShort}
        </span>
      ) : null}
    </div>
  );
}

export function ProfileFieldList({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <dl aria-label={label} className="flex flex-col">
      {children}
    </dl>
  );
}
