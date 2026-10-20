import 'server-only';

import { db } from './db.ts';

import type { EventName } from '@kardia/core';
import type { Prisma } from '@kardia/db';


/** Audit-Log (PRD 6, 14.2): jede Admin-Aktion und jeder Zugriff auf Pass-Dokumente. */
export async function audit(entry: {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      ...(entry.before !== undefined ? { before: entry.before as Prisma.InputJsonValue } : {}),
      ...(entry.after !== undefined ? { after: entry.after as Prisma.InputJsonValue } : {}),
    },
  });
}

/** Ereignis für KPIs (PRD 3) – keine Drittanbieter-Tracker. */
export async function track(
  name: EventName,
  data: { userId?: string | null; orgId?: string | null; entityId?: string | null; props?: Record<string, unknown> } = {},
): Promise<void> {
  await db.event.create({
    data: {
      name,
      userId: data.userId ?? null,
      orgId: data.orgId ?? null,
      entityId: data.entityId ?? null,
      ...(data.props ? { props: data.props as Prisma.InputJsonValue } : {}),
    },
  });
}
