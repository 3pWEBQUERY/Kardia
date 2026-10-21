import { PgBoss } from 'pg-boss';

import { QUEUES, type QueueName } from '@kardia/core';

import { db, log, setEnqueue } from './context.ts';
import { config } from './env.ts';
import { handleJobStructuring, handleDocumentPrecheck, handleModeration, handleTeamSummary, handleTranslation } from './handlers/ai.ts';
import { handleSearchAlerts } from './handlers/alerts.ts';
import { handleBackup, handleBucketReplication } from './handlers/backup.ts';
import { handleBenchmarks } from './handlers/benchmarks.ts';
import { handleCommute } from './handlers/commute.ts';
import { handleAiCostAlarm, handleCredentialExpiry, handleOfferExpiry, handleShiftReminders, handleStaleProfiles } from './handlers/cron.ts';
import { handleFeedImport, handleFeedSchedule } from './handlers/feeds.ts';
import { handleFileScan } from './handlers/files.ts';
import { handleKeyRotation } from './handlers/keys.ts';
import { handleEmail, handlePush } from './handlers/notify.ts';
import { handleOrgCheck } from './handlers/org.ts';
import { handlePlanExpiry } from './handlers/plans.ts';
import { handleAiRawCleanup, handleRetention } from './handlers/retention.ts';
import { handleVideoTranscode } from './handlers/video.ts';
import { handleWebhook } from './handlers/webhooks.ts';
import { ensureBucketCors } from './lib/s3.ts';

import type * as SentryNs from '@sentry/node';

/**
 * Worker-Dienst (PRD 10.2): gleicher Code-Stand wie Web, 1 Replika, skaliert über
 * die pg-boss-Konkurrenz. Postgres trägt die Job-Queue – kein Redis.
 */

type Handler = (data: never) => Promise<unknown>;

interface Registration {
  handler: Handler;
  /** Parallele Jobs pro Prozess; teure Jobs laufen einzeln. */
  concurrency?: number;
  /** Cron in Schweizer Zeit. */
  cron?: string;
}

const REGISTRY: Record<QueueName, Registration> = {
  [QUEUES.fileScan]: { handler: handleFileScan },
  [QUEUES.videoTranscode]: { handler: handleVideoTranscode, concurrency: 1 },
  [QUEUES.commute]: { handler: handleCommute },
  [QUEUES.aiJobStructuring]: { handler: handleJobStructuring },
  [QUEUES.aiDocumentPrecheck]: { handler: handleDocumentPrecheck },
  [QUEUES.aiModeration]: { handler: handleModeration },
  [QUEUES.aiTeamSummary]: { handler: handleTeamSummary, concurrency: 1 },
  [QUEUES.aiTranslation]: { handler: handleTranslation },
  [QUEUES.emailSend]: { handler: handleEmail },
  [QUEUES.pushSend]: { handler: handlePush },
  [QUEUES.webhookDeliver]: { handler: handleWebhook },
  [QUEUES.searchAlerts]: { handler: (() => handleSearchAlerts()), concurrency: 1, cron: '13 * * * *' },
  [QUEUES.orgCheck]: { handler: handleOrgCheck },
  [QUEUES.feedImport]: { handler: handleFeedImport, concurrency: 2 },
  [QUEUES.staleProfiles]: { handler: (() => handleStaleProfiles()), concurrency: 1, cron: '7 6 * * *' },
  [QUEUES.benchmarks]: { handler: (() => handleBenchmarks()), concurrency: 1, cron: '23 3 * * *' },
  [QUEUES.retention]: { handler: ((data: { deleteFileId?: string } | null) => handleRetention(data)), concurrency: 1, cron: '41 2 * * *' },
  [QUEUES.aiRawCleanup]: { handler: (() => handleAiRawCleanup()), concurrency: 1, cron: '11 2 * * *' },
  [QUEUES.offerExpiry]: { handler: (() => handleOfferExpiry()), concurrency: 1, cron: '*/15 * * * *' },
  [QUEUES.credentialExpiry]: { handler: (() => handleCredentialExpiry()), concurrency: 1, cron: '5 1 * * *' },
  [QUEUES.planExpiry]: { handler: (() => handlePlanExpiry()), concurrency: 1, cron: '20 7 * * *' },
  [QUEUES.shiftReminders]: { handler: (() => handleShiftReminders()), concurrency: 1, cron: '*/15 * * * *' },
  [QUEUES.backup]: { handler: (() => handleBackup()), concurrency: 1, cron: '17 1 * * *' },
  [QUEUES.bucketReplication]: { handler: (() => handleBucketReplication()), concurrency: 1, cron: '47 1 * * *' },
  [QUEUES.aiCostAlarm]: { handler: (() => handleAiCostAlarm()), concurrency: 1, cron: '*/30 * * * *' },
  [QUEUES.feedSchedule]: { handler: (() => handleFeedSchedule()), concurrency: 1, cron: '3 * * * *' },
  [QUEUES.keyRotation]: { handler: (() => handleKeyRotation()), concurrency: 1, cron: '29 4 * * 0' },
};

