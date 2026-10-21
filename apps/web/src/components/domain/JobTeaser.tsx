import { ArrowUpRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { formatChfRange } from '@kardia/core';
import { Icon } from '@kardia/ui';

import { DEPARTMENT_ICONS } from '@/components/brand/departmentIcons';
import { Roster } from '@/components/domain/Roster';

import type { SearchHit } from '@/server/services/search';

/** Kompakte Stellenkarte für Einstiegsseiten: Fachbereich, Lohnband, Dienstrhythmus. */
export async function JobTeaser({ hit }: { hit: SearchHit }) {
  const e = await getTranslations('enums');
  const { salaryMinChf, salaryMaxChf } = hit.profile;
  const workload = hit.workloadMinPct === hit.workloadMaxPct ? `${hit.workloadMaxPct} %` : `${hit.workloadMinPct}–${hit.workloadMaxPct} %`;
  return (
    <Link
      href={`/jobs/${hit.jobId}`}
      className="group flex h-full flex-col gap-4 rounded-card border border-line-200 bg-surface-0 p-5 transition-colors hover:border-accent-600"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-control bg-accent-50 text-accent-700">
          <Icon icon={DEPARTMENT_ICONS[hit.ward.department]} size={20} />
        </span>
        <Icon icon={ArrowUpRight} size={18} className="text-ink-500 transition-colors group-hover:text-accent-600" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-micro font-semibold tracking-wide text-accent-600 uppercase">{e(`Department.${hit.ward.department}`)}</span>
        <h3 className="text-h3 text-ink-900">{hit.title}</h3>
        <p className="flex items-center gap-1 text-body-s text-ink-700">
          {hit.org.name}
          <span aria-hidden>·</span>
          <Icon icon={MapPin} size={14} />
          {hit.location.city}
        </p>
      </div>
      <div className="mt-auto flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 text-body-s font-medium tabular">
          {salaryMinChf != null && salaryMaxChf != null ? (
            <span className="rounded-chip bg-surface-100 px-3 py-1 text-ink-900">{formatChfRange(salaryMinChf, salaryMaxChf)}</span>
          ) : null}
          <span className="rounded-chip bg-surface-100 px-3 py-1 text-ink-900">{workload}</span>
        </div>
        <Roster pattern={hit.ward.rosterPattern} compact showLegend={false} />
      </div>
    </Link>
  );
}
