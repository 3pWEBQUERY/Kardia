import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { PLAN_LIMITS, SINGLE_LISTING, formatChf, yearlyPriceChf } from '@kardia/core';
import { Button, Card, CardBody, CardHeader } from '@kardia/ui';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('public.pricing');
  return { title: t('title') };
}

/** Preise (PRD 15): Fachpersonen zahlen nie; Arbeitgeber zahlen ein Software-Abo, keine Erfolgsgebühr. */
export default async function PricingPage() {
  const t = await getTranslations('public.pricing');
  const plans = ['PRAXIS', 'INSTITUTION', 'SPITALGRUPPE'] as const;
  return (
    <div className="mx-auto flex max-w-content flex-col gap-8 px-4 py-12 md:px-8">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body text-ink-700">{t('lead')}</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader title={t('single.name')} meta={t('single.meta', { days: SINGLE_LISTING.days })} />
          <CardBody className="flex flex-col gap-3">
            <p className="font-mono text-h2 tabular">{formatChf(SINGLE_LISTING.priceChf)}</p>
            <p className="text-body-s text-ink-700">{t('single.includes')}</p>
          </CardBody>
        </Card>
        {plans.map((p) => (
          <Card key={p} className={p === 'INSTITUTION' ? 'border-accent-600' : undefined}>
            <CardHeader title={t(`plans.${p}.name`)} meta={t('perMonth')} />
            <CardBody className="flex flex-col gap-3">
              <p className="font-mono text-h2 tabular">
                {p === 'SPITALGRUPPE' ? t('from') : ''}
                {formatChf(PLAN_LIMITS[p].monthlyChf)}
              </p>
              <p className="text-micro text-ink-500">{t('yearly', { price: formatChf(yearlyPriceChf(p)) })}</p>
              <p className="text-body-s text-ink-700">{t(`plans.${p}.includes`)}</p>
            </CardBody>
          </Card>
        ))}
      </div>
      <ul className="flex max-w-3xl list-disc flex-col gap-1 pl-5 text-body-s text-ink-700">
        <li>{t('notes.vat')}</li>
        <li>{t('notes.payment')}</li>
        <li>{t('notes.noFee')}</li>
        <li>{t('notes.noAds')}</li>
        <li>{t('notes.founding')}</li>
      </ul>
      <div><Button asChild variant="primary" size="l"><Link href="/employer/onboarding">{t('cta')}</Link></Button></div>
    </div>
  );
}
