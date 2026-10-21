import 'server-only';

import {
  EVENTS,
  ProblemError,
  QUEUES,
  applicationInputSchema,
  canTransition,
  chatMessageSchema,
  parseOrThrow,
  passMatchScore,
  statusChangeSchema,
  type ApplicationInput,
  type StatusChange,
} from '@kardia/core';
import { decryptField, encryptField } from '@kardia/core/crypto';

import { track } from '../audit.ts';
import { db } from '../db.ts';
import { enqueue } from '../queue.ts';

import { notifyOrg, notifyUser } from './notifications.ts';

import type { OrgContext } from '../session.ts';


/**
 * Ein-Klick-Bewerbung (Modul D): Pass (verifizierte Felder) + optional 500 Zeichen.
 * Kein Motivationsschreiben-Zwang. Eine Bewerbung pro Fachperson und Stelle.
 */
export async function apply(userId: string, input: ApplicationInput) {
  const data = parseOrThrow(applicationInputSchema, input);
  const candidate = await db.candidateProfile.findUnique({ where: { userId } });
  if (!candidate) throw new ProblemError('conflict', 'Bitte zuerst den Qualifikations-Pass anlegen.');
  const job = await db.job.findUnique({ where: { id: data.jobId }, include: { ward: { include: { location: true } } } });
  if (job?.status !== 'PUBLISHED') throw new ProblemError('notFound', 'Diese Stelle ist nicht mehr ausgeschrieben.');
  const existing = await db.application.findUnique({ where: { jobId_candidateId: { jobId: job.id, candidateId: candidate.id } } });
  if (existing) throw new ProblemError('conflict', 'Sie haben sich auf diese Stelle bereits beworben.');
  const app = await db.application.create({
    data: { jobId: job.id, candidateId: candidate.id, message: data.message ?? null, documentsShared: data.shareDocuments, viaPass: true },
  });
  await track(EVENTS.applicationCreated, {
    userId,
    orgId: job.ward.location.organizationId,
    entityId: app.id,
    props: { viaPass: true, jobId: job.id },
  });
  await notifyOrg(job.ward.location.organizationId, 'application.status', { applicationId: app.id, jobTitle: job.title, status: 'NEW' });
  await enqueue(QUEUES.webhookDeliver, {
    orgId: job.ward.location.organizationId,
    event: EVENTS.applicationCreated,
    payload: { applicationId: app.id, jobId: job.id, createdAt: app.createdAt },
  });
  return app;
}

export async function listMyApplications(userId: string) {
  return db.application.findMany({
    where: { candidate: { userId } },
    include: {
      job: { include: { ward: { include: { location: { include: { organization: { select: { name: true } } } } } } } },
      _count: { select: { messages: true } },
    },
    orderBy: { statusChangedAt: 'desc' },
  });
}

export async function withdrawApplication(userId: string, applicationId: string) {
  const app = await db.application.findFirst({ where: { id: applicationId, candidate: { userId } } });
  if (!app) throw new ProblemError('notFound');
  if (app.status === 'HIRED' || app.status === 'WITHDRAWN') throw new ProblemError('conflict');
  return db.application.update({ where: { id: applicationId }, data: { status: 'WITHDRAWN', statusChangedAt: new Date() } });
}

/** AK-D1 nachträglich: Freigabe der Originaldokumente pro Bewerbung (widerrufbar). */
export async function setDocumentsShared(userId: string, applicationId: string, shared: boolean) {
  const app = await db.application.findFirst({ where: { id: applicationId, candidate: { userId } } });
  if (!app) throw new ProblemError('notFound');
  return db.application.update({ where: { id: applicationId }, data: { documentsShared: shared } });
}

