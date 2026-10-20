import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import {
  FOUNDING_PARTNER,
  PLAN_LIMITS,
  SINGLE_LISTING,
  can,
  formatChf,
  formatDate,
  formatNumber,
  yearlyPriceChf,
} from '@kardia/core';
import { PlanTier } from '@kardia/db/enums';
import { Button, Callout, Card, CardBody, CardHeader, StatusChip } from '@kardia/ui';

import { PlanCheckoutButton } from '@/components/employer/Billing';
import { db } from '@/server/db';
import { requireOrg } from '@/server/session';

const PLANS = [PlanTier.PRAXIS, PlanTier.INSTITUTION, PlanTier.SPITALGRUPPE] as const;

/** Abrechnung (PRD 15): aktuelles Abo, Stripe Checkout je Abo, Rechnung mit QR-Einzahlungsschein, Gründungspartner. */
export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const ctx = await requireOrg();
  const { ok } = await searchParams;
  const [t, te] = await Promise.all([
    getTranslations('employer.billing'),
    getTranslations('enums'),
  ]);
  const [org, partners] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: ctx.org.id },
      select: { plan: true, planValidUntil: true, foundingPartner: true },
    }),
    db.organization.count({ where: { foundingPartner: true } }),
  ]);
  const manage = can(ctx.role, 'billing.manage');
  const limit = (v: number | null) => (v == null ? t('unlimited') : formatNumber(v));
  const freeSlots = Math.max(0, FOUNDING_PARTNER.slots - partners);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-s text-ink-700">
          {org.plan ? t('current', { plan: te(`PlanTier.${org.plan}`) }) : t('noPlan')}
          {org.planValidUntil
            ? ` · ${t('validUntil', { date: formatDate(org.planValidUntil) })}`
            : ''}
        </p>
      </header>
      {ok ? <Callout>{t('paid')}</Callout> : null}
      {org.foundingPartner ? (
        <Callout title={t('foundingTitle')}>
          {t('foundingActive', { months: FOUNDING_PARTNER.months })}
        </Callout>
      ) : !org.plan || org.plan === PlanTier.PRAXIS ? (
        <Callout title={t('foundingTitle')}>
          {t('foundingInfo', {
            slots: FOUNDING_PARTNER.slots,
            months: FOUNDING_PARTNER.months,
            free: freeSlots,
          })}
        </Callout>
      ) : null}
      {!manage ? <Callout tone="warn">{t('noPermission')}</Callout> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const l = PLAN_LIMITS[plan];
          const current = org.plan === plan;
          return (
            <Card key={plan}>
              <CardHeader
                title={te(`PlanTier.${plan}`)}
                meta={current ? <StatusChip tone="ok">{t('currentPlan')}</StatusChip> : undefined}
              />
              <CardBody>
                <div className="flex flex-col gap-4">
                  <p>
                    <span className="text-h2 tabular-nums">{formatChf(l.monthlyChf)}</span>
                    <span className="text-body-s text-ink-700"> {t('perMonth')}</span>
                  </p>
                  <p className="text-micro text-ink-500">
                    {t('yearly', { price: formatChf(yearlyPriceChf(plan)) })}
                  </p>
                  <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-body-s">
                    <dt className="text-ink-700">{t('limits.activeJobs')}</dt>
                    <dd className="text-right tabular-nums">{limit(l.activeJobs)}</dd>
                    <dt className="text-ink-700">{t('limits.wards')}</dt>
                    <dd className="text-right tabular-nums">{limit(l.wards)}</dd>
                    <dt className="text-ink-700">{t('limits.users')}</dt>
                    <dd className="text-right tabular-nums">{limit(l.users)}</dd>
                    <dt className="text-ink-700">{t('limits.offers')}</dt>
                    <dd className="text-right tabular-nums">{formatNumber(l.offersPerMonth)}</dd>
                    <dt className="text-ink-700">{t('limits.pool')}</dt>
                    <dd className="text-right tabular-nums">
                      {l.flexPool ? limit(l.poolMembers) : t('no')}
                    </dd>
                    <dt className="text-ink-700">{t('limits.benchmark')}</dt>
                    <dd className="text-right">{l.benchmark ? t('yes') : t('no')}</dd>
                    <dt className="text-ink-700">{t('limits.sso')}</dt>
                    <dd className="text-right">{l.sso ? t('yes') : t('no')}</dd>
                    <dt className="text-ink-700">{t('limits.api')}</dt>
                    <dd className="text-right">{l.api ? t('yes') : t('no')}</dd>
                  </dl>
                  {manage ? (
                    <div className="flex flex-col gap-2">
                      <PlanCheckoutButton plan={plan} current={current} label={t('checkout')} />
                      {plan !== PlanTier.PRAXIS ? (
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="s" variant="ghost">
                            <Link href={`/employer/billing/invoice?plan=${plan}`}>
                              {t('invoiceMonthly')}
                            </Link>
                          </Button>
                          <Button asChild size="s" variant="ghost">
                            <Link href={`/employer/billing/invoice?plan=${plan}&yearly=1`}>
                              {t('invoiceYearly')}
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <p className="text-micro text-ink-500">{t('praxisCard')}</p>
                      )}
                    </div>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader title={t('singleTitle')} />
        <CardBody>
          <p className="text-body-s text-ink-700">
            {t('singleInfo', {
              price: formatChf(SINGLE_LISTING.priceChf),
              days: SINGLE_LISTING.days,
            })}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
