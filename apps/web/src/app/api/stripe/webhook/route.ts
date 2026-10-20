import { NextResponse } from 'next/server';

import { ProblemError } from '@kardia/core';

import { problemResponse } from '@/server/api';
import { handleStripeWebhook } from '@/server/services/billing';

/** Stripe-Webhook: roher Körper + Signatur (kein Rate Limit, Stripe wiederholt selbst). */
export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return problemResponse(new ProblemError('validation', 'Signatur fehlt.').toProblem('/api/stripe/webhook'));
  try {
    await handleStripeWebhook(await req.text(), signature);
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof ProblemError) return problemResponse(error.toProblem('/api/stripe/webhook'));
    console.error(error);
    return problemResponse(new ProblemError('validation', 'Ungültige Signatur oder unbekanntes Ereignis.').toProblem('/api/stripe/webhook'));
  }
}
