import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { BENCHMARK_MIN_PEERS, WARD_FIELDS, limitsFor } from '@kardia/core';
import { Button, Card, CardBody, CardHeader, EmptyState, StatusChip } from '@kardia/ui';

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
        <h1 className="text-h1">{t('title')}</h1>
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
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-s text-ink-700">{t('lead', { min: BENCHMARK_MIN_PEERS })}</p>
      </header>
      {wards.map((w) => (
        <Card key={w.id}>
          <CardHeader
            title={w.name}
            meta={`${te(`Department.${w.department}`)} · ${t('region', { canton: w.location.canton })}`}
          />
          <CardBody>
            {w.benchmarks.length === 0 ? (
              <p className="text-body-s text-ink-700">
                {t('tooFew', { min: BENCHMARK_MIN_PEERS })}
              </p>
            ) : (
              <table className="w-full border-collapse text-body-s">
                <caption className="sr-only">{w.name}</caption>
                <thead>
                  <tr className="bg-surface-100 text-left text-caption text-ink-700">
                    <th scope="col" className="h-row px-3">
                      {t('field')}
                    </th>
                    <th scope="col" className="px-3 text-right">
                      {t('yours')}
                    </th>
                    <th scope="col" className="px-3 text-right">
                      {t('median')}
                    </th>
                    <th scope="col" className="px-3 text-right">
                      {t('peers')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {w.benchmarks.map((b) => {
                    const tone = better(b.field, b.wardValue, b.medianValue);
                    return (
                      <tr key={b.field} className="h-row border-t border-line-200">
                        <th scope="row" className="px-3 text-left font-normal text-ink-700">
                          {tf(b.field)}
                        </th>
                        <td className="px-3 text-right tabular">
                          <StatusChip tone={tone}>{fmt(b.field, b.wardValue)}</StatusChip>
                        </td>
                        <td className="px-3 text-right tabular">{fmt(b.field, b.medianValue)}</td>
                        <td className="px-3 text-right tabular">{b.peerCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      ))}
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
