import 'server-only';

import { QUEUES } from '@kardia/core';

import { enqueue } from '../queue.ts';

/**
 * Benachrichtigungen (PRD 13.3): E-Mail über SES und Web Push über VAPID, beides im
 * Worker. Ereignisse: Suchtreffer, Statusänderung, neues Angebot, neue Pool-Schicht,
 * Schicht-Erinnerung. Inhalte enthalten nie Pass-Dokumente.
 */
export type NotificationKind =
  | 'application.status'
  | 'application.message'
  | 'offer.new'
  | 'offer.responded'
  | 'offer.withdrawn'
  | 'shift.new'
  | 'shift.booked'
  | 'shift.cancelled'
  | 'credential.reviewed'
  | 'org.invite'
  | 'employee.invite'
  | 'pool.invite';

export async function notifyUser(userId: string, kind: NotificationKind, data: Record<string, unknown>): Promise<void> {
  await enqueue(QUEUES.emailSend, { template: kind, userId, data });
  await enqueue(QUEUES.pushSend, { kind, userId, data });
}

export async function notifyEmail(to: string, kind: NotificationKind, data: Record<string, unknown>): Promise<void> {
  await enqueue(QUEUES.emailSend, { template: kind, to, data });
}

export async function notifyOrg(orgId: string, kind: NotificationKind, data: Record<string, unknown>): Promise<void> {
  await enqueue(QUEUES.emailSend, { template: kind, orgId, data });
}
