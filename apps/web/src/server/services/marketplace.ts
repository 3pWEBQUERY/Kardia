import 'server-only';

import {
  EVENTS,
  ProblemError,
  QUEUES,
  aggregateDeclineReasons,
  limitsFor,
  marketplaceProfileSchema,
  offerExpiry,
  offerInputSchema,
  offerResponseSchema,
  offerRuleIssues,
  parseOrThrow,
  resolveJobProfile,
  toAnonymousProfile,
  type AnonymousProfile,
  type OfferInput,
  type OfferResponse,
  type PartialWardProfile,
} from '@kardia/core';
import { marketplaceRef, resolveMarketplaceRef } from '@kardia/core/crypto';


import { track } from '../audit.ts';
import { db } from '../db.ts';
import { enqueue } from '../queue.ts';

import { notifyOrg, notifyUser } from './notifications.ts';

import type { OrgContext } from '../session.ts';
import type { Department, Profession } from '@kardia/db';

/**
 * Umgekehrter Marktplatz (Modul E). AK-E1: Kein Endpunkt liefert identifizierende
 * Daten eines anonymen Profils vor dessen Freigabe – Arbeitgeber erhalten nur
 * `AnonymousProfile` (Positivliste) mit organisationsgebundener Referenz.
 */

export async function updateMarketplaceProfile(userId: string, input: unknown) {
  const data = parseOrThrow(marketplaceProfileSchema, input);
  return db.candidateProfile.update({
    where: { userId },
    data: {
      marketplaceActive: data.marketplaceActive,
      desiredWorkloadPct: data.desiredWorkloadPct,
      earliestStart: data.earliestStart ? new Date(data.earliestStart) : null,
      homeDistrict: data.homeDistrict,
      mustConditions: data.mustConditions,
    },
  });
}

/** Sperrliste: gesperrte Institutionen sehen das Profil nicht. */
export async function setBlocks(userId: string, organizationIds: string[]) {
  const c = await db.candidateProfile.findUniqueOrThrow({ where: { userId } });
  await db.$transaction([
    db.candidateBlock.deleteMany({ where: { candidateId: c.id } }),
    db.candidateBlock.createMany({ data: [...new Set(organizationIds)].map((organizationId) => ({ candidateId: c.id, organizationId })) }),
  ]);
}

