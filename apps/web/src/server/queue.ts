import 'server-only';

import { PgBoss } from 'pg-boss';

import type { QueueName } from '@kardia/core';

import { env } from './env.ts';

/**
 * Web legt nur Jobs an; der Worker verarbeitet sie (PRD 10.1: pg-boss, kein Redis).
 * Für transaktionssichere Jobs innerhalb einer DB-Transaktion steht `sendInTx` bereit.
 */
const globalForBoss = globalThis as unknown as { kardiaBoss?: Promise<PgBoss> };

async function boss(): Promise<PgBoss> {
  globalForBoss.kardiaBoss ??= (async () => {
    const b = new PgBoss({ connectionString: env().DATABASE_URL, max: 3, schema: 'pgboss' });
    b.on('error', (error) => console.error('pg-boss', error));
    await b.start();
    return b;
  })();
  return globalForBoss.kardiaBoss;
}

export async function enqueue<T extends object>(
  queue: QueueName,
  data: T,
  options: { singletonKey?: string; startAfter?: Date | number; retryLimit?: number } = {},
): Promise<string | null> {
  if (process.env.KARDIA_QUEUE_DISABLED === '1') return null;
  const b = await boss();
  await b.createQueue(queue).catch(() => undefined);
  return b.send(queue, data, {
    retryLimit: options.retryLimit ?? 3,
    retryBackoff: true,
    ...(options.singletonKey ? { singletonKey: options.singletonKey } : {}),
    ...(options.startAfter !== undefined ? { startAfter: options.startAfter } : {}),
  });
}

/** Zustand und Ergebnis eines Jobs (z. B. KI-Import), für Polling aus der UI. */
export async function jobState(queue: QueueName, id: string): Promise<{ state: string; output: unknown } | null> {
  const b = await boss();
  const job = await b.getJobById(queue, id);
  return job ? { state: job.state, output: job.output ?? null } : null;
}
