import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { WARD_FIELDS } from '@kardia/core';
import { Button, CompareTable, EmptyState, type CompareRow } from '@kardia/ui';

import { formatFieldValue } from '@/lib/fieldValue';
import { getJobsForCompare } from '@/server/services/jobs';

export const metadata: Metadata = { robots: { index: false } };

/** Stellen-Vergleich: bis zu 4 Stellen, Zeilen = Felder des Stationsprofils (PRD 7.1). */
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const ids = ((await searchParams).ids ?? '').split(',').filter(Boolean).slice(0, 4);
  const [t, tf, te, tc] = await Promise.all([getTranslations('public.compare'), getTranslations('fields'), getTranslations('enums'), getTranslations('common')]);
  const items = await getJobsForCompare(ids);
  if (items.length < 2) {
    return (
      <div className="mx-auto max-w-content px-4 py-8 md:px-8">
        <h1 className="mb-4 text-h1">{t('title')}</h1>
        <EmptyState action={<Button asChild variant="primary"><Link href="/search">{t('toSearch')}</Link></Button>}>{t('empty')}</EmptyState>
      </div>
    );
  }
  const fmt = (k: string, v: unknown) => formatFieldValue(k, v, { fields: tf, enums: te, common: tc });
  const rows: CompareRow[] = [
    { key: 'workload', label: tf('workload'), cells: items.map((i) => `${i.job.workloadMinPct}–${i.job.workloadMaxPct} %`), raw: items.map((i) => `${i.job.workloadMinPct}-${i.job.workloadMaxPct}`) },
    { key: 'city', label: tf('location'), cells: items.map((i) => i.job.ward.location.city), raw: items.map((i) => i.job.ward.location.city) },
    ...WARD_FIELDS.filter((f) => f.kind !== 'roster' && f.group !== 'reentry').map((f) => ({
      key: f.key,
      label: tf(f.key),
      cells: items.map((i) => fmt(f.key, i.profile[f.key])),
      raw: items.map((i) => {
        const v = i.profile[f.key];
        return typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string' ? v : v == null ? null : JSON.stringify(v);
      }),
      ...(f.better ? { better: f.better } : {}),
    })),
  ];
  return (
    <div className="mx-auto flex max-w-content flex-col gap-4 px-4 py-8 md:px-8">
      <h1 className="text-h1">{t('title')}</h1>
      <CompareTable
        caption={t('title')}
        onlyDifferencesLabel={t('onlyDifferences')}
        bestLabel={t('best')}
        columns={items.map((i) => (
          <Link key={i.job.id} href={`/jobs/${i.job.id}`} className="flex flex-col hover:text-accent-700">
            <span>{i.job.title}</span>
            <span className="text-micro font-normal text-ink-500">{i.job.ward.location.organization.name} · {i.job.ward.name}</span>
          </Link>
        ))}
        rows={rows}
      />
    </div>
  );
}
