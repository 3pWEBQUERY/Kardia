import { Search } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { WARD_FIELDS } from '@kardia/core';
import { Button, CompareTable, Icon, type CompareRow } from '@kardia/ui';

import { TitleBand } from '@/components/marketing/Marketing';
import { formatFieldValue } from '@/lib/fieldValue';
import { getJobsForCompare } from '@/server/services/jobs';

import type { Metadata } from 'next';

export const metadata: Metadata = { robots: { index: false } };

/** Stellen-Vergleich: bis zu 4 Stellen, Zeilen = Felder des Stationsprofils (PRD 7.1). */
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const ids = ((await searchParams).ids ?? '').split(',').filter(Boolean).slice(0, 4);
  const [t, tf, te, tc] = await Promise.all([getTranslations('public.compare'), getTranslations('fields'), getTranslations('enums'), getTranslations('common')]);
  const items = await getJobsForCompare(ids);
  if (items.length < 2) {
    return (
      <>
        <TitleBand eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />
        <div className="mx-auto grid max-w-content gap-10 px-4 py-14 md:px-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <h2 className="text-h1 text-ink-900">{t('howTitle')}</h2>
            <ol className="flex flex-col gap-4">
              {(['pick', 'open', 'read'] as const).map((k, i) => (
                <li key={k} className="flex gap-4">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-950 text-body-s font-semibold text-brand-100 tabular">{i + 1}</span>
                  <p className="pt-1.5 text-body text-ink-700">{t(`steps.${k}`)}</p>
                </li>
              ))}
            </ol>
            <p className="text-body-s text-ink-500">{t('empty')}</p>
            <div>
              <Button asChild variant="primary" size="l">
                <Link href="/search">
                  <Icon icon={Search} size={18} />
                  {t('toSearch')}
                </Link>
              </Button>
            </div>
          </div>
          <div aria-hidden className="rounded-card border border-line-200 bg-surface-0 p-5">
            <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-x-3 border-b border-line-200 pb-3 text-caption font-semibold text-ink-900">
              <span />
              <span>{t('previewA')}</span>
              <span>{t('previewB')}</span>
            </div>
            {(
              [
                ['lead', '6 Wo', '3 Wo', 0],
                ['weekends', '2', '3', 0],
                ['ratio', '1 : 3', '1 : 2', 1],
              ] as const
            ).map(([k, a, b, best]) => (
              <div key={k} className="grid grid-cols-[1.4fr_1fr_1fr] items-center gap-x-3 border-b border-line-200 py-3 text-body-s last:border-b-0">
                <span className="text-ink-700">{t(`previewRows.${k}`)}</span>
                {[a, b].map((v, i) => (
                  <span key={i} className={i === best ? 'inline-flex w-fit items-center gap-1.5 rounded-chip bg-accent-50 px-2.5 py-1 font-semibold text-accent-700 tabular' : 'px-2.5 text-ink-900 tabular'}>
                    {v}
                    {i === best ? <span className="size-1.5 rounded-full bg-pulse-500" /> : null}
                  </span>
                ))}
              </div>
            ))}
            <p className="mt-3 flex items-center gap-1.5 text-micro text-ink-500">
              <span className="size-1.5 rounded-full bg-pulse-500" />
              {t('best')}
            </p>
          </div>
        </div>
      </>
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
    <>
      <TitleBand eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />
      <div className="mx-auto flex max-w-content flex-col gap-4 px-4 py-12 md:px-8">
        <CompareTable
          caption={t('title')}
          onlyDifferencesLabel={t('onlyDifferences')}
          bestLabel={t('best')}
          columns={items.map((i) => (
            <Link key={i.job.id} href={`/jobs/${i.job.id}`} className="flex flex-col hover:text-accent-700">
              <span>{i.job.title}</span>
              <span className="text-micro font-normal text-ink-500">
                {i.job.ward.location.organization.name} · {i.job.ward.name}
              </span>
            </Link>
          ))}
          rows={rows}
        />
      </div>
    </>
  );
}
