import webpush from 'web-push';

import { db, log } from '../context.ts';
import { config } from '../env.ts';

/** Web Push mit VAPID (PRD 13.3). Abgelaufene Abos (404/410) werden gelöscht. */
let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  if (!config.vapid.publicKey || !config.vapid.privateKey) return false;
  webpush.setVapidDetails(config.vapid.subject, config.vapid.publicKey, config.vapid.privateKey);
  configured = true;
  return true;
}

export interface PushMessage {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export async function pushToUser(userId: string, message: PushMessage): Promise<number> {
  if (!ensureConfigured()) {
    log.info('Push (ohne VAPID, nicht versendet)', { userId, title: message.title });
    return 0;
  }
  const subs = await db().pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(message),
        { TTL: 24 * 3600, urgency: 'normal' },
      );
      sent++;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await db().pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
      else log.warn('Push fehlgeschlagen', { status, endpoint: sub.endpoint.slice(0, 40) });
    }
  }
  return sent;
}
