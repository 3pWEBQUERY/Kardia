import 'server-only';

import {
  MAX_VIDEOS_PER_WARD,
  MAX_VIDEO_SECONDS,
  ProblemError,
  QUEUES,
  emailMatchesDomains,
  parseOrThrow,
  realityVoteSchema,
  teamAnswerSchema,
  teamQuestionSchema,
  type RealityVote,
} from '@kardia/core';
import { randomToken, sha256Hex, voterHash } from '@kardia/core/crypto';

import { db } from '../db.ts';
import { env } from '../env.ts';
import { enqueue } from '../queue.ts';


import { notifyEmail } from './notifications.ts';
import { assertWardInOrg } from './wards.ts';

import type { OrgContext } from '../session.ts';

/**
 * Team-Einblicke & Realitäts-Check (Modul G). Verifizierte Mitarbeitende bestätigen
 * oder widersprechen Feldern; gespeichert wird nur ein HMAC der Person (AK-G1).
 * Arbeitgeber können Werte weder löschen noch ausblenden (AK-G2).
 */

/** Verifizierung per E-Mail an eine Domain der Institution (Konto-E-Mail ist bereits bestätigt). */
export async function verifyByEmailDomain(user: { id: string; email: string }, wardId: string) {
  const ward = await db.ward.findUnique({ where: { id: wardId }, include: { location: { include: { organization: true } } } });
  if (!ward) throw new ProblemError('notFound');
  if (!emailMatchesDomains(user.email, ward.location.organization.emailDomains)) {
    throw new ProblemError('forbidden', 'Ihre E-Mail-Adresse gehört nicht zu dieser Institution. Bitten Sie den Arbeitgeber um eine Einladung.');
  }
  return db.verifiedEmployee.upsert({
    where: { wardId_userId: { wardId, userId: user.id } },
    create: { wardId, userId: user.id, method: 'EMAIL_DOMAIN' },
    update: {},
  });
}

/** Einladung durch den Arbeitgeber (wird als "vom Arbeitgeber eingeladen" gekennzeichnet). */
export async function inviteEmployee(ctx: OrgContext, wardId: string, email: string) {
  await assertWardInOrg(wardId, ctx.org.id);
  const token = randomToken();
  await db.inviteToken.create({
    data: {
      kind: 'EMPLOYEE',
      organizationId: ctx.org.id,
      email: email.toLowerCase(),
      wardId,
      tokenHash: sha256Hex(token),
      expiresAt: new Date(Date.now() + 30 * 86400_000),
      createdById: ctx.user.id,
    },
  });
  await notifyEmail(email, 'employee.invite', { orgName: ctx.org.name, url: `${env().APP_ORIGIN}/invite/${token}` });
}

export async function isVerifiedEmployee(userId: string, wardId: string) {
  return db.verifiedEmployee.findUnique({ where: { wardId_userId: { wardId, userId } } });
}

export async function castRealityVote(userId: string, wardId: string, input: RealityVote) {
  const vote = parseOrThrow(realityVoteSchema, input);
  if (!(await isVerifiedEmployee(userId, wardId))) throw new ProblemError('forbidden', 'Nur verifizierte Mitarbeitende dieser Station können abstimmen.');
  const hash = voterHash(userId, wardId);
  const saved = await db.realityCheck.upsert({
    where: { wardId_field_voterHash: { wardId, field: vote.field, voterHash: hash } },
    create: {
      wardId,
      field: vote.field,
      agrees: vote.agrees,
      proposedValue: vote.agrees ? null : (vote.proposedValue ?? null),
      comment: vote.comment ?? null,
      voterHash: hash,
    },
    update: {
      agrees: vote.agrees,
      proposedValue: vote.agrees ? null : (vote.proposedValue ?? null),
      comment: vote.comment ?? null,
      // Neuer Zeitstempel bewusst nicht gesetzt: kein Rückschluss auf Aktivität.
    },
  });
  if (vote.comment) {
    await enqueue(QUEUES.aiModeration, { entity: 'RealityCheck', entityId: saved.id });
    await enqueue(QUEUES.aiTeamSummary, { wardId, field: vote.field }, { singletonKey: `${wardId}:${vote.field}`, startAfter: 300 });
  }
}

