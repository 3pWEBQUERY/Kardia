import 'server-only';

import { Stripe } from 'stripe';
import { SwissQRBill } from 'swissqrbill/svg';

import { PLAN_LIMITS, ProblemError, QUEUES, SINGLE_LISTING, yearlyPriceChf } from '@kardia/core';

import { audit } from '../audit.ts';
import { db } from '../db.ts';
import { env } from '../env.ts';
import { enqueue } from '../queue.ts';

import { mapStripeEvent, type BillingAction, type OrgRef } from './billingEvents.ts';

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

function priceToPlan(): Record<string, PlanTier> {
  const e = env();
  const map: Record<string, PlanTier> = {};
  for (const [plan, key] of Object.entries(PRICE_ENV) as [PlanTier, (typeof PRICE_ENV)[PlanTier]][]) {
    const price = e[key];
    if (price) map[price] = plan;
  }
  return map;
}

async function findOrg(ref: OrgRef): Promise<{ id: string; name: string } | null> {
  const select = { id: true, name: true } as const;
  if (ref.orgId) return db.organization.findUnique({ where: { id: ref.orgId }, select });
  if (ref.subscriptionId) {
    const bySub = await db.organization.findUnique({ where: { stripeSubscriptionId: ref.subscriptionId }, select });
    if (bySub) return bySub;
  }
  if (ref.customerId) return db.organization.findUnique({ where: { stripeCustomerId: ref.customerId }, select });
  return null;
}

/** Stripe-Webhook: Einzelinserat, Abo-Start, Planwechsel/Kündigung, Abo-Ende, Zahlungsausfall. */
export async function handleStripeWebhook(rawBody: string, signature: string): Promise<void> {
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new ProblemError('upstream');
  const event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  await applyBillingAction(mapStripeEvent(event, priceToPlan()));
}

/** Systemaktionen von Stripe: im Ereignislog (AuditLog verlangt eine handelnde Person). */
async function billingEvent(name: string, orgId: string, props?: Record<string, unknown>): Promise<void> {
  await db.event.create({ data: { name, orgId, ...(props ? { props: JSON.parse(JSON.stringify(props)) as object } : {}) } });
}

export async function applyBillingAction(action: BillingAction): Promise<void> {
  switch (action.kind) {
    case 'ignore':
      return;
    case 'listingPaid':
      await db.job.update({ where: { id: action.jobId }, data: { paidUntil: new Date(Date.now() + SINGLE_LISTING.days * 86400_000) } });
      return;
    case 'planActivated':
      await db.organization.update({
        where: { id: action.orgId },
        data: { plan: action.plan, offerQuotaPerMonth: PLAN_LIMITS[action.plan].offersPerMonth, planValidUntil: null, stripeSubscriptionId: action.subscriptionId },
      });
      await billingEvent('billing.plan_activated', action.orgId, { plan: action.plan });
      return;
    case 'planUpdated': {
      const org = await findOrg(action.ref);
      if (!org) return;
      await db.organization.update({
        where: { id: org.id },
        data: action.plan
          ? { plan: action.plan, offerQuotaPerMonth: PLAN_LIMITS[action.plan].offersPerMonth, planValidUntil: action.validUntil, stripeSubscriptionId: action.subscriptionId }
          : { plan: null, offerQuotaPerMonth: 0, planValidUntil: null },
      });
      await billingEvent('billing.plan_updated', org.id, { plan: action.plan, validUntil: action.validUntil });
      return;
    }
    case 'planEnded': {
      const org = await findOrg(action.ref);
      if (!org) return;
      await db.organization.update({ where: { id: org.id }, data: { plan: null, offerQuotaPerMonth: 0, planValidUntil: null, stripeSubscriptionId: null } });
      await billingEvent('billing.plan_ended', org.id);
      return;
    }
    case 'paymentFailed': {
      const org = await findOrg(action.ref);
      if (!org) return;
      const owners = await db.orgMember.findMany({ where: { organizationId: org.id, role: 'OWNER', user: { deletedAt: null } }, select: { user: { select: { email: true } } } });
      for (const o of owners) await enqueue(QUEUES.emailSend, { template: 'plan.payment-failed', to: o.user.email, data: { orgName: org.name } });
      await billingEvent('billing.payment_failed', org.id);
      return;
    }
  }
}

/** Stripe-Kundenportal: Zahlungsmittel, Planwechsel, Kündigung (nur Owner mit Stripe-Kunde). */
export async function billingPortalUrl(ctx: OrgContext): Promise<string> {
  const org = await db.organization.findUniqueOrThrow({ where: { id: ctx.org.id }, select: { stripeCustomerId: true } });
  if (!org.stripeCustomerId) throw new ProblemError('conflict', 'Es gibt noch kein Stripe-Abo für diese Organisation.');
  const session = await stripe().billingPortal.sessions.create({ customer: org.stripeCustomerId, return_url: `${env().APP_ORIGIN}/employer/billing` });
  return session.url;
}

export function stripeConfigured(): boolean {
  return Boolean(env().STRIPE_SECRET_KEY);
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