let sentry: typeof SentryNs | undefined;

async function initSentry(): Promise<void> {
  if (!config.sentryDsn) return;
  sentry = await import('@sentry/node');
  sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    // Personendaten nie mitsenden (PRD 12.4: Scrubbing aktiv).
    beforeSend(event) {
      delete event.user;
      if (event.extra) delete event.extra.data;
      return event;
    },
  });
}

async function main(): Promise<void> {
  if (!config.databaseUrl) throw new Error('DATABASE_URL ist nicht gesetzt.');
  await initSentry();
  const boss = new PgBoss({ connectionString: config.databaseUrl, schema: 'pgboss', max: config.concurrency + 4 });
  boss.on('error', (error) => {
    log.error('pg-boss', { error: error.message });
    sentry?.captureException(error);
  });
  await boss.start();

  const created = new Set<string>();
  const ensureQueue = async (name: string) => {
    if (created.has(name)) return;
    await boss.createQueue(name).catch(() => undefined);
    created.add(name);
  };

  setEnqueue(async (queue, data, options = {}) => {
    await ensureQueue(queue);
    return boss.send(queue, data, {
      retryLimit: options.retryLimit ?? 3,
      retryBackoff: true,
      ...(options.singletonKey ? { singletonKey: options.singletonKey } : {}),
      ...(options.startAfter !== undefined ? { startAfter: options.startAfter } : {}),
    });
  });

  for (const [name, reg] of Object.entries(REGISTRY) as [QueueName, Registration][]) {
    await ensureQueue(name);
    await boss.work<unknown>(name, { localConcurrency: reg.concurrency ?? config.concurrency, batchSize: 1 }, async (jobs) => {
      const job = jobs[0];
      if (!job) return null;
      const started = Date.now();
      try {
        const output = await reg.handler(job.data as never);
        log.info('Job erledigt', { queue: name, id: job.id, ms: Date.now() - started });
        return output;
      } catch (error) {
        log.error('Job fehlgeschlagen', { queue: name, id: job.id, retry: job.retryCount, error: (error as Error).message });
        sentry?.captureException(error, { tags: { queue: name } });
        throw error;
      }
    });
    if (reg.cron) await boss.schedule(name, reg.cron, null, { tz: 'Europe/Zurich' });
  }
  await ensureBucketCors().catch((error: unknown) => log.warn('Bucket-CORS nicht gesetzt', { error: String(error) }));
  log.info('Worker gestartet', { queues: Object.keys(REGISTRY).length, concurrency: config.concurrency, env: config.nodeEnv });

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    log.info('Worker stoppt', { signal });
    await boss.stop({ graceful: true, timeout: 30_000 });
    await db().$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  log.error('Worker-Start fehlgeschlagen', { error: (error as Error).message });
  process.exit(1);
});
