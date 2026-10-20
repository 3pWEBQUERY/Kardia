import 'server-only';

import {
  EVENTS,
  REVIEW_SLA_BUSINESS_DAYS,
  ProblemError,
  QUEUES,
  businessDaysBetween,
  missingRequiredFields,
  parseOrThrow,
  passMatchScore,
  recognitionGuideSchema,
  resolveJobProfile,
  type PartialWardProfile,
} from '@kardia/core';
import { decryptOptional } from '@kardia/core/crypto';
import type { ModerationStatus, OrgVerification, Prisma } from '@kardia/db';

import { audit, track } from '../audit.ts';
import { db } from '../db.ts';
import { enqueue } from '../queue.ts';
import type { CurrentSession } from '../session.ts';

import { notifyOrg, notifyUser } from './notifications.ts';

/** Admin-Konsole (PRD 6): Prüfqueues, Moderation, Redaktion, Audit-Log, KPIs. Jede Aktion im Audit-Log. */

export async function credentialQueue() {
  const items = await db.credential.findMany({
    where: { status: { in: ['SUBMITTED', 'IN_REVIEW'] } },
    include: { candidate: { select: { firstName: true, lastName: true, profession: true } }, file: { select: { id: true, status: true, mimeType: true } } },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });
  const now = new Date();
  return items.map((c) => ({ ...c, ageBusinessDays: businessDaysBetween(c.createdAt, now), overdue: businessDaysBetween(c.createdAt, now) > REVIEW_SLA_BUSINESS_DAYS }));
}

export async function credentialDetail(s: CurrentSession, id: string) {
  const c = await db.credential.findUnique({
    where: { id },
    include: { candidate: { select: { firstName: true, lastName: true, profession: true, userId: true } }, file: true },
  });
  if (!c) throw new ProblemError('notFound');
  // Ansicht der Registernummer ist ein Zugriff auf Pass-Daten → Audit.
  await audit({ actorId: s.user.id, action: 'credential.view', entity: 'Credential', entityId: id });
  const precheck = await db.event.findFirst({ where: { name: 'credential.precheck', entityId: id }, orderBy: { createdAt: 'desc' } });
  return { ...c, registryNumber: decryptOptional(c.registryNumber), precheck: precheck?.props ?? null };
}

export async function claimCredential(s: CurrentSession, id: string) {
  const before = await db.credential.findUniqueOrThrow({ where: { id } });
  if (before.status !== 'SUBMITTED') return before;
  const after = await db.credential.update({ where: { id }, data: { status: 'IN_REVIEW', reviewedById: s.user.id } });
  await audit({ actorId: s.user.id, action: 'credential.claim', entity: 'Credential', entityId: id, before: { status: before.status }, after: { status: after.status } });
  return after;
}

/** Entscheid immer durch einen Menschen, mit Grund bei Ablehnung (PRD 9.4). */
export async function decideCredential(s: CurrentSession, id: string, decision: { verified: boolean; reason?: string }) {
  if (!decision.verified && !decision.reason?.trim()) throw new ProblemError('validation', 'Eine Ablehnung braucht einen Grund.');
  const before = await db.credential.findUniqueOrThrow({ where: { id }, include: { candidate: true } });
  const after = await db.credential.update({
    where: { id },
    data: {
      status: decision.verified ? 'VERIFIED' : 'REJECTED',
      rejectReason: decision.verified ? null : (decision.reason?.trim() ?? null),
      reviewedById: s.user.id,
      reviewedAt: new Date(),
    },
  });
  await audit({
    actorId: s.user.id,
    action: decision.verified ? 'credential.verify' : 'credential.reject',
    entity: 'Credential',
    entityId: id,
    before: { status: before.status },
    after: { status: after.status, rejectReason: after.rejectReason },
  });
  await track(EVENTS.credentialReviewed, { userId: s.user.id, entityId: id, props: { verified: decision.verified, submittedAt: before.createdAt } });
  await notifyUser(before.candidate.userId, 'credential.reviewed', { credentialId: id, title: before.title, verified: decision.verified, reason: after.rejectReason });
  return after;
}

