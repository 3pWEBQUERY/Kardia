import 'server-only';

import { QUEUES } from '@kardia/core';
import { decryptField, decryptOptional } from '@kardia/core/crypto';

import { db } from '../db.ts';
import { enqueue } from '../queue.ts';

/** Rechte der Betroffenen (PRD 14.1): Export als JSON per Klick, Selbstlöschung. */
export async function exportMyData(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true, locale: true, createdAt: true, pushSubs: { select: { endpoint: true, createdAt: true } } },
  });
  const candidate = await db.candidateProfile.findUnique({
    where: { userId },
    include: {
      credentials: true,
      experiences: true,
      languages: true,
      trainingYears: true,
      applications: { include: { messages: true, job: { select: { title: true } } } },
      offers: { include: { organization: { select: { name: true } } } },
      savedJobs: true,
      savedSearches: true,
      blocks: true,
      poolMembers: true,
      recognition: true,
    },
  });
  const memberships = await db.orgMember.findMany({ where: { userId }, include: { organization: { select: { name: true } } } });
  return {
    exportedAt: new Date().toISOString(),
    user,
    memberships: memberships.map((m) => ({ organization: m.organization.name, role: m.role })),
    candidate: candidate
      ? {
          ...candidate,
          phone: decryptOptional(candidate.phone),
          credentials: candidate.credentials.map((c) => ({ ...c, registryNumber: decryptOptional(c.registryNumber) })),
          applications: candidate.applications.map((a) => ({ ...a, messages: a.messages.map((m) => ({ ...m, body: decryptField(m.body) })) })),
        }
      : null,
  };
}

/**
 * Selbstlöschung: Konto wird weich gelöscht (User.deletedAt), das Profil samt
 * Bewerbungen, Nachweisen und Dateien sofort entfernt; Sitzungen beendet.
 */
export async function deleteMyAccount(userId: string) {
  const candidate = await db.candidateProfile.findUnique({ where: { userId }, include: { credentials: { select: { fileId: true } } } });
  const fileIds = candidate?.credentials.map((c) => c.fileId).filter((x): x is string => !!x) ?? [];
  await db.$transaction(async (tx) => {
    if (candidate) await tx.candidateProfile.delete({ where: { id: candidate.id } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.passkey.deleteMany({ where: { userId } });
    await tx.pushSubscription.deleteMany({ where: { userId } });
    await tx.orgMember.deleteMany({ where: { userId } });
    await tx.user.update({ where: { id: userId }, data: { deletedAt: new Date(), email: `deleted+${userId}@kardia.invalid`, name: '' } });
  });
  for (const fileId of fileIds) await enqueue(QUEUES.retention, { deleteFileId: fileId });
}

export async function savePushSubscription(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  await db.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
}

export async function removePushSubscription(userId: string, endpoint: string) {
  await db.pushSubscription.deleteMany({ where: { userId, endpoint } });
}
