import 'server-only';

import {
  BENCHMARK_MIN_PEERS,
  EVENTS,
  QUEUES,
  REALITY_CHECK_FIELDS,
  ProblemError,
  aggregateRealityChecks,
  isStale,
  locationInputSchema,
  locationQuotaExceeded,
  parseOrThrow,
  wardProfileSchema,
  wardQuotaExceeded,
  type LocationInput,
  type RealityAggregate,
  type WardProfile,
} from '@kardia/core';
import { Prisma } from '@kardia/db';

import { track } from '../audit.ts';
import { db } from '../db.ts';
import { enqueue } from '../queue.ts';

import type { OrgContext } from '../session.ts';

/** Station (Modul A) samt Standort, Realitäts-Check (G), Videos, Fragen und Benchmark. */

export async function assertWardInOrg(wardId: string, orgId: string) {
  const ward = await db.ward.findFirst({ where: { id: wardId, location: { organizationId: orgId } } });
  if (!ward) throw new ProblemError('notFound', 'Diese Station gehört nicht zu Ihrer Organisation.');
  return ward;
}

export async function listLocations(orgId: string) {
  return db.location.findMany({
    where: { organizationId: orgId },
    orderBy: { name: 'asc' },
    include: { wards: { orderBy: { name: 'asc' }, include: { _count: { select: { jobs: { where: { status: 'PUBLISHED' } } } } } } },
  });
}

export async function createLocation(ctx: OrgContext, input: LocationInput) {
  const data = parseOrThrow(locationInputSchema, input);
  const existing = await db.location.count({ where: { organizationId: ctx.org.id } });
  if (locationQuotaExceeded(ctx.org.plan as Parameters<typeof locationQuotaExceeded>[0], existing)) {
    throw new ProblemError('quotaExceeded', 'Ihr Abo umfasst einen Standort. Für weitere Standorte das Abo «Spitalgruppe» wählen oder den bestehenden Standort bearbeiten.');
  }
  return db.location.create({ data: { ...data, organizationId: ctx.org.id } });
}

export async function updateLocation(ctx: OrgContext, id: string, input: LocationInput) {
  const data = parseOrThrow(locationInputSchema, input);
  const loc = await db.location.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!loc) throw new ProblemError('notFound');
  return db.location.update({ where: { id }, data });
}

function wardData(p: WardProfile) {
  return {
    ...p,
    reentryRefresher: p.reentryRefresher ? (p.reentryRefresher as Prisma.InputJsonValue) : Prisma.DbNull,
  };
}

export async function createWard(ctx: OrgContext, locationId: string, input: unknown) {
  const loc = await db.location.findFirst({ where: { id: locationId, organizationId: ctx.org.id } });
  if (!loc) throw new ProblemError('notFound', 'Standort nicht gefunden.');
  const profile = parseOrThrow(wardProfileSchema, input);
  const existing = await db.ward.count({ where: { location: { organizationId: ctx.org.id } } });
  if (wardQuotaExceeded(ctx.org.plan as Parameters<typeof wardQuotaExceeded>[0], existing)) {
    throw new ProblemError('quotaExceeded', 'Ihr Abo «Praxis» umfasst eine Station. Für weitere Stationen das Abo «Institution» wählen oder die bestehende Station bearbeiten.');
  }
  const ward = await db.ward.create({ data: { ...wardData(profile), locationId, confirmedAt: new Date() } });
  await track(EVENTS.wardConfirmed, { userId: ctx.user.id, orgId: ctx.org.id, entityId: ward.id });
  if (ward.description) await enqueue(QUEUES.aiTranslation, { wardId: ward.id });
  return ward;
}

/** Jede Änderung gilt als Bestätigung (AK-A2: Quelle und Datum je Feld). */
export async function updateWard(ctx: OrgContext, wardId: string, input: unknown) {
  const before = await assertWardInOrg(wardId, ctx.org.id);
  const profile = parseOrThrow(wardProfileSchema, input);
  const ward = await db.ward.update({ where: { id: wardId }, data: { ...wardData(profile), confirmedAt: new Date() } });
  await track(EVENTS.wardConfirmed, { userId: ctx.user.id, orgId: ctx.org.id, entityId: ward.id });
  if (ward.description && ward.description !== before.description) await enqueue(QUEUES.aiTranslation, { wardId: ward.id });
  return ward;
}

