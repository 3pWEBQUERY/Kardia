import 'server-only';

import {
  EVENTS,
  ProblemError,
  QUEUES,
  canCandidateCancel,
  limitsFor,
  parseOrThrow,
  poolInputSchema,
  shiftInputSchema,
  shiftsToIcs,
  toCsv,
  formatDateTime,
  type ShiftInput,
} from '@kardia/core';
import { randomToken, sha256Hex } from '@kardia/core/crypto';

import { track } from '../audit.ts';
import { db } from '../db.ts';
import { env } from '../env.ts';
import { assertFeature } from '../features.ts';
import { enqueue } from '../queue.ts';

import { notifyEmail, notifyOrg, notifyUser } from './notifications.ts';

import type { OrgContext } from '../session.ts';


/**
 * Flex-Pool (Modul C, R2): Einzelschichten für den eigenen Springerpool. Mitglieder
 * sind beim Arbeitgeber angestellt; Kardia ist reine Software (AK-C3).
 */

function assertFlexPlan(ctx: OrgContext) {
  const limits = limitsFor(ctx.org.plan as Parameters<typeof limitsFor>[0]);
  if (!limits?.flexPool) throw new ProblemError('quotaExceeded', 'Der Flex-Pool ist ab dem Abo "Institution" enthalten.');
  return limits;
}

export async function createPool(ctx: OrgContext, input: unknown) {
  assertFeature('flexPool');
  assertFlexPlan(ctx);
  const data = parseOrThrow(poolInputSchema, input);
  return db.flexPool.create({ data: { ...data, organizationId: ctx.org.id } });
}

/** Einstellungen nachträglich ändern; gilt für neue Buchungen und Absagen. */
export async function updatePool(ctx: OrgContext, poolId: string, input: unknown) {
  assertFeature('flexPool');
  assertFlexPlan(ctx);
  const data = parseOrThrow(poolInputSchema, input);
  await poolOf(ctx, poolId);
  return db.flexPool.update({ where: { id: poolId }, data });
}

export async function listPools(ctx: OrgContext) {
  assertFeature('flexPool');
  return db.flexPool.findMany({
    where: { organizationId: ctx.org.id },
    include: {
      _count: { select: { members: true } },
      shifts: {
        where: { startsAt: { gte: new Date(Date.now() - 7 * 86400_000) } },
        orderBy: { startsAt: 'asc' },
        include: { ward: { select: { name: true } }, interests: true },
      },
    },
  });
}

async function poolOf(ctx: OrgContext, poolId: string) {
  const pool = await db.flexPool.findFirst({ where: { id: poolId, organizationId: ctx.org.id } });
  if (!pool) throw new ProblemError('notFound');
  return pool;
}

/** Einladung per E-Mail; bestehende Fachpersonen treten über den Link bei. */
export async function inviteToPool(ctx: OrgContext, poolId: string, email: string) {
  assertFeature('flexPool');
  const limits = assertFlexPlan(ctx);
  await poolOf(ctx, poolId);
  if (limits.poolMembers != null) {
    const members = await db.poolMember.count({ where: { pool: { organizationId: ctx.org.id } } });
    if (members >= limits.poolMembers) throw new ProblemError('quotaExceeded', `Höchstens ${limits.poolMembers} Pool-Mitglieder in Ihrem Abo.`);
  }
  const token = randomToken();
  await db.inviteToken.create({
    data: {
      kind: 'POOL',
      organizationId: ctx.org.id,
      email: email.toLowerCase(),
      poolId,
      tokenHash: sha256Hex(token),
      expiresAt: new Date(Date.now() + 14 * 86400_000),
      createdById: ctx.user.id,
    },
  });
  await notifyEmail(email, 'pool.invite', { orgName: ctx.org.name, url: `${env().APP_ORIGIN}/invite/${token}` });
}

export async function publishShift(ctx: OrgContext, input: ShiftInput) {
  assertFeature('flexPool');
  assertFlexPlan(ctx);
  const data = parseOrThrow(shiftInputSchema, input);
  await poolOf(ctx, data.poolId);
  const ward = await db.ward.findFirst({ where: { id: data.wardId, location: { organizationId: ctx.org.id } } });
  if (!ward) throw new ProblemError('notFound', 'Station nicht gefunden.');
  const shift = await db.shift.create({
    data: {
      poolId: data.poolId,
      wardId: data.wardId,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      code: data.code,
      hourlyRateChf: data.hourlyRateChf,
      requirements: data.requirements ?? null,
    },
  });
  await track(EVENTS.shiftPublished, { userId: ctx.user.id, orgId: ctx.org.id, entityId: shift.id });
  const members = await db.poolMember.findMany({ where: { poolId: data.poolId }, include: { candidate: { select: { userId: true } } } });
  for (const m of members) await notifyUser(m.candidate.userId, 'shift.new', { shiftId: shift.id, wardName: ward.name, startsAt: shift.startsAt });
  return shift;
}

