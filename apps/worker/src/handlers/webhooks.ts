import { QUEUES, WEBHOOK_MAX_ATTEMPTS, webhookBackoffSeconds } from '@kardia/core';
import { decryptField, signWebhook } from '@kardia/core/crypto';


import { db, enqueue, log } from '../context.ts';
import { classifyResponse, selectEndpoints, webhookBody } from '../lib/webhooks.ts';


/**
 * Webhooks (PRD 12.2): Zustellung durch den Worker, Signatur HMAC-SHA256 im Header
 * `Kardia-Signature`, bis zu 8 Versuche mit exponentiellem Abstand (1 min bis 2 h).
 */
export type WebhookJob = { orgId: string; event: string; payload: unknown } | { deliveryId: string };

export async function handleWebhook(job: WebhookJob): Promise<{ deliveries?: number; status?: string }> {
  if ('deliveryId' in job) return { status: await attempt(job.deliveryId) };
  const endpoints = await db().webhookEndpoint.findMany({ where: { organizationId: job.orgId, active: true } });
  const targets = selectEndpoints(endpoints, job.event);
  for (const ep of targets) {
    const d = await db().webhookDelivery.create({
      data: { endpointId: ep.id, event: job.event, payload: (job.payload ?? {}) },
    });
    await enqueue(QUEUES.webhookDeliver, { deliveryId: d.id }, { retryLimit: 0 });
  }
  return { deliveries: targets.length };
}

async function attempt(deliveryId: string): Promise<string> {
  const d = await db().webhookDelivery.findUnique({ where: { id: deliveryId }, include: { endpoint: true } });
  if (!d || d.deliveredAt) return 'done';
  if (!d.endpoint.active) return 'inactive';
  const body = webhookBody(d.event, d.payload, d.id, d.createdAt);
  let status = 0;
  try {
    const res = await fetch(d.endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kardia-Webhooks/1.0',
        'Kardia-Event': d.event,
        'Kardia-Delivery': d.id,
        'Kardia-Signature': signWebhook(decryptField(d.endpoint.secret), body),
      },
      body,
      signal: AbortSignal.timeout(10_000),
      redirect: 'manual',
    });
    status = res.status;
  } catch (error) {
    log.warn('Webhook nicht erreichbar', { deliveryId, error: (error as Error).message });
  }
  const attempts = d.attempts + 1;
  const outcome = status ? classifyResponse(status) : 'retry';
  if (outcome === 'delivered') {
    await db().webhookDelivery.update({ where: { id: d.id }, data: { attempts, lastStatus: status, deliveredAt: new Date(), nextAttempt: null } });
    return 'delivered';
  }
  if (outcome === 'gone') {
    await db().webhookEndpoint.update({ where: { id: d.endpointId }, data: { active: false } });
    await db().webhookDelivery.update({ where: { id: d.id }, data: { attempts, lastStatus: status, nextAttempt: null } });
    return 'gone';
  }
  if (attempts >= WEBHOOK_MAX_ATTEMPTS) {
    await db().webhookDelivery.update({ where: { id: d.id }, data: { attempts, lastStatus: status || null, nextAttempt: null } });
    return 'failed';
  }
  const delay = webhookBackoffSeconds(attempts);
  const next = new Date(Date.now() + delay * 1000);
  await db().webhookDelivery.update({ where: { id: d.id }, data: { attempts, lastStatus: status || null, nextAttempt: next } });
  await enqueue(QUEUES.webhookDeliver, { deliveryId: d.id }, { startAfter: next, retryLimit: 0 });
  return 'retry';
}