export async function myVotes(userId: string, wardId: string) {
  return db.realityCheck.findMany({ where: { wardId, voterHash: voterHash(userId, wardId) } });
}

export async function askTeam(userId: string, wardId: string, input: { body: string }) {
  const { body } = parseOrThrow(teamQuestionSchema, input);
  const ward = await db.ward.findUnique({ where: { id: wardId } });
  if (!ward) throw new ProblemError('notFound');
  const q = await db.teamQuestion.create({ data: { wardId, askedById: userId, body } });
  await enqueue(QUEUES.aiModeration, { entity: 'TeamQuestion', entityId: q.id });
  return q;
}

/** Antworten nur durch freiwillige Stations-Botschafter:innen; öffentlich nach Moderation. */
export async function answerQuestion(userId: string, questionId: string, input: { answer: string }) {
  const { answer } = parseOrThrow(teamAnswerSchema, input);
  const q = await db.teamQuestion.findUnique({ where: { id: questionId } });
  if (!q) throw new ProblemError('notFound');
  const ambassador = await db.wardAmbassador.findUnique({ where: { wardId_userId: { wardId: q.wardId, userId } } });
  if (!ambassador) throw new ProblemError('forbidden', 'Nur Stations-Botschafter:innen beantworten Fragen.');
  const updated = await db.teamQuestion.update({
    where: { id: questionId },
    data: { answer, answeredAt: new Date(), moderation: 'PENDING' },
  });
  await enqueue(QUEUES.aiModeration, { entity: 'TeamQuestion', entityId: q.id });
  return updated;
}

export async function setAmbassador(userId: string, wardId: string, on: boolean) {
  if (!(await isVerifiedEmployee(userId, wardId))) throw new ProblemError('forbidden');
  if (on) await db.wardAmbassador.upsert({ where: { wardId_userId: { wardId, userId } }, create: { wardId, userId }, update: {} });
  else await db.wardAmbassador.deleteMany({ where: { wardId, userId } });
}

export async function openQuestionsForAmbassador(userId: string) {
  const wards = await db.wardAmbassador.findMany({ where: { userId }, select: { wardId: true } });
  return db.teamQuestion.findMany({
    where: { wardId: { in: wards.map((w) => w.wardId) }, answer: null, moderation: { not: 'REJECTED' } },
    include: { ward: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

/** Stationsvideos: max. 60 s, max. 5 pro Station, Untertitel (WebVTT) Pflicht (AK-G3). */
export async function addWardVideo(ctx: OrgContext, wardId: string, input: { fileId: string; captionsId: string; durationSec: number }) {
  await assertWardInOrg(wardId, ctx.org.id);
  const count = await db.wardVideo.count({ where: { wardId, moderation: { not: 'REJECTED' } } });
  if (count >= MAX_VIDEOS_PER_WARD) throw new ProblemError('conflict', `Höchstens ${MAX_VIDEOS_PER_WARD} Videos pro Station.`);
  if (input.durationSec > MAX_VIDEO_SECONDS) throw new ProblemError('validation', `Videos dürfen höchstens ${MAX_VIDEO_SECONDS} Sekunden lang sein.`);
  const [file, captions] = await Promise.all([
    db.file.findFirst({ where: { id: input.fileId, ownerId: ctx.user.id, bucketKey: { startsWith: 'video/' } } }),
    db.file.findFirst({ where: { id: input.captionsId, ownerId: ctx.user.id, mimeType: 'text/vtt' } }),
  ]);
  if (!file) throw new ProblemError('validation', 'Video nicht gefunden.');
  if (!captions) throw new ProblemError('validation', 'Ohne Untertitel-Datei (WebVTT) kann ein Video nicht veröffentlicht werden.');
  const video = await db.wardVideo.create({
    data: { wardId, fileId: file.id, captionsId: captions.id, durationSec: input.durationSec },
  });
  await enqueue(QUEUES.videoTranscode, { videoId: video.id });
  return video;
}

export async function reportContent(reporterId: string | null, entity: 'TeamQuestion' | 'RealityCheck' | 'WardVideo', entityId: string, reason: string) {
  return db.contentReport.create({ data: { entity, entityId, reason: reason.slice(0, 400), reporterId } });
}
