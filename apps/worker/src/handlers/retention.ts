import { QUEUES, RETENTION, daysAgo, monthsAgo } from '@kardia/core';
import { Prisma } from '@kardia/db';

import { db, enqueue, log } from '../context.ts';
import { deleteObject } from '../lib/s3.ts';

/**
 * Aufbewahrung (PRD 14.1):
 *  - Bewerbung inkl. Nachrichten: 6 Monate nach Abschluss der Stelle
 *  - inaktives Fachpersonen-Konto: nach 24 Monaten, Ankündigung 30 Tage vorher
 *  - Pass-Dokumente: sofort mit Löschung des Nachweises oder Kontos (`deleteFileId`)
 *  - Audit-Log: Admin-Aktionen 10 Jahre, sonst 2 Jahre
 */
export async function deleteFile(fileId: string): Promise<boolean> {
  const file = await db().file.findUnique({ where: { id: fileId } });
  if (!file) return false;
  await deleteObject(file.bucketKey).catch((e: unknown) => log.warn('Objekt nicht gelöscht', { key: file.bucketKey, error: String(e) }));
  await db().credential.updateMany({ where: { fileId }, data: { fileId: null } });
  await db().file.delete({ where: { id: fileId } });
  return true;
}

async function deleteCandidateAccount(userId: string): Promise<void> {
  const candidate = await db().candidateProfile.findUnique({ where: { userId }, include: { credentials: { select: { fileId: true } } } });
  const fileIds = candidate?.credentials.map((c) => c.fileId).filter((x): x is string => !!x) ?? [];
  await db().$transaction(async (tx) => {
    if (candidate) await tx.candidateProfile.delete({ where: { id: candidate.id } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.passkey.deleteMany({ where: { userId } });
    await tx.pushSubscription.deleteMany({ where: { userId } });
    await tx.user.update({ where: { id: userId }, data: { deletedAt: new Date(), email: `deleted+${userId}@kardia.invalid`, name: '' } });
  });
  for (const id of fileIds) await deleteFile(id);
}

export async function handleRetention(job: { deleteFileId?: string } | null): Promise<Record<string, number>> {
  if (job?.deleteFileId) return { files: (await deleteFile(job.deleteFileId)) ? 1 : 0 };
  const now = new Date();

  const apps = await db().application.deleteMany({
    where: { job: { status: 'CLOSED', updatedAt: { lt: monthsAgo(RETENTION.applicationMonthsAfterClose, now) } } },
  });

  // Ankündigung 30 Tage vor Ablauf der 24 Monate.
  const noticeBefore = new Date(monthsAgo(RETENTION.inactiveAccountMonths, now).getTime() + RETENTION.inactiveAccountNoticeDays * 86400_000);
  const toNotify = await db().user.findMany({
    where: { deletedAt: null, isAdmin: false, candidate: { isNot: null }, memberships: { none: {} }, lastActiveAt: { lt: noticeBefore } },
    select: { id: true, lastActiveAt: true },
    take: 500,
  });
  let notified = 0;
  let deleted = 0;
  for (const u of toNotify) {
    const notice = await db().event.findFirst({ where: { name: 'account.inactive_notice', userId: u.id, createdAt: { gt: u.lastActiveAt } } });
    if (!notice) {
      const deleteOn = new Date(u.lastActiveAt);
      deleteOn.setUTCMonth(deleteOn.getUTCMonth() + RETENTION.inactiveAccountMonths);
      await enqueue(QUEUES.emailSend, { template: 'account.inactive-notice', userId: u.id, data: { deleteOn: deleteOn.toISOString() } });
      await db().event.create({ data: { name: 'account.inactive_notice', userId: u.id } });
      notified++;
    } else if (u.lastActiveAt < monthsAgo(RETENTION.inactiveAccountMonths, now) && notice.createdAt < daysAgo(RETENTION.inactiveAccountNoticeDays, now)) {
      await deleteCandidateAccount(u.id);
      deleted++;
    }
  }

  const auditOther = await db().auditLog.deleteMany({
    where: { createdAt: { lt: monthsAgo(RETENTION.auditOtherYears * 12, now) }, actor: { isAdmin: false } },
  });
  const auditAdmin = await db().auditLog.deleteMany({
    where: { createdAt: { lt: monthsAgo(RETENTION.auditAdminYears * 12, now) } },
  });

  // Nie hochgeladene Dateien (Upload-URL nach 10 min abgelaufen) aufräumen.
  const stale = await db().file.findMany({ where: { status: 'UPLOADING', createdAt: { lt: daysAgo(1, now) } }, select: { id: true } });
  for (const f of stale) await deleteFile(f.id);

  return { applications: apps.count, notified, deleted, audit: auditOther.count + auditAdmin.count, staleUploads: stale.length };
}

/** KI-Rohtexte nach 30 Tagen leeren (PRD 9.2). */
export async function handleAiRawCleanup(): Promise<{ cleared: number }> {
  const res = await db().aiRun.updateMany({
    where: { createdAt: { lt: daysAgo(RETENTION.aiRawDays) }, OR: [{ rawInput: { not: null } }, { NOT: { rawOutput: { equals: Prisma.DbNull } } }] },
    data: { rawInput: null, rawOutput: Prisma.DbNull },
  });
  return { cleared: res.count };
}