/** Offene Schichten der Pools, in denen die Fachperson Mitglied ist. */
export async function myShifts(userId: string) {
  assertFeature('flexPool');
  const candidate = await db.candidateProfile.findUnique({ where: { userId } });
  if (!candidate) return { open: [], booked: [] };
  const pools = await db.poolMember.findMany({ where: { candidateId: candidate.id }, select: { poolId: true } });
  const poolIds = pools.map((p) => p.poolId);
  const include = { ward: { include: { location: true } }, pool: { include: { organization: { select: { name: true } } } }, interests: { where: { candidateId: candidate.id } } } as const;
  const [open, booked] = await Promise.all([
    db.shift.findMany({ where: { poolId: { in: poolIds }, status: 'OPEN', startsAt: { gt: new Date() } }, include, orderBy: { startsAt: 'asc' } }),
    db.shift.findMany({ where: { bookedByCandidateId: candidate.id, status: { in: ['BOOKED', 'COMPLETED'] } }, include, orderBy: { startsAt: 'asc' } }),
  ]);
  return { open, booked, candidateId: candidate.id };
}

/**
 * Schichtbuchung (PRD 10.3, AK-C2): bedingtes UPDATE auf status = OPEN in einer
 * Transaktion. 0 Zeilen = bereits vergeben. Zwei gleichzeitige Buchungen können
 * nie beide gewinnen, weil Postgres die Zeile für das UPDATE sperrt.
 */
