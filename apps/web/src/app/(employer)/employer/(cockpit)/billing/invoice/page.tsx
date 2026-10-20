import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { can, formatDate, formatNumber } from '@kardia/core';
import { PlanTier } from '@kardia/db/enums';
import { Button, Callout } from '@kardia/ui';

import { PrintButton } from '@/components/employer/Billing';
import { createInvoice } from '@/server/services/billing';
import { requireOrg } from '@/server/session';

const chf = (v: number) => `CHF ${formatNumber(v, 2)}`;

/** Druckbare Rechnung mit QR-Einzahlungsschein (Institution/Spitalgruppe, 30 Tage Zahlungsfrist). */
export default async function InvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; yearly?: string }>;
}) {
  const ctx = await requireOrg();
  const sp = await searchParams;
  const [t, te] = await Promise.all([
    getTranslations('employer.billing'),
    getTranslations('enums'),
  ]);
  const plan =
    sp.plan === PlanTier.INSTITUTION || sp.plan === PlanTier.SPITALGRUPPE ? sp.plan : null;
  const back = (
    <Button asChild variant="ghost" className="print:hidden">
      <Link href="/employer/billing">{t('back')}</Link>
    </Button>
  );
  if (!plan || !can(ctx.role, 'billing.manage')) {
    return (
      <div className="flex flex-col gap-4">
        <Callout tone={plan ? 'warn' : 'critical'}>
          {plan ? t('noPermission') : t('invoicePlanInvalid')}
        </Callout>
        <div>{back}</div>
      </div>
    );
  }
  const yearly = sp.yearly === '1';
  const inv = await createInvoice(ctx, plan, yearly);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2 print:hidden">
        <PrintButton label={t('print')} />
        {back}
      </div>
      <article className="flex flex-col gap-6 rounded-card border border-line-300 bg-surface-0 p-6 print:border-0 print:p-0">
        <header className="flex flex-wrap justify-between gap-4">
          <div>
            <h1 className="text-h1">{t('invoice')}</h1>
            <p className="text-body-s text-ink-700">{t('invoiceNumber', { number: inv.number })}</p>
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-3 text-body-s">
            <dt className="text-ink-700">{t('invoiceDate')}</dt>
            <dd className="tabular-nums">{formatDate(inv.date)}</dd>
            <dt className="text-ink-700">{t('dueDate')}</dt>
            <dd className="tabular-nums">{formatDate(inv.dueDate)}</dd>
          </dl>
        </header>
        <p className="text-body-s">{inv.orgName}</p>
        <table className="w-full border-collapse text-body-s">
          <caption className="sr-only">{t('invoice')}</caption>
          <thead>
            <tr className="border-b border-line-300 text-left text-caption text-ink-700">
              <th scope="col" className="h-row">
                {t('position')}
              </th>
              <th scope="col" className="text-right">
                {t('amount')}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line-200">
              <td className="h-row">
                {t('positionText', {
                  plan: te(`PlanTier.${plan}`),
                  period: yearly ? t('period12') : t('period1'),
                })}
              </td>
              <td className="text-right tabular-nums">{chf(inv.amountChf)}</td>
            </tr>
            <tr className="border-b border-line-200">
              <td className="h-row text-ink-700">{t('vat')}</td>
              <td className="text-right tabular-nums">{chf(inv.vatChf)}</td>
            </tr>
            <tr>
              <th scope="row" className="h-row text-left">
                {t('total')}
              </th>
              <td className="text-right font-medium tabular-nums">{chf(inv.totalChf)}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-micro text-ink-500">{t('terms')}</p>
        {/* SVG aus swissqrbill (serverseitig erzeugt, keine Nutzereingaben ausser geprüften Stammdaten). */}
        <div
          className="w-full [&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: inv.svg }}
        />
      </article>
    </div>
  );
}
