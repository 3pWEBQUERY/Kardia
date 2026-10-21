import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ProblemError, formatChf, formatDate, formatPlainDate } from '@kardia/core';
import { Card, CardBody, CardHeader, StatusChip } from '@kardia/ui';

import { PageHeader } from '@/components/app/PageHeader';
import { OfferResponse } from '@/components/candidate/OfferResponse';
import { Roster } from '@/components/domain/Roster';
import { WardProfileView } from '@/components/domain/WardProfileView';
import { requireFeature } from '@/server/features';
import { getMyOffer } from '@/server/services/marketplace';
import { realityAggregates } from '@/server/services/wards';
import { requireUser } from '@/server/session';

/** Angebot eines Arbeitgebers: konkreter Jahreslohn, referenzierte Stelle mit Stationsprofil. */
export default async function OfferPage({ params }: { params: Promise<{ id: string }> }) {
  requireFeature('marketplace');
  const { id } = await params;
  const s = await requireUser(`/offers/${id}`);
  const data = await getMyOffer(s.user.id, id).catch((e: unknown) => {
    if (e instanceof ProblemError) return null;
    throw e;
  });
  if (!data) notFound();
  const { offer, profile } = data;
  const [t, e] = await Promise.all([getTranslations('candidate.offer'), getTranslations('enums')]);
  const reality = await realityAggregates(offer.job.wardId, offer.job.ward);
  const open = offer.status === 'SENT' && offer.expiresAt > new Date();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${offer.organization.name} · ${offer.job.ward.name} · ${offer.job.ward.location.city}`}
        back={{ href: '/me/marketplace', label: t('backToMarketplace') }}
        title={t('title', { job: offer.job.title })}
        meta={
          <>
            <StatusChip tone={open ? 'accent' : 'neutral'}>{e(`OfferStatus.${open || offer.status !== 'SENT' ? offer.status : 'EXPIRED'}`)}</StatusChip>
            <StatusChip>{t('validUntil', { date: formatDate(offer.expiresAt) })}</StatusChip>
          </>
        }
        stats={[
          { label: t('salary'), value: formatChf(offer.salaryChf) },
          { label: t('workload'), value: `${offer.workloadPct} %` },
          { label: t('start'), value: formatPlainDate(offer.startDate) },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title={t('terms')} />
            <CardBody className="grid gap-2 text-body-s sm:grid-cols-3">
              <p><span className="block text-micro text-ink-500">{t('salary')}</span><span className="text-h3 font-semibold tabular">{formatChf(offer.salaryChf)}</span></p>
              <p><span className="block text-micro text-ink-500">{t('workload')}</span><span className="text-h3 font-semibold tabular">{offer.workloadPct} %</span></p>
              <p><span className="block text-micro text-ink-500">{t('start')}</span><span className="text-h3 font-semibold tabular">{formatPlainDate(offer.startDate)}</span></p>
              {offer.note ? <p className="text-ink-700 sm:col-span-3">{offer.note}</p> : null}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('rhythm')} />
            <CardBody><Roster pattern={offer.job.ward.rosterPattern} workloadPct={offer.workloadPct} /></CardBody>
          </Card>
          <Card>
            <CardHeader title={t('profile')} actions={<Link href={`/jobs/${offer.jobId}`} className="text-body-s text-accent-600">{t('toJob')}</Link>} />
            <CardBody>
              <WardProfileView profile={profile} confirmedAt={offer.job.ward.confirmedAt} reality={reality} comments={[]} location={offer.job.ward.location} />
            </CardBody>
          </Card>
        </div>
        <aside>
          <Card>
            <CardHeader title={t('respond')} />
            <CardBody>
              <OfferResponse offerId={offer.id} open={open} />
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
