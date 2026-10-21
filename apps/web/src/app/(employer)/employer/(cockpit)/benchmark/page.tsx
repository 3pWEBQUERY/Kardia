import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { BENCHMARK_MIN_PEERS, WARD_FIELDS, limitsFor } from '@kardia/core';
import { Button, Card, CardBody, CardHeader, EmptyState, Icon, StatusChip } from '@kardia/ui';

import { PageHeader } from '@/components/app/PageHeader';
import { DEPARTMENT_ICONS } from '@/components/brand/departmentIcons';
import { formatFieldValue } from '@/lib/fieldValue';
import { db } from '@/server/db';
import { requireOrgPage } from '@/server/session';

/** Benchmark (R2): Werte je Station gegen den Median von Fachbereich und Region, erst ab 8 Vergleichsstationen. */
export default async function BenchmarkPage() {
  const ctx = await requireOrgPage();
  const [t, tf, te, tc] = await Promise.all([
    getTranslations('employer.benchmark'),
    getTranslations('fields'),
    getTranslations('enums'),
    getTranslations('common'),
  ]);
  const limits = limitsFor(ctx.org.plan as Parameters<typeof limitsFor>[0]);
  if (!limits?.benchmark) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow={ctx.org.name} title={t('title')} />
        <EmptyState
          action={
            <Button asChild variant="primary">
              <Link href="/employer/billing">{t('upgrade')}</Link>
            </Button>
          }
        >
          {t('notInPlan')}
        </EmptyState>
      </div>
    );
  }
  const wards = await db.ward.findMany({
    where: { location: { organizationId: ctx.org.id } },
    include: {
      location: { select: { canton: true } },
      benchmarks: { where: { peerCount: { gte: BENCHMARK_MIN_PEERS } } },
    },
    orderBy: { name: 'asc' },
  });
  const fmt = (k: string, v: unknown) =>
    formatFieldValue(k, v, { fields: tf, enums: te, common: tc });
  const better = (field: string, value: number, median: number) => {
    const b = WARD_FIELDS.find((f) => f.key === field)?.better;
    if (value === median || !b) return 'neutral' as const;
    return (b === 'lower' ? value < median : value > median) ? ('ok' as const) : ('warn' as const);
  };
  const compared = wards.filter((w) => w.benchmarks.length > 0);
  const pending = wards.filter((w) => w.benchmarks.length === 0);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={ctx.org.name}
        title={t('title')}
        description={t('lead', { min: BENCHMARK_MIN_PEERS })}
        stats={wards.length ? [
          { label: t('stats.compared'), value: compared.length },
          { label: t('stats.pending'), value: pending.length },
        ] : undefined}
      />
      {compared.map((w) => (
        <Card key={w.id}>
          <CardHeader
            title={w.name}
            meta={`${te(`Department.${w.department}`)} · ${t('region', { canton: w.location.canton })}`}
          />
          <CardBody>
            <ul className="flex flex-col gap-4">
                {w.benchmarks.map((b) => {
                  const tone = better(b.field, b.wardValue, b.medianValue);
                  const max = Math.max(b.wardValue, b.medianValue) * 1.15 || 1;
                  return (
                    <li key={b.field} className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-center sm:gap-6">
                      <div className="flex flex-col">
                        <span className="text-body-s font-medium text-ink-900">{tf(b.field)}</span>
                        <span className="text-micro text-ink-500 tabular">{t('peersCount', { count: b.peerCount })}</span>
                      </div>
                      <dl className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-3">
                          <dt className="w-24 shrink-0 text-micro text-ink-700">{t('yours')}</dt>
                          <dd className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="block h-2.5 min-w-0 flex-1 overflow-hidden rounded-chip bg-surface-100">
                              <span
                                className={tone === 'warn' ? 'block h-full rounded-chip bg-warn-600' : tone === 'ok' ? 'block h-full rounded-chip bg-ok-600' : 'block h-full rounded-chip bg-accent-600'}
                                style={{ width: `${Math.round((b.wardValue / max) * 100)}%` }}
                              />
                            </span>
                            <span className="w-28 shrink-0 text-right text-body-s font-semibold text-ink-900 tabular">{fmt(b.field, b.wardValue)}</span>
                          </dd>
                        </div>
                        <div className="flex items-center gap-3">
                          <dt className="w-24 shrink-0 text-micro text-ink-700">{t('median')}</dt>
                          <dd className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="block h-2.5 min-w-0 flex-1 overflow-hidden rounded-chip bg-surface-100">
                              <span className="block h-full rounded-chip bg-ink-500" style={{ width: `${Math.round((b.medianValue / max) * 100)}%` }} />
                            </span>
                            <span className="w-28 shrink-0 text-right text-body-s text-ink-700 tabular">{fmt(b.field, b.medianValue)}</span>
                          </dd>
                        </div>
                      </dl>
                    </li>
                  );
                })}
              </ul>
          </CardBody>
        </Card>
      ))}
      {pending.length ? (
        <Card>
          <CardHeader title={t('pendingTitle')} meta={t('tooFew', { min: BENCHMARK_MIN_PEERS })} />
          <ul className="flex flex-col divide-y divide-line-200">
            {pending.map((w) => {
              const DeptIcon = DEPARTMENT_ICONS[w.department];
              return (
                <li key={w.id} className="flex items-center gap-3 px-5 py-3 md:px-6">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-100 text-ink-700">
                    <Icon icon={DeptIcon} size={18} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body-s font-medium text-ink-900">{w.name}</span>
                    <span className="text-micro text-ink-500">{`${te(`Department.${w.department}`)} · ${t('region', { canton: w.location.canton })}`}</span>
                  </span>
                  <StatusChip tone="neutral">{t('pendingChip')}</StatusChip>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}
      {wards.length === 0 ? (
        <EmptyState
          action={
            <Button asChild>
              <Link href="/employer/wards/new">{t('newWard')}</Link>
            </Button>
          }
        >
          {t('noWards')}
        </EmptyState>
      ) : null}
    </div>
  );
}