export async function searchMarketplace(
  ctx: OrgContext,
  filter: { profession?: Profession; department?: Department; minYears?: number; district?: string },
): Promise<AnonymousProfile[]> {
  const limits = limitsFor(ctx.org.plan as Parameters<typeof limitsFor>[0]);
  if (!limits || limits.offersPerMonth === 0) throw new ProblemError('quotaExceeded', 'Der Marktplatz ist ab dem Abo "Institution" enthalten.');
  const rows = await db.candidateProfile.findMany({
    where: {
      marketplaceActive: true,
      user: { deletedAt: null },
      blocks: { none: { organizationId: ctx.org.id } },
      ...(filter.profession ? { profession: filter.profession } : {}),
      ...(filter.minYears ? { yearsExperience: { gte: filter.minYears } } : {}),
      ...(filter.district ? { homeDistrict: { contains: filter.district, mode: 'insensitive' } } : {}),
      ...(filter.department ? { experiences: { some: { department: filter.department } } } : {}),
    },
    // Positivliste: nur Felder, die das anonyme Profil braucht.
    select: {
      id: true,
      profession: true,
      yearsExperience: true,
      homeDistrict: true,
      desiredWorkloadPct: true,
      earliestStart: true,
      mustConditions: true,
      experiences: { select: { department: true, years: true } },
      languages: { select: { language: true, level: true } },
      credentials: { select: { status: true } },
    },
    take: 100,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(({ id, ...rest }) => toAnonymousProfile(rest, marketplaceRef(ctx.org.id, id)));
}

function startOfMonth(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function sendOffer(ctx: OrgContext, input: OfferInput) {
  const data = parseOrThrow(offerInputSchema, input);
  const candidateId = resolveMarketplaceRef(ctx.org.id, data.candidateRef);
  if (!candidateId) throw new ProblemError('notFound', 'Profil nicht gefunden.');
  const candidate = await db.candidateProfile.findFirst({
    where: { id: candidateId, marketplaceActive: true, blocks: { none: { organizationId: ctx.org.id } } },
  });
  if (!candidate) throw new ProblemError('notFound', 'Profil nicht gefunden.');

  // Angebot muss eine konkrete Stelle mit Stationsprofil referenzieren.
  const job = await db.job.findFirst({
    where: { id: data.jobId, status: 'PUBLISHED', ward: { location: { organizationId: ctx.org.id } } },
    include: { ward: true },
  });
  if (!job) throw new ProblemError('validation', 'Bitte eine veröffentlichte Stelle Ihrer Organisation wählen.');
  const profile = resolveJobProfile(job.ward as unknown as PartialWardProfile, job.overrides);
  const issues = offerRuleIssues(data, {
    salaryMinChf: profile.salaryMinChf ?? job.ward.salaryMinChf,
    workloadMinPct: job.workloadMinPct,
    workloadMaxPct: job.workloadMaxPct,
  });
  if (issues.length) {
    throw new ProblemError('offerRejected', undefined, issues.map((code) => ({ path: code === 'belowSalaryBand' ? 'salaryChf' : code === 'startInPast' ? 'startDate' : 'workloadPct', code, message: code })));
  }

  const org = await db.organization.findUniqueOrThrow({ where: { id: ctx.org.id } });
  const quota = Math.max(org.offerQuotaPerMonth, limitsFor(org.plan)?.offersPerMonth ?? 0);
  const used = await db.offer.count({ where: { organizationId: ctx.org.id, createdAt: { gte: startOfMonth() } } });
  if (used >= quota) throw new ProblemError('quotaExceeded', `Kontingent von ${quota} Angeboten pro Monat ist ausgeschöpft.`);
  const open = await db.offer.findFirst({
    where: { organizationId: ctx.org.id, candidateId, status: 'SENT', expiresAt: { gt: new Date() } },
  });
  if (open) throw new ProblemError('conflict', 'Es gibt bereits ein offenes Angebot an diese Person.');

  const offer = await db.offer.create({
    data: {
      organizationId: ctx.org.id,
      candidateId,
      jobId: job.id,
      salaryChf: data.salaryChf,
      workloadPct: data.workloadPct,
      startDate: new Date(data.startDate),
      note: data.note ?? null,
      expiresAt: offerExpiry(),
    },
  });
  await track(EVENTS.offerSent, { userId: ctx.user.id, orgId: ctx.org.id, entityId: offer.id });
  await notifyUser(candidate.userId, 'offer.new', { offerId: offer.id, orgName: ctx.org.name, jobTitle: job.title });
  return { id: offer.id, status: offer.status, expiresAt: offer.expiresAt };
}

export async function listMyOffers(userId: string) {
  return db.offer.findMany({
    where: { candidate: { userId } },
    include: {
      organization: { select: { id: true, name: true } },
      job: { include: { ward: { include: { location: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMyOffer(userId: string, offerId: string) {
  const offer = await db.offer.findFirst({
    where: { id: offerId, candidate: { userId } },
    include: { organization: { select: { id: true, name: true } }, job: { include: { ward: { include: { location: true } } } } },
  });
  if (!offer) throw new ProblemError('notFound');
  return { offer, profile: resolveJobProfile(offer.job.ward as unknown as PartialWardProfile, offer.job.overrides) };
}

/**
 * Antwort auf ein Angebot. Erst bei "Interesse" werden Name und Kontakt freigegeben:
 * es entsteht ein Bewerbungs-Thread (Status "Angebot") mit Chat. Ablehnen mit einem
 * Tipp, Grund optional und nur aggregiert sichtbar (AK-E3). Nie optimistisch (PRD 7.4).
 */
export async function respondOffer(userId: string, offerId: string, input: OfferResponse) {
  const response = parseOrThrow(offerResponseSchema, input);
  const offer = await db.offer.findFirst({ where: { id: offerId, candidate: { userId } }, include: { job: true } });
  if (!offer) throw new ProblemError('notFound');
  if (offer.status !== 'SENT' || offer.expiresAt < new Date()) throw new ProblemError('conflict', 'Dieses Angebot ist nicht mehr offen.');
  let applicationId: string | null = null;
  if (response.action === 'interested') {
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.offer.updateMany({ where: { id: offerId, status: 'SENT' }, data: { status: 'INTERESTED' } });
      if (updated.count === 0) throw new ProblemError('conflict');
      return tx.application.upsert({
        where: { jobId_candidateId: { jobId: offer.jobId, candidateId: offer.candidateId } },
        create: { jobId: offer.jobId, candidateId: offer.candidateId, status: 'OFFER', message: null },
        update: { status: 'OFFER', statusChangedAt: new Date() },
      });
    });
    applicationId = result.id;
  } else {
    await db.offer.update({ where: { id: offerId }, data: { status: 'DECLINED', declineReason: response.reason ?? null } });
  }
  await track(EVENTS.offerResponded, { userId, orgId: offer.organizationId, entityId: offerId, props: { action: response.action } });
  await notifyOrg(offer.organizationId, 'offer.responded', { offerId, action: response.action, applicationId });
  await enqueue(QUEUES.webhookDeliver, {
    orgId: offer.organizationId,
    event: EVENTS.offerResponded,
    payload: { offerId, action: response.action, applicationId },
  });
  return { status: response.action === 'interested' ? 'INTERESTED' : 'DECLINED', applicationId };
}

/** Arbeitgebersicht: eigene Angebote; Identität erst nach "Interesse" (über die Bewerbung). */
export async function listOrgOffers(ctx: OrgContext) {
  const offers = await db.offer.findMany({
    where: { organizationId: ctx.org.id },
    include: { job: { select: { id: true, title: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const declined = offers.filter((o) => o.status === 'DECLINED').map((o) => o.declineReason);
  const used = offers.filter((o) => o.createdAt >= startOfMonth()).length;
  return {
    offers: offers.map((o) => ({
      id: o.id,
      job: o.job,
      salaryChf: o.salaryChf,
      workloadPct: o.workloadPct,
      startDate: o.startDate,
      status: o.status === 'SENT' && o.expiresAt < new Date() ? 'EXPIRED' : o.status,
      expiresAt: o.expiresAt,
      createdAt: o.createdAt,
      candidateRef: marketplaceRef(ctx.org.id, o.candidateId),
    })),
    declineReasons: aggregateDeclineReasons(declined),
    usedThisMonth: used,
  };
}
