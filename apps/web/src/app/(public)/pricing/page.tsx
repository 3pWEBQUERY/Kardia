import { Check, CreditCard, HeartHandshake, Minus, Percent, Receipt, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { PLAN_LIMITS, SINGLE_LISTING, formatChf, formatNumber, yearlyPriceChf } from '@kardia/core';
import { Icon, cx } from '@kardia/ui';

import { BrandCta, BrandHero, BrandLink, Faq, SectionTitle } from '@/components/marketing/Marketing';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('public.pricing');
  return { title: t('title'), description: t('lead') };
}

const PLANS = ['PRAXIS', 'INSTITUTION', 'SPITALGRUPPE'] as const;
const RECOMMENDED = 'INSTITUTION';
const NUMERIC_ROWS = ['activeJobs', 'wards', 'users', 'offersPerMonth', 'poolMembers'] as const;
const BOOLEAN_ROWS = ['benchmark', 'multipleLocations', 'sso', 'api', 'webhooks', 'feedImport'] as const;

/** Preise (PRD 15): Fachpersonen zahlen nie; Arbeitgeber zahlen ein Software-Abo, keine Erfolgsgebühr. */
export default async function PricingPage() {
  const t = await getTranslations('public.pricing');
  const faq = t.raw('faq') as { q: string; a: string }[];

  const yes = (
    <span className="inline-flex size-6 items-center justify-center rounded-full bg-accent-50 text-accent-700">
      <Icon icon={Check} size={14} label={t('included')} />
    </span>
  );
  const no = (
    <span className="inline-flex size-6 items-center justify-center text-ink-500">
      <Icon icon={Minus} size={14} label={t('notIncluded')} />
    </span>
  );

  return (
    <>
      <BrandHero
        art="contour"
        size="m"
        eyebrow={t('eyebrow')}
        title={t('title')}
        lead={t('lead')}
        actions={
          <span className="inline-flex items-center gap-2 rounded-chip bg-pulse-500 px-4 py-2 text-body-s font-semibold text-brand-950">
            <Icon icon={HeartHandshake} size={16} />
            {t('talentFree')}
          </span>
        }
      />

      {/* Abos */}
      <section aria-labelledby="plans" className="mx-auto flex max-w-content flex-col gap-8 px-4 py-16 md:px-8 md:py-20">
        <h2 id="plans" className="sr-only">
          {t('title')}
        </h2>
        <ul className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => {
            const featured = p === RECOMMENDED;
            const items = t(`plans.${p}.includes`).split(', ');
            return (
              <li
                key={p}
                className={cx(
                  'relative flex flex-col gap-6 rounded-card border p-7 md:p-8',
                  featured ? 'border-brand-950 bg-brand-950 text-brand-100' : 'border-line-200 bg-surface-0 text-ink-900',
                )}
              >
                {featured ? (
                  <span className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-chip bg-pulse-500 px-3 py-1 text-micro font-semibold text-brand-950">
                    <Icon icon={Sparkles} size={12} />
                    {t('recommended')}
                  </span>
                ) : null}
                <h3 className={cx('text-h2', featured ? 'text-brand-100' : 'text-ink-900')}>{t(`plans.${p}.name`)}</h3>
                <div className="flex flex-col gap-1">
                  <p className="flex items-baseline gap-2 whitespace-nowrap">
                    {p === 'SPITALGRUPPE' ? <span className="text-h3 text-ink-700">{t('from').trim()}</span> : null}
                    <span className={cx('text-display-l tabular', featured ? 'text-brand-100' : 'text-ink-900')}>{formatChf(PLAN_LIMITS[p].monthlyChf)}</span>
                  </p>
                  <p className={cx('text-micro', featured ? 'text-brand-300' : 'text-ink-500')}>{t('perMonth')}</p>
                  <p className={cx('text-caption', featured ? 'text-brand-300' : 'text-ink-700')}>{t('yearly', { price: formatChf(yearlyPriceChf(p)) })}</p>
                </div>
                <ul className={cx('flex flex-col gap-2.5 border-t pt-5 text-body-s', featured ? 'border-brand-800' : 'border-line-200')}>
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className={cx('mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full', featured ? 'bg-pulse-500 text-brand-950' : 'bg-accent-50 text-accent-700')}>
                        <Icon icon={Check} size={12} />
                      </span>
                      <span className={featured ? 'text-brand-100' : 'text-ink-700'}>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-2">
                  {featured ? (
                    <BrandLink href="/employer/onboarding">{t('choose')}</BrandLink>
                  ) : (
                    <Link
                      href="/employer/onboarding"
                      className="inline-flex h-control-l items-center rounded-control border border-line-300 px-6 text-body font-medium text-ink-900 transition-colors hover:border-accent-600 hover:text-accent-700"
                    >
                      {t('choose')}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Einzelinserat */}
        <div className="flex flex-col gap-6 rounded-card border border-sand-200 bg-sand-100 p-7 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex flex-col gap-1">
            <h3 className="text-h2 text-ink-900">{t('single.name')}</h3>
            <p className="text-body-s text-ink-700">{t('single.includes')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <p className="flex flex-col">
              <span className="text-display tabular text-ink-900">{formatChf(SINGLE_LISTING.priceChf)}</span>
              <span className="text-micro text-ink-500">{t('single.meta', { days: SINGLE_LISTING.days })}</span>
            </p>
            <Link
              href="/employer/onboarding"
              className="inline-flex h-control-l items-center rounded-control bg-ink-900 px-6 text-body font-semibold text-surface-0 transition-colors hover:bg-accent-700"
            >
              {t('singleCta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Vergleichstabelle */}
      <section aria-labelledby="compare" className="border-y border-line-200 bg-surface-0">
        <div className="mx-auto flex max-w-content flex-col gap-10 px-4 py-20 md:px-8">
          <SectionTitle id="compare" title={t('compareTitle')} />
          {/* Scrollbereich per Tastatur erreichbar (schmale Bildschirme, axe scrollable-region-focusable). */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollbare Region muss fokussierbar sein */}
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-labelledby="compare">
            <table className="w-full min-w-[640px] border-collapse text-body-s">
              <thead>
                <tr className="border-b-2 border-ink-900">
                  <th scope="col" className="py-3 pr-4 text-left text-caption font-semibold text-ink-700">
                    {t('feature')}
                  </th>
                  {PLANS.map((p) => (
                    <th key={p} scope="col" className={cx('px-4 py-3 text-left text-body font-semibold', p === RECOMMENDED ? 'bg-accent-50 text-accent-700' : 'text-ink-900')}>
                      {t(`plans.${p}.name`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NUMERIC_ROWS.map((row) => (
                  <tr key={row} className="border-b border-line-200">
                    <th scope="row" className="py-3 pr-4 text-left font-medium text-ink-900">
                      {t(`rows.${row}`)}
                    </th>
                    {PLANS.map((p) => {
                      const v = PLAN_LIMITS[p][row];
                      return (
                        <td key={p} className={cx('px-4 py-3 tabular text-ink-900', p === RECOMMENDED && 'bg-accent-50')}>
                          {v == null ? t('unlimited') : v === 0 ? no : formatNumber(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {BOOLEAN_ROWS.map((row) => (
                  <tr key={row} className="border-b border-line-200">
                    <th scope="row" className="py-3 pr-4 text-left font-medium text-ink-900">
                      {t(`rows.${row}`)}
                    </th>
                    {PLANS.map((p) => (
                      <td key={p} className={cx('px-4 py-3', p === RECOMMENDED && 'bg-accent-50')}>
                        {PLAN_LIMITS[p][row] ? yes : no}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-4 text-body-s text-ink-700 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                [Receipt, t('notes.vat')],
                [CreditCard, t('notes.payment')],
                [Percent, t('notes.noFee')],
                [Sparkles, t('notes.noAds')],
              ] as const
            ).map(([icon, text]) => (
              <li key={text} className="flex gap-3 border-t border-line-200 pt-4">
                <Icon icon={icon} size={18} className="mt-0.5 shrink-0 text-accent-600" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="bg-sand-100">
        <div className="mx-auto grid max-w-content gap-10 px-4 py-20 md:px-8 md:py-24 lg:grid-cols-[1fr_2fr]">
          <h2 id="faq" className="text-display-l text-ink-900">
            {t('faqTitle')}
          </h2>
          <Faq items={faq} />
        </div>
      </section>

      <BrandCta
        title={t('ctaTitle')}
        body={t('ctaBody')}
        actions={<BrandLink href="/employer/onboarding">{t('cta')}</BrandLink>}
      />
    </>
  );
}
