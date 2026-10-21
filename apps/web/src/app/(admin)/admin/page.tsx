import { getTranslations } from 'next-intl/server';

import { formatNumber, formatPct } from '@kardia/core';
import { Stat } from '@kardia/ui';

import { PageHeader } from '@/components/app/PageHeader';
import { credentialQueue, kpis } from '@/server/services/admin';

interface Kpi { key: string; value: string | null; target: string }

/** Kennzahlen (PRD 3) mit Zielwert als Hinweis; Betriebswerte für SLA und AK-F2. */
export default async function AdminKpiPage() {
  const t = await getTranslations('admin.kpis');
  const ta = await getTranslations('admin');
  const [k, queue] = await Promise.all([kpis(), credentialQueue()]);
  const overdue = queue.filter((q) => q.overdue).length;
  const pct = (v: number | null) => (v == null ? null : formatPct(Math.round(v * 100)));
  const num = (v: number | null, d = 1) => (v == null ? null : formatNumber(v, d));
  const product: Kpi[] = [
    { key: 'profileCompleteness', value: pct(k.profileCompleteness), target: '≥ 90 %' },
    { key: 'qualifiedApplicationsPerJob', value: num(k.qualifiedApplicationsPerJob), target: '≥ 4' },
    { key: 'timeToHireDays', value: k.timeToHireDays == null ? null : t('days', { value: formatNumber(k.timeToHireDays, 0) }), target: '≤ 30 Tage' },
    { key: 'oneClickShare', value: pct(k.oneClickShare), target: '≥ 60 %' },
    { key: 'employerResponseRate', value: pct(k.employerResponseRate), target: '≥ 85 %' },
    { key: 'offerAcceptance', value: pct(k.offerAcceptance), target: '≥ 15 %' },
    { key: 'flexFilled', value: pct(k.flexFilled), target: '≥ 70 %' },
    { key: 'payingEmployers', value: formatNumber(k.payingEmployers), target: '120' },
    { key: 'weeklyActiveUsers', value: formatNumber(k.weeklyActiveUsers), target: "8'000" },
  ];
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={ta('eyebrow')} title={t('title')} description={t('lead')} />
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {product.map((p) => (
          <Stat key={p.key} label={t(p.key)} value={p.value ?? '–'} hint={p.value == null ? `${t('noData')} · ${t('target', { target: p.target })}` : t('target', { target: p.target })} />
        ))}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-h2">{t('operational')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label={t('reviewSla')} value={pct(k.reviewSla) ?? '–'} hint={t('target', { target: '100 %' })} />
          <Stat label={t('openReviews')} value={formatNumber(k.openReviews)} hint={t('overdue', { count: overdue })} />
          <Stat label={t('trainingDeviations')} value={formatNumber(k.trainingDeviations)} />
        </div>
      </section>
    </div>
  );
}