export async function bookShift(userId: string, shiftId: string): Promise<{ status: 'BOOKED' | 'INTEREST' }> {
  assertFeature('flexPool');
  const candidate = await db.candidateProfile.findUnique({ where: { userId } });
  if (!candidate) throw new ProblemError('forbidden');
  const shift = await db.shift.findUnique({ where: { id: shiftId }, include: { pool: true, ward: true } });
  if (!shift) throw new ProblemError('notFound');
  const member = await db.poolMember.findUnique({ where: { poolId_candidateId: { poolId: shift.poolId, candidateId: candidate.id } } });
  if (!member) throw new ProblemError('forbidden', 'Sie sind nicht Mitglied dieses Pools.');
  if (shift.startsAt <= new Date()) throw new ProblemError('conflict', 'Diese Schicht hat bereits begonnen.');

  if (shift.pool.bookingMode === 'EMPLOYER_SELECTS') {
    await db.shiftInterest.upsert({
      where: { shiftId_candidateId: { shiftId, candidateId: candidate.id } },
      create: { shiftId, candidateId: candidate.id },
      update: {},
    });
    await notifyOrg(shift.pool.organizationId, 'shift.booked', { shiftId, interest: true });
    return { status: 'INTEREST' };
  }

  const booked = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      UPDATE "Shift" SET "status" = 'BOOKED', "bookedByCandidateId" = ${candidate.id}, "bookedAt" = now()
      WHERE "id" = ${shiftId} AND "status" = 'OPEN'
      RETURNING "id"`;
    return rows.length === 1;
  });
  if (!booked) throw new ProblemError('shiftTaken');
  await afterBooking(shift.pool.organizationId, shiftId, userId, shift.ward.name, shift.startsAt);
  return { status: 'BOOKED' };
}

async function afterBooking(orgId: string, shiftId: string, userId: string, wardName: string, startsAt: Date) {
  await track(EVENTS.shiftBooked, { userId, orgId, entityId: shiftId });
  await notifyUser(userId, 'shift.booked', { shiftId, wardName, startsAt });
  await notifyOrg(orgId, 'shift.booked', { shiftId, wardName, startsAt });
  await enqueue(QUEUES.webhookDeliver, { orgId, event: EVENTS.shiftBooked, payload: { shiftId } });
}

/** Modus "Arbeitgeber wählt aus": Zuteilung aus den Interessensbekundungen, gleiches bedingtes UPDATE. */
export async function assignShift(ctx: OrgContext, shiftId: string, candidateId: string) {
  assertFeature('flexPool');
  const shift = await db.shift.findFirst({ where: { id: shiftId, pool: { organizationId: ctx.org.id } }, include: { ward: true } });
  if (!shift) throw new ProblemError('notFound');
  const interest = await db.shiftInterest.findUnique({ where: { shiftId_candidateId: { shiftId, candidateId } }, include: { shift: true } });
  if (!interest) throw new ProblemError('validation', 'Diese Person hat kein Interesse angemeldet.');
  const rows = await db.$queryRaw<{ id: string }[]>`
    UPDATE "Shift" SET "status" = 'BOOKED', "bookedByCandidateId" = ${candidateId}, "bookedAt" = now()
    WHERE "id" = ${shiftId} AND "status" = 'OPEN' RETURNING "id"`;
  if (rows.length !== 1) throw new ProblemError('shiftTaken');
  const c = await db.candidateProfile.findUniqueOrThrow({ where: { id: candidateId } });
  await afterBooking(ctx.org.id, shiftId, c.userId, shift.ward.name, shift.startsAt);
}

/** Absage bis X Stunden vorher (pro Pool); danach nur über den Arbeitgeber. */
export async function cancelShiftAsCandidate(userId: string, shiftId: string) {
  assertFeature('flexPool');
  const candidate = await db.candidateProfile.findUniqueOrThrow({ where: { userId } });
  const shift = await db.shift.findFirst({ where: { id: shiftId, bookedByCandidateId: candidate.id, status: 'BOOKED' }, include: { pool: true } });
  if (!shift) throw new ProblemError('notFound');
  if (!canCandidateCancel(shift.startsAt, shift.pool.cancelDeadlineHours)) {
    throw new ProblemError('conflict', `Absage nur bis ${shift.pool.cancelDeadlineHours} Stunden vorher. Bitte direkt mit dem Arbeitgeber Kontakt aufnehmen.`);
  }
  await db.shift.update({ where: { id: shiftId }, data: { status: 'OPEN', bookedByCandidateId: null, bookedAt: null } });
  await track(EVENTS.shiftCancelled, { userId, orgId: shift.pool.organizationId, entityId: shiftId, props: { by: 'candidate' } });
  await notifyOrg(shift.pool.organizationId, 'shift.cancelled', { shiftId });
  await enqueue(QUEUES.webhookDeliver, { orgId: shift.pool.organizationId, event: EVENTS.shiftCancelled, payload: { shiftId, by: 'candidate' } });
}

export async function cancelShiftAsEmployer(ctx: OrgContext, shiftId: string) {
  assertFeature('flexPool');
  const shift = await db.shift.findFirst({ where: { id: shiftId, pool: { organizationId: ctx.org.id } } });
  if (!shift) throw new ProblemError('notFound');
  await db.shift.update({ where: { id: shiftId }, data: { status: 'CANCELLED' } });
  if (shift.bookedByCandidateId) {
    const c = await db.candidateProfile.findUniqueOrThrow({ where: { id: shift.bookedByCandidateId } });
    await notifyUser(c.userId, 'shift.cancelled', { shiftId, startsAt: shift.startsAt });
  }
  await track(EVENTS.shiftCancelled, { userId: ctx.user.id, orgId: ctx.org.id, entityId: shiftId, props: { by: 'employer' } });
  await enqueue(QUEUES.webhookDeliver, { orgId: ctx.org.id, event: EVENTS.shiftCancelled, payload: { shiftId, by: 'employer' } });
}

export async function poolCsv(ctx: OrgContext, poolId: string): Promise<string> {
  assertFeature('flexPool');
  await poolOf(ctx, poolId);
  const shifts = await db.shift.findMany({ where: { poolId }, include: { ward: true }, orderBy: { startsAt: 'asc' } });
  const candidates = await db.candidateProfile.findMany({
    where: { id: { in: shifts.map((s) => s.bookedByCandidateId).filter((x): x is string => !!x) } },
    select: { id: true, firstName: true, lastName: true },
  });
  return toCsv(
    shifts.map((s) => {
      const c = candidates.find((x) => x.id === s.bookedByCandidateId);
      return {
        Beginn: formatDateTime(s.startsAt),
        Ende: formatDateTime(s.endsAt),
        Station: s.ward.name,
        Dienst: s.code,
        'CHF/h': s.hourlyRateChf,
        Status: s.status,
        Person: c ? `${c.firstName} ${c.lastName}` : null,
      };
    }),
  );
}

export async function myShiftsIcs(userId: string): Promise<string> {
  assertFeature('flexPool');
  const { booked } = await myShifts(userId);
  return shiftsToIcs(
    booked
      .filter((s) => s.status === 'BOOKED')
      .map((s) => ({
        id: s.id,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        title: `${s.code} · ${s.ward.name}`,
        location: `${s.pool.organization.name}, ${s.ward.location.street}, ${s.ward.location.postalCode} ${s.ward.location.city}`,
        ...(s.requirements ? { description: s.requirements } : {}),
      })),
  );
}