/** AK-A3: Bestätigung ohne Änderung, spätestens alle 180 Tage. */
export async function confirmWard(ctx: OrgContext, wardId: string) {
  await assertWardInOrg(wardId, ctx.org.id);
  await db.ward.update({ where: { id: wardId }, data: { confirmedAt: new Date() } });
  await track(EVENTS.wardConfirmed, { userId: ctx.user.id, orgId: ctx.org.id, entityId: wardId });
}

export async function updateWardTranslations(ctx: OrgContext, wardId: string, translations: Record<string, { description: string | null }>) {
  await assertWardInOrg(wardId, ctx.org.id);
  await db.ward.update({ where: { id: wardId }, data: { translations: translations } });
}

/** Gegendarstellung zu einem Realitäts-Check-Feld (AK-G2: kommentieren, nie löschen). */
export async function commentRealityField(ctx: OrgContext, wardId: string, field: string, body: string) {
  await assertWardInOrg(wardId, ctx.org.id);
  if (!(REALITY_CHECK_FIELDS as readonly string[]).includes(field)) throw new ProblemError('validation', 'Unbekanntes Feld.');
  const text = body.trim().slice(0, 600);
  if (!text) {
    await db.wardFieldComment.deleteMany({ where: { wardId, field } });
    return;
  }
  await db.wardFieldComment.upsert({
    where: { wardId_field: { wardId, field } },
    create: { wardId, field, body: text, authorId: ctx.user.id },
    update: { body: text, authorId: ctx.user.id },
  });
}

/** Aggregierte Realitäts-Check-Werte – nur Felder mit ≥ 5 Stimmen (AK-G1, serverseitig). */
export async function realityAggregates(wardId: string, employer: Record<string, unknown>): Promise<Record<string, RealityAggregate>> {
  const votes = await db.realityCheck.findMany({
    where: { wardId },
    select: { field: true, agrees: true, proposedValue: true },
  });
  const byField = new Map<string, { agrees: boolean; proposedValue: string | null }[]>();
  for (const v of votes) byField.set(v.field, [...(byField.get(v.field) ?? []), v]);
  const out: Record<string, RealityAggregate> = {};
  for (const [field, list] of byField) {
    const ev = employer[field];
    const agg = aggregateRealityChecks(field, typeof ev === 'number' ? ev : null, list);
    if (agg) out[field] = agg;
  }
  return out;
}

/** Öffentliches Stationsprofil inkl. Stellen, Team-Werten, Fragen, Videos, Benchmarks. */
export async function getWardPublic(wardId: string) {
  const ward = await db.ward.findUnique({
    where: { id: wardId },
    include: {
      location: { include: { organization: { select: { id: true, name: true, verification: true, logoFileId: true } } } },
      jobs: { where: { status: 'PUBLISHED' }, orderBy: { publishedAt: 'desc' } },
      fieldComments: true,
      questions: { where: { moderation: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: 20 },
      videos: { where: { moderation: 'APPROVED' }, take: 5 },
      benchmarks: { where: { peerCount: { gte: BENCHMARK_MIN_PEERS } } },
      _count: { select: { verifiedEmployees: true, ambassadors: true } },
    },
  });
  if (ward?.location.organization.verification !== 'VERIFIED') return null;
  const reality = await realityAggregates(ward.id, ward);
  return { ward, reality, stale: isStale(ward.confirmedAt) };
}

export async function listWardsForOrg(orgId: string) {
  return db.ward.findMany({
    where: { location: { organizationId: orgId } },
    include: { location: true, _count: { select: { jobs: true } } },
    orderBy: [{ location: { name: 'asc' } }, { name: 'asc' }],
  });
}

export async function getWardForOrg(orgId: string, wardId: string) {
  const ward = await db.ward.findFirst({
    where: { id: wardId, location: { organizationId: orgId } },
    include: { location: true, fieldComments: true, jobs: { orderBy: { createdAt: 'desc' } }, videos: true, questions: { orderBy: { createdAt: 'desc' } }, benchmarks: true },
  });
  if (!ward) throw new ProblemError('notFound');
  return { ward, reality: await realityAggregates(ward.id, ward) };
}
