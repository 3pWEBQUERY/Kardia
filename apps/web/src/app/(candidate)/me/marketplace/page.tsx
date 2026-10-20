import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import { conditionSchema, formatChf, formatDate, formatPlainDate } from '@kardia/core';
import { Button, Card, CardBody, CardHeader, EmptyState, StatusChip } from '@kardia/ui';

import { BlockList } from '@/components/candidate/BlockList';
import { MarketplaceForm } from '@/components/candidate/MarketplaceForm';
import { db } from '@/server/db';
import { listMyOffers } from '@/server/services/marketplace';
import { requireCandidate } from '@/server/session';

/** Marktplatz-Profil & Angebote (Modul E): anonym bis zur Zustimmung. */
export default async function MarketplacePage() {
  const { user, candidate } = await requireCandidate('/me/marketplace');
  const [t, e] = await Promise.all([getTranslations('candidate.marketplace'), getTranslations('enums')]);
  const [offers, blocks, orgs] = await Promise.all([
    listMyOffers(user.id),
    db.candidateBlock.findMany({ where: { candidateId: candidate.id }, select: { organizationId: true } }),
    db.organization.findMany({ where: { verification: 'VERIFIED' }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);
  const must = z.array(conditionSchema).catch([]).parse(candidate.mustConditions ?? []);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-s text-ink-700">{t('lead')}</p>
      </header>
      <Card>
        <CardHeader title={t('offers')} />
        <CardBody className="flex flex-col gap-2">
          {offers.length === 0 ? <EmptyState>{candidate.marketplaceActive ? t('noOffersActive') : t('noOffers')}</EmptyState> : null}
          {offers.map((o) => {
            const expired = o.status === 'SENT' && o.expiresAt < new Date();
            return (
              <Link key={o.id} href={`/offers/${o.id}`} className="flex flex-col gap-1 border-b border-line-200 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex flex-col">
                  <span className="text-body-s font-medium">{o.job.title} · {o.organization.name}</span>
                  <span className="text-micro text-ink-500 tabular">{formatChf(o.salaryChf)} · {o.workloadPct} % · {t('start', { date: formatPlainDate(o.startDate) })} · {t('validUntil', { date: formatDate(o.expiresAt) })}</span>
                </span>
                <StatusChip tone={o.status === 'SENT' && !expired ? 'accent' : 'neutral'}>{e(`OfferStatus.${expired ? 'EXPIRED' : o.status}`)}</StatusChip>
              </Link>
            );
          })}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t('profile')} meta={t('profileHint')} />
        <CardBody>
          <MarketplaceForm
            initial={{
              marketplaceActive: candidate.marketplaceActive,
              desiredWorkloadPct: candidate.desiredWorkloadPct,
              earliestStart: candidate.earliestStart?.toISOString().slice(0, 10) ?? null,
              homeDistrict: candidate.homeDistrict,
              mustConditions: must,
            }}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t('blocks')} meta={t('blocksHint')} />
        <CardBody>
          <BlockList orgs={orgs} blocked={blocks.map((b) => b.organizationId)} />
        </CardBody>
      </Card>
      <p className="text-micro text-ink-500">{t('anonymity')}</p>
      <div><Button asChild size="s" variant="ghost"><Link href="/me/pass">{t('toPass')}</Link></Button></div>
    </div>
  );
}
