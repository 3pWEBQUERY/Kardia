import { PLAN_LIMITS } from '@kardia/core';

import type { PlanTier } from '@kardia/db';

/**
 * Stripe-Ereignis → Aktion für die Organisation (PRD 15), als reine Funktion testbar.
 * Strukturtypen statt Stripe-Typen: nur die Felder, die Kardia liest.
 */

type Meta = Record<string, string> | null | undefined;

interface CheckoutSessionLike {
  metadata?: Meta;
  customer?: string | { id: string } | null;
  subscription?: string | { id: string } | null;
}

interface SubscriptionLike {
  id: string;
  status: string;
  metadata?: Meta;
  customer?: string | { id: string } | null;
  cancel_at_period_end?: boolean;
  cancel_at?: number | null;
  items?: { data: { current_period_end?: number; price?: { id: string } | null }[] };
}

interface InvoiceLike {
  customer?: string | { id: string } | null;
  parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
}

export interface StripeEventLike {
  type: string;
  data: { object: unknown };
}

export type BillingAction =
  | { kind: 'listingPaid'; orgId: string; jobId: string }
  | { kind: 'planActivated'; orgId: string; plan: PlanTier; subscriptionId: string | null }
  | { kind: 'planUpdated'; ref: OrgRef; plan: PlanTier | null; validUntil: Date | null; subscriptionId: string }
  | { kind: 'planEnded'; ref: OrgRef; subscriptionId: string }
  | { kind: 'paymentFailed'; ref: OrgRef }
  | { kind: 'ignore' };

/** Wie die Organisation gefunden wird: Metadaten zuerst, dann Abo- oder Kunden-ID. */
export interface OrgRef {
  orgId: string | null;
  subscriptionId: string | null;
  customerId: string | null;
}

const PLANS = Object.keys(PLAN_LIMITS) as PlanTier[];
const isPlan = (v: unknown): v is PlanTier => typeof v === 'string' && (PLANS as string[]).includes(v);
const idOf = (v: string | { id: string } | null | undefined): string | null => (typeof v === 'string' ? v : (v?.id ?? null));

/** Aktive Stati behalten das Abo; alles andere beendet es (gekündigt, unbezahlt, abgelaufen). */
const ACTIVE = new Set(['active', 'trialing', 'past_due']);

export function mapStripeEvent(event: StripeEventLike, priceToPlan: Record<string, PlanTier> = {}): BillingAction {
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as CheckoutSessionLike;
      const orgId = s.metadata?.organizationId;
      if (!orgId) return { kind: 'ignore' };
      if (s.metadata?.kind === 'single_listing' && s.metadata.jobId) return { kind: 'listingPaid', orgId, jobId: s.metadata.jobId };
      if (isPlan(s.metadata?.plan)) return { kind: 'planActivated', orgId, plan: s.metadata.plan, subscriptionId: idOf(s.subscription) };
      return { kind: 'ignore' };
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as SubscriptionLike;
      const ref: OrgRef = { orgId: sub.metadata?.organizationId ?? null, subscriptionId: sub.id, customerId: idOf(sub.customer) };
      if (!ACTIVE.has(sub.status)) return { kind: 'planUpdated', ref, plan: null, validUntil: null, subscriptionId: sub.id };
      const item = sub.items?.data[0];
      const priceId = item?.price?.id;
      const plan = (priceId ? priceToPlan[priceId] : undefined) ?? (isPlan(sub.metadata?.plan) ? sub.metadata.plan : null);
      if (!plan) return { kind: 'ignore' };
      // Läuft automatisch weiter → unbefristet; gekündigt zum Periodenende → bis dahin gültig.
      const endsAt = sub.cancel_at ?? (sub.cancel_at_period_end ? (item?.current_period_end ?? null) : null);
      return { kind: 'planUpdated', ref, plan, validUntil: endsAt ? new Date(endsAt * 1000) : null, subscriptionId: sub.id };
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as SubscriptionLike;
      return { kind: 'planEnded', ref: { orgId: sub.metadata?.organizationId ?? null, subscriptionId: sub.id, customerId: idOf(sub.customer) }, subscriptionId: sub.id };
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object as InvoiceLike;
      return { kind: 'paymentFailed', ref: { orgId: null, subscriptionId: idOf(inv.parent?.subscription_details?.subscription), customerId: idOf(inv.customer) } };
    }
    default:
      return { kind: 'ignore' };
  }
}