/** Pipeline einer Stelle; Bewerbende sehen Arbeitgeber mit Pass-Status, Originaldokumente nur mit Freigabe. */
export async function pipelineForJob(ctx: OrgContext, jobId: string) {
  const job = await db.job.findFirst({
    where: { id: jobId, ward: { location: { organizationId: ctx.org.id } } },
    include: { ward: true },
  });
  if (!job) throw new ProblemError('notFound');
  const apps = await db.application.findMany({
    where: { jobId, status: { not: 'WITHDRAWN' } },
    include: {
      candidate: { include: { credentials: { select: { type: true, status: true } }, experiences: true, languages: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  return {
    job,
    applications: apps.map((a) => ({
      id: a.id,
      status: a.status,
      createdAt: a.createdAt,
      statusChangedAt: a.statusChangedAt,
      documentsShared: a.documentsShared,
      name: `${a.candidate.firstName} ${a.candidate.lastName.slice(0, 1)}.`,
      profession: a.candidate.profession,
      verifiedCount: a.candidate.credentials.filter((c) => c.status === 'VERIFIED').length,
      pendingCount: a.candidate.credentials.filter((c) => c.status === 'SUBMITTED' || c.status === 'IN_REVIEW').length,
      match: passMatchScore({
        candidate: a.candidate,
        job: { profession: job.profession, department: job.ward.department, allowsPendingRecog: job.allowsPendingRecog },
      }),
    })),
  };
}

export async function getApplicationForOrg(ctx: OrgContext, applicationId: string) {
  const app = await db.application.findFirst({
    where: { id: applicationId, job: { ward: { location: { organizationId: ctx.org.id } } } },
    include: {
      job: { include: { ward: true } },
      candidate: {
        include: {
          credentials: { orderBy: { createdAt: 'desc' } },
          experiences: true,
          languages: true,
          user: { select: { email: true } },
        },
      },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!app) throw new ProblemError('notFound');
  return {
    ...app,
    messages: app.messages.map((m) => ({ ...m, body: decryptField(m.body) })),
    candidate: {
      ...app.candidate,
      phone: null,
      // Registernummern und Dokumente nur mit Freigabe (AK-D1).
      credentials: app.candidate.credentials.map((c) => ({
        ...c,
        registryNumber: null,
        fileId: app.documentsShared ? c.fileId : null,
      })),
    },
  };
}

export async function changeStatus(ctx: OrgContext, applicationId: string, input: StatusChange) {
  const change = parseOrThrow(statusChangeSchema, input);
  const app = await db.application.findFirst({
    where: { id: applicationId, job: { ward: { location: { organizationId: ctx.org.id } } } },
    include: { candidate: true, job: true },
  });
  if (!app) throw new ProblemError('notFound');
  if (!canTransition(app.status, change.status)) throw new ProblemError('conflict', 'Dieser Statuswechsel ist nicht möglich.');
  const updated = await db.application.update({
    where: { id: applicationId },
    data: {
      status: change.status,
      rejectionReason: change.status === 'REJECTED' ? (change.rejectionReason ?? 'OTHER') : null,
      statusChangedAt: new Date(),
    },
  });
  await track(EVENTS.applicationStatusChanged, {
    userId: ctx.user.id,
    orgId: ctx.org.id,
    entityId: applicationId,
    props: { from: app.status, to: change.status, jobPublishedAt: app.job.publishedAt },
  });
  // Fachperson erhält den Status sofort (PRD 6, Pipeline).
  await notifyUser(app.candidate.userId, 'application.status', { applicationId, jobTitle: app.job.title, status: change.status });
  await enqueue(QUEUES.webhookDeliver, {
    orgId: ctx.org.id,
    event: EVENTS.applicationStatusChanged,
    payload: { applicationId, from: app.status, to: change.status },
  });
  return updated;
}

/** Chat im Bewerbungs-Thread; Texte verschlüsselt (PRD 14.1). */
export async function postMessage(
  sender: { userId: string; orgCtx?: OrgContext },
  applicationId: string,
  input: { body: string },
) {
  const { body } = parseOrThrow(chatMessageSchema, input);
  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: { candidate: true, job: { include: { ward: { include: { location: true } } } } },
  });
  if (!app) throw new ProblemError('notFound');
  const isCandidate = app.candidate.userId === sender.userId;
  const isEmployer = sender.orgCtx?.org.id === app.job.ward.location.organizationId;
  if (!isCandidate && !isEmployer) throw new ProblemError('forbidden');
  const msg = await db.message.create({ data: { applicationId, senderUserId: sender.userId, body: encryptField(body) } });
  if (isEmployer) await notifyUser(app.candidate.userId, 'application.message', { applicationId, jobTitle: app.job.title });
  else await notifyOrg(app.job.ward.location.organizationId, 'application.message', { applicationId, jobTitle: app.job.title });
  return { ...msg, body };
}

/**
 * Gelesen-Markierung (PRD 13.2): markiert alle Nachrichten der Gegenseite im Thread als
 * gelesen. Aufruf beim Öffnen des Threads – durch die Fachperson oder den Arbeitgeber.
 * Zugriffsprüfung liegt beim Aufrufer (getMyApplication / getApplicationForOrg).
 */
export async function markMessagesRead(applicationId: string, readerUserId: string): Promise<number> {
  const res = await db.message.updateMany({
    where: { applicationId, readAt: null, senderUserId: { not: readerUserId } },
    data: { readAt: new Date() },
  });
  return res.count;
}

export async function getMyApplication(userId: string, applicationId: string) {
  const app = await db.application.findFirst({
    where: { id: applicationId, candidate: { userId } },
    include: {
      job: { include: { ward: { include: { location: { include: { organization: { select: { name: true } } } } } } } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!app) throw new ProblemError('notFound');
  return { ...app, messages: app.messages.map((m) => ({ ...m, body: decryptField(m.body), mine: m.senderUserId === userId })) };
}

/**
 * Arbeitgeberseite: nur Nachrichten der Fachperson als gelesen markieren. Nachrichten
 * von Kolleginnen derselben Organisation bleiben ungelesen, bis die Fachperson sie sieht.
 */
export async function markCandidateMessagesRead(applicationId: string, candidateUserId: string): Promise<number> {
  const res = await db.message.updateMany({
    where: { applicationId, readAt: null, senderUserId: candidateUserId },
    data: { readAt: new Date() },
  });
  return res.count;
}
