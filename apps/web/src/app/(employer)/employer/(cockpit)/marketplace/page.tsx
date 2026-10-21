import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import {
  formatChf,
  formatDate,
  formatNumber,
  limitsFor,
  resolveJobProfile,
  type PartialWardProfile,
} from '@kardia/core';
import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  StatusChip,
  type Tone,
} from '@kardia/ui';

import { MarketplaceSearch, WithdrawOfferButton } from '@/components/employer/Marketplace';
import { db } from '@/server/db';
import { requireFeature } from '@/server/features';
import { listOrgOffers } from '@/server/services/marketplace';
import { requireOrgPage } from '@/server/session';

const TONE: Record<string, Tone> = {
  SENT: 'neutral',
  INTERESTED: 'ok',
  DECLINED: 'critical',
  EXPIRED: 'warn',
  WITHDRAWN: 'neutral',
};

/** Marktplatz-Suche und eigene Angebote mit aggregierten Ablehnungsgründen (AK-E3). */
export default async function MarketplacePage() {
  requireFeature('marketplace');
  const ctx = await requireOrgPage('marketplace.offer');
  const [t, te] = await Promise.all([
    getTranslations('employer.marketplace'),
    getTranslations('enums'),
  ]);
  const limits = limitsFor(ctx.org.plan as Parameters<typeof limitsFor>[0]);
  if (!limits || limits.offersPerMonth === 0) {
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
  const org = await db.organization.findUniqueOrThrow({ where: { id: ctx.org.id } });
  const quota = Math.max(org.offerQuotaPerMonth, limits.offersPerMonth);
  const { offers, declineReasons, usedThisMonth } = await listOrgOffers(ctx);
  const jobs = await db.job.findMany({
    where: { status: 'PUBLISHED', ward: { location: { organizationId: ctx.org.id } } },
    include: { ward: true },
    orderBy: { title: 'asc' },
  });
  const offerJobs = jobs.map((j) => ({
    id: j.id,
    title: `${j.title} · ${j.ward.name}`,
    salaryMinChf:
      resolveJobProfile(j.ward as unknown as PartialWardProfile, j.overrides).salaryMinChf ??
      j.ward.salaryMinChf,
    workloadMinPct: j.workloadMinPct,
    workloadMaxPct: j.workloadMaxPct,
  }));
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-s text-ink-700">{t('lead')}</p>
        <div>
          <StatusChip tone={usedThisMonth >= quota ? 'warn' : 'neutral'}>
            {t('quota', { used: usedThisMonth, quota })}
          </StatusChip>
        </div>
      </header>
      {jobs.length === 0 ? <Callout tone="warn">{t('needJob')}</Callout> : null}
      <MarketplaceSearch jobs={offerJobs} quotaLeft={quota - usedThisMonth} />
      <Card>
        <CardHeader title={t('myOffers')} meta={t('myOffersHint')} />
        <CardBody className="flex flex-col gap-4">
          {offers.length === 0 ? <p className="text-body-s text-ink-700">{t('noOffers')}</p> : null}
          {offers.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-body-s">
                <caption className="sr-only">{t('myOffers')}</caption>
                <thead>
                  <tr className="bg-surface-100 text-left text-caption text-ink-700">
                    <th scope="col" className="h-row px-3">
                      {t('job')}
                    </th>
                    <th scope="col" className="px-3 text-right">
                      {t('salary')}
                    </th>
                    <th scope="col" className="px-3">
                      {t('workload')}
                    </th>
                    <th scope="col" className="px-3">
                      {t('sent')}
                    </th>
                    <th scope="col" className="px-3">
                      {t('status')}
                    </th>
                    <th scope="col" className="px-3">
                      <span className="sr-only">{t('actions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((o) => (
                    <tr key={o.id} className="h-row border-t border-line-200">
                      <td className="px-3">{o.job.title}</td>
                      <td className="px-3 text-right tabular">{formatChf(o.salaryChf)}</td>
                      <td className="px-3 tabular">{o.workloadPct} %</td>
                      <td className="px-3 tabular">{formatDate(o.createdAt)}</td>
                      <td className="px-3">
                        <StatusChip tone={TONE[o.status] ?? 'neutral'}>
                          {te(`OfferStatus.${o.status}`)}
                        </StatusChip>
                      </td>
                      <td className="px-3 text-right">
                        {o.status === 'SENT' ? <WithdrawOfferButton offerId={o.id} /> : null}
                        {o.applicationId ? (
                          <Link href={`/employer/applications/${o.applicationId}`} className="text-accent-700 underline">
                            {t('toApplication')}
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <h3 className="text-caption text-ink-700">{t('declineReasons')}</h3>
            {declineReasons ? (
              <ul className="flex flex-wrap gap-2">
                {declineReasons.map((r) => (
                  <li key={r.reason}>
                    <StatusChip>
                      {te(`DeclineReason.${r.reason}`)} · {formatNumber(r.count)}
                    </StatusChip>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-micro text-ink-500">{t('declineTooFew')}</p>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
