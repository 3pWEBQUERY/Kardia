import 'server-only';

import { Stripe } from 'stripe';
import { SwissQRBill } from 'swissqrbill/svg';

import { PLAN_LIMITS, ProblemError, SINGLE_LISTING, yearlyPriceChf } from '@kardia/core';


import { audit } from '../audit.ts';
import { db } from '../db.ts';
import { env } from '../env.ts';

import type { OrgContext } from '../session.ts';
import type { PlanTier } from '@kardia/db';

/**
 * Abrechnung (PRD 15): Stripe Billing in CHF (Karte; TWINT für Einmalzahlungen wie
 * das Einzelinserat), Rechnung mit QR-Einzahlungsschein für Institution und
 * Spitalgruppe (30 Tage, jährliche Vorauszahlung mit 2 Monaten Rabatt).
 */
function stripe(): Stripe {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) throw new ProblemError('upstream', 'Die Zahlungsabwicklung ist nicht konfiguriert.');
  return new Stripe(key);
}

const PRICE_ENV: Record<PlanTier, 'STRIPE_PRICE_PRAXIS' | 'STRIPE_PRICE_INSTITUTION' | 'STRIPE_PRICE_SPITALGRUPPE'> = {
  PRAXIS: 'STRIPE_PRICE_PRAXIS',
  INSTITUTION: 'STRIPE_PRICE_INSTITUTION',
  SPITALGRUPPE: 'STRIPE_PRICE_SPITALGRUPPE',
};

async function customerFor(ctx: OrgContext): Promise<string> {
  const org = await db.organization.findUniqueOrThrow({ where: { id: ctx.org.id } });
  if (org.stripeCustomerId) return org.stripeCustomerId;
  const customer = await stripe().customers.create({ name: org.name, metadata: { organizationId: org.id, uid: org.uid } });
  await db.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export async function checkoutPlan(ctx: OrgContext, plan: PlanTier): Promise<string> {
  const price = env()[PRICE_ENV[plan]];
  if (!price) throw new ProblemError('upstream', 'Preis nicht konfiguriert.');
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: await customerFor(ctx),
    line_items: [{ price, quantity: 1 }],
    currency: 'chf',
    success_url: `${env().APP_ORIGIN}/employer/billing?ok=1`,
    cancel_url: `${env().APP_ORIGIN}/employer/billing`,
    metadata: { organizationId: ctx.org.id, plan },
    subscription_data: { metadata: { organizationId: ctx.org.id, plan } },
  });
  if (!session.url) throw new ProblemError('upstream');
  return session.url;
}

export async function checkoutSingleListing(ctx: OrgContext, jobId: string): Promise<string> {
  const job = await db.job.findFirst({ where: { id: jobId, ward: { location: { organizationId: ctx.org.id } } } });
  if (!job) throw new ProblemError('notFound');
  const price = env().STRIPE_PRICE_SINGLE_LISTING;
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    customer: await customerFor(ctx),
    // Zahlungsarten (Karte, TWINT) über die Stripe-Zahlungsmethoden-Konfiguration im Dashboard.
    line_items: price
      ? [{ price, quantity: 1 }]
      : [{ price_data: { currency: 'chf', unit_amount: SINGLE_LISTING.priceChf * 100, product_data: { name: `Einzelinserat: ${job.title}` } }, quantity: 1 }],
    success_url: `${env().APP_ORIGIN}/employer/jobs/${job.id}?paid=1`,
    cancel_url: `${env().APP_ORIGIN}/employer/jobs/${job.id}`,
    metadata: { organizationId: ctx.org.id, jobId: job.id, kind: 'single_listing' },
  });
  if (!session.url) throw new ProblemError('upstream');
  return session.url;
}

export async function handleStripeWebhook(rawBody: string, signature: string): Promise<void> {
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new ProblemError('upstream');
  const event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object;
      const orgId = s.metadata?.organizationId;
      if (!orgId) return;
      if (s.metadata?.kind === 'single_listing' && s.metadata.jobId) {
        await db.job.update({ where: { id: s.metadata.jobId }, data: { paidUntil: new Date(Date.now() + SINGLE_LISTING.days * 86400_000) } });
      } else if (s.metadata?.plan) {
        const plan = s.metadata.plan as PlanTier;
        await db.organization.update({
          where: { id: orgId },
          data: { plan, offerQuotaPerMonth: PLAN_LIMITS[plan].offersPerMonth, planValidUntil: null },
        });
      }
      return;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const orgId = sub.metadata.organizationId;
      if (orgId) await db.organization.update({ where: { id: orgId }, data: { plan: null, offerQuotaPerMonth: 0 } });
      return;
    }
    default:
      return;
  }
}

/** QR-Referenz (27 Stellen, Modulo 10 rekursiv) aus einer Rechnungsnummer. */
export function qrReference(invoiceNumber: string): string {
  const digits = invoiceNumber.replace(/\D/g, '').padStart(26, '0').slice(-26);
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  let carry = 0;
  for (const d of digits) carry = table[(carry + Number(d)) % 10] ?? 0;
  return `${digits}${(10 - carry) % 10}`;
}

export interface Invoice {
  number: string;
  date: Date;
  dueDate: Date;
  plan: PlanTier;
  yearly: boolean;
  amountChf: number;
  vatChf: number;
  totalChf: number;
  orgName: string;
  svg: string;
}

const VAT_RATE = 0.081;

/** Rechnung mit QR-Einzahlungsschein für Institution/Spitalgruppe (Zahlungsfrist 30 Tage). */
export async function createInvoice(ctx: OrgContext, plan: PlanTier, yearly: boolean): Promise<Invoice> {
  if (plan === 'PRAXIS') throw new ProblemError('validation', 'Das Abo "Praxis" wird per Karte oder TWINT bezahlt.');
  const e = env();
  const org = await db.organization.findUniqueOrThrow({ where: { id: ctx.org.id }, include: { locations: { take: 1 } } });
  const amount = yearly ? yearlyPriceChf(plan) : PLAN_LIMITS[plan].monthlyChf;
  const vat = Math.round(amount * VAT_RATE * 100) / 100;
  const total = Math.round((amount + vat) * 100) / 100;
  const now = new Date();
  const number = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${org.uid.replace(/\D/g, '').slice(-6)}`;
  const loc = org.locations[0];
  const svg = new SwissQRBill({
    currency: 'CHF',
    amount: total,
    reference: qrReference(number),
    creditor: { name: e.BILLING_CREDITOR_NAME, address: e.BILLING_CREDITOR_ADDRESS, zip: e.BILLING_CREDITOR_ZIP, city: e.BILLING_CREDITOR_CITY, country: 'CH', account: e.BILLING_IBAN },
    ...(loc ? { debtor: { name: org.name.slice(0, 70), address: loc.street, zip: loc.postalCode, city: loc.city, country: 'CH' } } : {}),
    message: `Kardia ${plan} ${yearly ? '12 Monate' : '1 Monat'}`,
  }, { language: 'DE' }).toString();
  await audit({ actorId: ctx.user.id, action: 'billing.invoice', entity: 'Organization', entityId: org.id, after: { number, plan, yearly, total } });
  return { number, date: now, dueDate: new Date(now.getTime() + 30 * 86400_000), plan, yearly, amountChf: amount, vatChf: vat, totalChf: total, orgName: org.name, svg };
}
