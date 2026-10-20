import type { Instrumentation } from 'next';

/**
 * Sentry in der EU-Datenregion (PRD 10.1, 12.4): Stacktraces ohne Personendaten.
 * Nur aktiv, wenn SENTRY_DSN gesetzt ist.
 */
export async function register(): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  const { scrubEvent } = await import('./lib/sentryScrub.ts');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV,
    release: process.env.RAILWAY_GIT_COMMIT_SHA,
    tracesSampleRate: 0.05,
    beforeSend: scrubEvent,
  });
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...args);
};