export async function organizationQueue() {
  return db.organization.findMany({
    where: { verification: { in: ['PENDING', 'AGENCY_REVIEW'] } },
    include: { members: { include: { user: { select: { email: true } } } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function listOrganizations() {
  return db.organization.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { members: true, locations: true } } } });
}

/** AK-C1: SECO-Treffer werden manuell freigegeben (oder abgelehnt). */
export async function decideOrganization(s: CurrentSession, id: string, verification: OrgVerification, note?: string) {
  const before = await db.organization.findUniqueOrThrow({ where: { id } });
  const after = await db.organization.update({ where: { id }, data: { verification } });
  await audit({ actorId: s.user.id, action: 'organization.verification', entity: 'Organization', entityId: id, before: { verification: before.verification }, after: { verification, note: note ?? null } });
  await notifyOrg(id, 'org.invite', { verification });
  return after;
}

export async function moderationQueue() {
  const [questions, comments, videos, reports] = await Promise.all([
    db.teamQuestion.findMany({ where: { moderation: 'PENDING' }, include: { ward: { select: { name: true } } }, orderBy: { createdAt: 'asc' } }),
    db.realityCheck.findMany({ where: { comment: { not: null } }, orderBy: { createdAt: 'desc' }, take: 100, include: { ward: { select: { name: true } } } }),
    db.wardVideo.findMany({ where: { moderation: 'PENDING' }, include: { ward: { select: { name: true } } } }),
    db.contentReport.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } }),
  ]);
  const aiFlags = await db.event.findMany({ where: { name: 'moderation.flag' }, orderBy: { createdAt: 'desc' }, take: 300 });
  const flagFor = (entityId: string) => aiFlags.find((f) => f.entityId === entityId)?.props ?? null;
  return {
    questions: questions.map((q) => ({ ...q, aiFlag: flagFor(q.id) })),
    comments: comments.map((c) => ({ id: c.id, ward: c.ward.name, field: c.field, comment: c.comment, aiFlag: flagFor(c.id) })),
    videos,
    reports,
  };
}

export async function moderate(s: CurrentSession, entity: 'TeamQuestion' | 'WardVideo' | 'RealityCheckComment' | 'ContentReport', id: string, status: ModerationStatus) {
  if (entity === 'TeamQuestion') await db.teamQuestion.update({ where: { id }, data: { moderation: status } });
  else if (entity === 'WardVideo') {
    const video = await db.wardVideo.findUniqueOrThrow({ where: { id } });
    // AK-G3: ohne Untertitel keine Veröffentlichung – captionsId ist Pflichtfeld, hier zusätzlich READY prüfen.
    if (status === 'APPROVED') {
      const captions = await db.file.findUnique({ where: { id: video.captionsId } });
      if (captions?.status !== 'READY') throw new ProblemError('conflict', 'Die Untertitel-Datei ist noch nicht geprüft.');
    }
    await db.wardVideo.update({ where: { id }, data: { moderation: status } });
  } else if (entity === 'RealityCheckComment') {
    // Abgelehnte Kommentare werden entfernt; die Stimme selbst bleibt (AK-G2 gilt für Arbeitgeber, nicht für Moderation).
    if (status === 'REJECTED') await db.realityCheck.update({ where: { id }, data: { comment: null } });
  } else {
    await db.contentReport.update({ where: { id }, data: { status } });
  }
  await audit({ actorId: s.user.id, action: `moderation.${status.toLowerCase()}`, entity, entityId: id });
}

export async function listGuides() {
  return db.recognitionGuide.findMany({ orderBy: [{ targetProfession: 'asc' }, { originCountry: 'asc' }] });
}

export async function saveGuide(s: CurrentSession, input: unknown, id?: string) {
  const data = parseOrThrow(recognitionGuideSchema, input);
  const payload = { ...data, steps: data.steps as Prisma.InputJsonValue, reviewedAt: new Date(data.reviewedAt) };
  const before = id ? await db.recognitionGuide.findUnique({ where: { id } }) : null;
  const saved = id
    ? await db.recognitionGuide.update({ where: { id }, data: payload })
    : await db.recognitionGuide.create({ data: payload });
  await audit({ actorId: s.user.id, action: id ? 'guide.update' : 'guide.create', entity: 'RecognitionGuide', entityId: saved.id, before, after: saved });
  return saved;
}

