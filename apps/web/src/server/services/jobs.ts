import 'server-only';

import {
  EVENTS,
  ProblemError,
  hasRecognizedTraining,
  jobInputSchema,
  jobPatchSchema,
  limitsFor,
  parseOrThrow,
  publishBlockers,
  resolveJobProfile,
  type PartialWardProfile,
  type PublishBlocker,
} from '@kardia/core';
import { Prisma } from '@kardia/db';

import { track } from '../audit.ts';
import { db } from '../db.ts';
import type { OrgContext } from '../session.ts';

import { getWardPublic } from './wards.ts';

/** Stellen: erben das Stationsprofil, dürfen einzelne Felder überschreiben (Modul A). */

export async function getJobPublic(jobId: string) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.status !== 'PUBLISHED') return null;
  const wardView = await getWardPublic(job.wardId);
  if (!wardView) return null;
  const profile = resolveJobProfile(wardView.ward as unknown as PartialWardProfile, job.overrides);
  return { job, profile, ...wardView, recognizedTraining: hasRecognizedTraining(job) };
}

async function assertJobInOrg(jobId: string, orgId: string) {
  const job = await db.job.findFirst({
    where: { id: jobId, ward: { location: { organizationId: orgId } } },
    include: { ward: { include: { location: true } } },
  });
  if (!job) throw new ProblemError('notFound');
  return job;
}

export async function listOrgJobs(orgId: string, status?: string) {
  return db.job.findMany({
    where: {
      ward: { location: { organizationId: orgId } },
      ...(status ? { status: status as 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED' } : {}),
    },
    include: {
      ward: { select: { id: true, name: true, confirmedAt: true } },
      _count: { select: { applications: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getOrgJob(ctx: OrgContext, jobId: string) {
  const job = await assertJobInOrg(jobId, ctx.org.id);
  return { job, blockers: await blockersFor(ctx, job.id) };
}

export async function createJob(ctx: OrgContext, input: unknown) {
  const data = parseOrThrow(jobInputSchema, input);
  const ward = await db.ward.findFirst({ where: { id: data.wardId, location: { organizationId: ctx.org.id } } });
  if (!ward) throw new ProblemError('notFound', 'Station nicht gefunden.');
  const { overrides, startDate, ...rest } = data;
  return db.job.create({
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate) : null,
      ...(overrides ? { overrides: overrides as Prisma.InputJsonValue } : {}),
      status: 'DRAFT',
    },
  });
}

export async function updateJob(ctx: OrgContext, jobId: string, input: unknown) {
  await assertJobInOrg(jobId, ctx.org.id);
  const patch = parseOrThrow(jobPatchSchema, input);
  const { status, overrides, startDate, ...rest } = patch;
  if (status === 'PUBLISHED') {
    await db.job.update({ where: { id: jobId }, data: buildPatch(rest, overrides, startDate) });
    return publishJob(ctx, jobId);
  }
  return db.job.update({
    where: { id: jobId },
    data: { ...buildPatch(rest, overrides, startDate), ...(status ? { status } : {}) },
  });
}

function buildPatch(
  rest: Omit<ReturnType<typeof jobPatchSchema.parse>, 'status' | 'overrides' | 'startDate'>,
  overrides: unknown,
  startDate: string | null | undefined,
): Prisma.JobUpdateInput {
  return {
    ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)),
    ...(overrides !== undefined ? { overrides: overrides === null ? Prisma.DbNull : (overrides as Prisma.InputJsonValue) } : {}),
    ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
  };
}

export async function blockersFor(ctx: Pick<OrgContext, 'org'>, jobId: string): Promise<PublishBlocker[]> {
  const job = await db.job.findUniqueOrThrow({ where: { id: jobId }, include: { ward: { include: { location: { include: { organization: true } } } } } });
  const org = job.ward.location.organization;
  const activeJobs = await db.job.count({
    where: { status: 'PUBLISHED', id: { not: jobId }, ward: { location: { organizationId: ctx.org.id } } },
  });
  const limits = limitsFor(org.plan);
  return publishBlockers({
    ward: job.ward as unknown as PartialWardProfile,
    overrides: job.overrides,
    job,
    location: job.ward.location,
    org: { verification: org.verification, secoRegistryMatch: org.secoRegistryMatch },
    activeJobs,
    // Ohne Abo nur Einzelinserate (bezahlt bis paidUntil).
    activeJobLimit: limits ? limits.activeJobs : job.paidUntil && job.paidUntil > new Date() ? null : 0,
  });
}

/** AK-A1 und AK-C1: Veröffentlichung nur ohne Blocker. */
export async function publishJob(ctx: OrgContext, jobId: string) {
  await assertJobInOrg(jobId, ctx.org.id);
  const blockers = await blockersFor(ctx, jobId);
  if (blockers.length) {
    throw new ProblemError(
      'publishBlocked',
      'Bitte zuerst die fehlenden Angaben ergänzen.',
      blockers.map((b) => ({ path: 'field' in b ? b.field : b.kind, code: b.kind, message: b.kind })),
    );
  }
  const job = await db.job.update({ where: { id: jobId }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
  await track(EVENTS.jobPublished, { userId: ctx.user.id, orgId: ctx.org.id, entityId: jobId });
  return job;
}

export async function setJobStatus(ctx: OrgContext, jobId: string, status: 'PAUSED' | 'CLOSED' | 'DRAFT') {
  await assertJobInOrg(jobId, ctx.org.id);
  const job = await db.job.update({ where: { id: jobId }, data: { status } });
  if (status === 'CLOSED') await track(EVENTS.jobClosed, { userId: ctx.user.id, orgId: ctx.org.id, entityId: jobId });
  return job;
}

/** Für das Kompaktformat der API und den Vergleich: mehrere Stellen mit aufgelöstem Profil. */
export async function getJobsForCompare(ids: string[]) {
  const jobs = await db.job.findMany({
    where: { id: { in: ids.slice(0, 4) }, status: 'PUBLISHED' },
    include: { ward: { include: { location: { include: { organization: { select: { name: true } } } } } } },
  });
  return ids
    .map((id) => jobs.find((j) => j.id === id))
    .filter((j): j is NonNullable<typeof j> => !!j)
    .map((j) => ({ job: j, profile: resolveJobProfile(j.ward as unknown as PartialWardProfile, j.overrides) }));
}
