import { describe, expect, it } from 'vitest';

import { mapStripeEvent } from '@/server/services/billingEvents';

const ev = (type: string, object: unknown) => ({ type, data: { object } });

describe('Stripe-Ereignisse → Abo-Aktionen', () => {
  it('Checkout Abo aktiviert Plan mit Abo-ID', () => {
    expect(mapStripeEvent(ev('checkout.session.completed', { metadata: { organizationId: 'o1', plan: 'INSTITUTION' }, subscription: 'sub_1' }))).toEqual({
      kind: 'planActivated',
      orgId: 'o1',
      plan: 'INSTITUTION',
      subscriptionId: 'sub_1',
    });
  });

  it('Checkout Einzelinserat bezahlt die Stelle', () => {
    expect(mapStripeEvent(ev('checkout.session.completed', { metadata: { organizationId: 'o1', kind: 'single_listing', jobId: 'j1' } }))).toEqual({
      kind: 'listingPaid',
      orgId: 'o1',
      jobId: 'j1',
    });
  });

  it('Checkout ohne Organisation oder mit unbekanntem Plan wird ignoriert', () => {
    expect(mapStripeEvent(ev('checkout.session.completed', { metadata: {} })).kind).toBe('ignore');
    expect(mapStripeEvent(ev('checkout.session.completed', { metadata: { organizationId: 'o1', plan: 'GOLD' } })).kind).toBe('ignore');
  });

  it('Planwechsel über die Preis-ID, automatisch verlängert = unbefristet', () => {
    const a = mapStripeEvent(
      ev('customer.subscription.updated', { id: 'sub_1', status: 'active', customer: 'cus_1', metadata: { organizationId: 'o1', plan: 'PRAXIS' }, cancel_at_period_end: false, items: { data: [{ current_period_end: 1_800_000_000, price: { id: 'price_sg' } }] } }),
      { price_sg: 'SPITALGRUPPE' },
    );
    expect(a).toEqual({ kind: 'planUpdated', ref: { orgId: 'o1', subscriptionId: 'sub_1', customerId: 'cus_1' }, plan: 'SPITALGRUPPE', validUntil: null, subscriptionId: 'sub_1' });
  });

  it('Kündigung zum Periodenende setzt planValidUntil', () => {
    const a = mapStripeEvent(ev('customer.subscription.updated', { id: 'sub_1', status: 'active', metadata: { organizationId: 'o1', plan: 'INSTITUTION' }, cancel_at_period_end: true, items: { data: [{ current_period_end: 1_800_000_000 }] } }));
    expect(a.kind === 'planUpdated' && a.validUntil?.toISOString()).toBe(new Date(1_800_000_000_000).toISOString());
  });

  it('Unbezahltes Abo beendet den Plan', () => {
    const a = mapStripeEvent(ev('customer.subscription.updated', { id: 'sub_1', status: 'unpaid', metadata: { organizationId: 'o1', plan: 'INSTITUTION' } }));
    expect(a.kind === 'planUpdated' && a.plan).toBeNull();
  });

  it('Abo gelöscht und Zahlung fehlgeschlagen', () => {
    expect(mapStripeEvent(ev('customer.subscription.deleted', { id: 'sub_9', status: 'canceled', customer: { id: 'cus_9' }, metadata: {} }))).toEqual({
      kind: 'planEnded',
      ref: { orgId: null, subscriptionId: 'sub_9', customerId: 'cus_9' },
      subscriptionId: 'sub_9',
    });
    expect(mapStripeEvent(ev('invoice.payment_failed', { customer: 'cus_9', parent: { subscription_details: { subscription: 'sub_9' } } }))).toEqual({
      kind: 'paymentFailed',
      ref: { orgId: null, subscriptionId: 'sub_9', customerId: 'cus_9' },
    });
  });

  it('Andere Ereignisse werden ignoriert', () => {
    expect(mapStripeEvent(ev('charge.succeeded', {})).kind).toBe('ignore');
  });
});