export async function auditLog(filter: { entity?: string; entityId?: string; cursor?: string }) {
  return db.auditLog.findMany({
    where: { ...(filter.entity ? { entity: filter.entity } : {}), ...(filter.entityId ? { entityId: filter.entityId } : {}) },
    include: { actor: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
    ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
  });
}

/** KPIs aus eigenen Ereignissen und Tabellen (PRD 3). */
export async function kpis() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400_000);
  const published = await db.job.findMany({ where: { status: 'PUBLISHED' }, include: { ward: { include: { location: true } } } });
  const complete = published.filter((j) => missingRequiredFields(resolveJobProfile(j.ward as unknown as PartialWardProfile, j.overrides)).length === 0).length;

  const apps = await db.application.findMany({
    where: { job: { status: 'PUBLISHED' } },
    include: { candidate: { include: { credentials: { select: { type: true, status: true } }, experiences: true, languages: true } }, job: { include: { ward: true } } },
  });
  const qualified = apps.filter((a) => passMatchScore({ candidate: a.candidate, job: { profession: a.job.profession, department: a.job.ward.department, allowsPendingRecog: a.job.allowsPendingRecog } }) >= 70).length;

  const hired = await db.application.findMany({ where: { status: 'HIRED' }, include: { job: { select: { publishedAt: true } } } });
  const tth = hired.filter((h) => h.job.publishedAt).map((h) => (h.statusChangedAt.getTime() - (h.job.publishedAt?.getTime() ?? 0)) / 86400_000);

  const allApps = await db.application.findMany({ select: { id: true, createdAt: true } });
  const firstChanges = await db.event.groupBy({ by: ['entityId'], where: { name: EVENTS.applicationStatusChanged }, _min: { createdAt: true } });
  const answeredInTime = allApps.filter((a) => {
    const first = firstChanges.find((f) => f.entityId === a.id)?._min.createdAt;
    return first ? businessDaysBetween(a.createdAt, first) <= 5 : false;
  }).length;
  const dueApps = allApps.filter((a) => businessDaysBetween(a.createdAt, now) >= 5).length;

  const [offersSent, offersAccepted] = await Promise.all([
    db.offer.count(),
    db.offer.count({ where: { status: 'INTERESTED' } }),
  ]);
  const [shiftsTotal, shiftsFilled] = await Promise.all([
    db.shift.count({ where: { status: { not: 'CANCELLED' }, startsAt: { lt: now } } }),
    db.shift.count({ where: { status: { in: ['BOOKED', 'COMPLETED'] }, startsAt: { lt: now } } }),
  ]);
  const paying = await db.organization.count({ where: { plan: { not: null }, OR: [{ planValidUntil: null }, { planValidUntil: { gt: now } }], foundingPartner: false } });
  const wauRows = await db.event.findMany({ where: { createdAt: { gte: weekAgo }, userId: { not: null } }, distinct: ['userId'], select: { userId: true } });

  const reviewed = await db.credential.findMany({ where: { reviewedAt: { not: null } }, select: { createdAt: true, reviewedAt: true }, take: 1000, orderBy: { reviewedAt: 'desc' } });
  const withinSla = reviewed.filter((r) => r.reviewedAt && businessDaysBetween(r.createdAt, r.reviewedAt) <= REVIEW_SLA_BUSINESS_DAYS).length;

  const ratio = (a: number, b: number) => (b === 0 ? null : a / b);
  return {
    profileCompleteness: ratio(complete, published.length),
    qualifiedApplicationsPerJob: published.length ? qualified / published.length : null,
    timeToHireDays: tth.length ? tth.reduce((s, x) => s + x, 0) / tth.length : null,
    oneClickShare: ratio(apps.length, apps.length),
    employerResponseRate: ratio(answeredInTime, dueApps),
    offerAcceptance: ratio(offersAccepted, offersSent),
    flexFilled: ratio(shiftsFilled, shiftsTotal),
    payingEmployers: paying,
    weeklyActiveUsers: wauRows.length,
    reviewSla: ratio(withinSla, reviewed.length),
    openReviews: await db.credential.count({ where: { status: { in: ['SUBMITTED', 'IN_REVIEW'] } } }),
    trainingDeviations: await db.event.count({ where: { name: 'training.deviation', createdAt: { gte: new Date(now.getTime() - 30 * 86400_000) } } }),
  };
}

export async function trainingDeviations() {
  return db.event.findMany({ where: { name: 'training.deviation' }, orderBy: { createdAt: 'desc' }, take: 100 });
}

export async function recheckOrganization(s: CurrentSession, id: string) {
  await enqueue(QUEUES.orgCheck, { organizationId: id });
  await audit({ actorId: s.user.id, action: 'organization.recheck', entity: 'Organization', entityId: id });
}
