/**
 * Ereignisnamen für die Tabelle `Event` (PRD 3: alle KPIs aus eigenen Ereignissen,
 * keine Drittanbieter-Tracker) und für Webhooks (PRD 12.2).
 */
export const EVENTS = {
  searchPerformed: 'search.performed',
  jobViewed: 'job.viewed',
  jobPublished: 'job.published',
  jobClosed: 'job.closed',
  wardConfirmed: 'ward.confirmed',
  applicationCreated: 'application.created',
  applicationStatusChanged: 'application.status_changed',
  offerSent: 'offer.sent',
  offerResponded: 'offer.responded',
  shiftPublished: 'shift.published',
  shiftBooked: 'shift.booked',
  shiftCancelled: 'shift.cancelled',
  credentialReviewed: 'credential.reviewed',
  userActive: 'user.active',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

/** Ereignisse, die an Arbeitgeber-Webhooks gehen (R2). */
export const WEBHOOK_EVENTS = [
  EVENTS.applicationCreated,
  EVENTS.applicationStatusChanged,
  EVENTS.offerResponded,
  EVENTS.shiftBooked,
  EVENTS.shiftCancelled,
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/** Bis zu 8 Wiederholungen mit exponentiellem Abstand von 1 min bis 2 h. */
export const WEBHOOK_MAX_ATTEMPTS = 8;

export function webhookBackoffSeconds(attempt: number): number {
  return Math.min(7200, 60 * 2 ** Math.max(0, attempt - 1));
}

/** Pg-boss-Queues zwischen Web und Worker. */
export const QUEUES = {
  fileScan: 'file.scan',
  videoTranscode: 'video.transcode',
  commute: 'commute.compute',
  aiJobStructuring: 'ai.job-structuring',
  aiDocumentPrecheck: 'ai.document-precheck',
  aiModeration: 'ai.moderation',
  aiTeamSummary: 'ai.team-summary',
  aiTranslation: 'ai.translation',
  emailSend: 'email.send',
  pushSend: 'push.send',
  webhookDeliver: 'webhook.deliver',
  searchAlerts: 'search.alerts',
  orgCheck: 'org.check',
  feedImport: 'feed.import',
  // Zeitgesteuert
  staleProfiles: 'cron.stale-profiles',
  benchmarks: 'cron.benchmarks',
  retention: 'cron.retention',
  aiRawCleanup: 'cron.ai-raw-cleanup',
  offerExpiry: 'cron.offer-expiry',
  credentialExpiry: 'cron.credential-expiry',
  shiftReminders: 'cron.shift-reminders',
  backup: 'cron.backup',
  bucketReplication: 'cron.bucket-replication',
  aiCostAlarm: 'cron.ai-cost-alarm',
  feedSchedule: 'cron.feed-schedule',
  keyRotation: 'cron.key-rotation',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
