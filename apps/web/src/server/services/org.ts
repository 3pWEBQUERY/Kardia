import 'server-only';

import { cookies } from 'next/headers';

import {
  ProblemError,
  QUEUES,
  WEBHOOK_EVENTS,
  limitsFor,
  memberInviteSchema,
  organizationInputSchema,
  parseOrThrow,
} from '@kardia/core';
import { encryptField, generateApiKey, randomToken, sha256Hex } from '@kardia/core/crypto';
import type { MemberRole } from '@kardia/db';

import { db } from '../db.ts';
import { env } from '../env.ts';
import { enqueue } from '../queue.ts';
import type { CurrentSession, OrgContext } from '../session.ts';

import { notifyEmail } from './notifications.ts';

/**
 * Agenturfrei (Modul C): Registrierung mit UID, Abgleich gegen UID-Register und
 * SECO-Verzeichnis (Worker `org.check`). Treffer im SECO-Verzeichnis → manuelle
 * Prüfung, vorher keine Veröffentlichung (AK-C1).
 */
export async function registerOrganization(s: CurrentSession, input: unknown) {
  const data = parseOrThrow(organizationInputSchema, input);
  const exists = await db.organization.findUnique({ where: { uid: data.uid } });
  if (exists) throw new ProblemError('conflict', 'Diese UID ist bereits registriert. Bitten Sie eine bestehende Person der Organisation um eine Einladung.');
  const org = await db.organization.create({
    data: {
      name: data.name,
      uid: data.uid,
      emailDomains: data.emailDomains,
      verification: 'PENDING',
      members: { create: { userId: s.user.id, role: 'OWNER' } },
    },
  });
  await enqueue(QUEUES.orgCheck, { organizationId: org.id });
  (await cookies()).set('kardia_org', org.id, { httpOnly: true, sameSite: 'lax', path: '/', secure: env().APP_ORIGIN.startsWith('https') });
  return org;
}

export async function switchOrganization(userId: string, organizationId: string) {
  const m = await db.orgMember.findUnique({ where: { organizationId_userId: { organizationId, userId } } });
  if (!m) throw new ProblemError('forbidden');
  (await cookies()).set('kardia_org', organizationId, { httpOnly: true, sameSite: 'lax', path: '/' });
}

export async function listMemberships(userId: string) {
  return db.orgMember.findMany({ where: { userId }, include: { organization: { select: { id: true, name: true } } } });
}

export async function listMembers(ctx: OrgContext) {
  const [members, invites] = await Promise.all([
    db.orgMember.findMany({ where: { organizationId: ctx.org.id }, include: { user: { select: { email: true, name: true } } } }),
    db.inviteToken.findMany({ where: { organizationId: ctx.org.id, kind: 'ORG_MEMBER', usedAt: null, expiresAt: { gt: new Date() } } }),
  ]);
  return { members, invites };
}

export async function inviteMember(ctx: OrgContext, input: { email: string; role: MemberRole }) {
  const data = parseOrThrow(memberInviteSchema, input);
  const limits = limitsFor(ctx.org.plan as Parameters<typeof limitsFor>[0]);
  if (limits?.users != null) {
    const count = await db.orgMember.count({ where: { organizationId: ctx.org.id } });
    if (count >= limits.users) throw new ProblemError('quotaExceeded', `Ihr Abo umfasst ${limits.users} Nutzer.`);
  }
  const token = randomToken();
  await db.inviteToken.create({
    data: {
      kind: 'ORG_MEMBER',
      organizationId: ctx.org.id,
      email: data.email.toLowerCase(),
      role: data.role,
      tokenHash: sha256Hex(token),
      expiresAt: new Date(Date.now() + 7 * 86400_000),
      createdById: ctx.user.id,
    },
  });
  await notifyEmail(data.email, 'org.invite', { orgName: ctx.org.name, url: `${env().APP_ORIGIN}/invite/${token}` });
}

export async function changeMemberRole(ctx: OrgContext, memberId: string, role: MemberRole) {
  const m = await db.orgMember.findFirst({ where: { id: memberId, organizationId: ctx.org.id } });
  if (!m) throw new ProblemError('notFound');
  if (m.role === 'OWNER' && role !== 'OWNER') {
    const owners = await db.orgMember.count({ where: { organizationId: ctx.org.id, role: 'OWNER' } });
    if (owners <= 1) throw new ProblemError('conflict', 'Es braucht mindestens eine Owner-Person.');
  }
  return db.orgMember.update({ where: { id: memberId }, data: { role } });
}

export async function removeMember(ctx: OrgContext, memberId: string) {
  const m = await db.orgMember.findFirst({ where: { id: memberId, organizationId: ctx.org.id } });
  if (!m) throw new ProblemError('notFound');
  if (m.role === 'OWNER') {
    const owners = await db.orgMember.count({ where: { organizationId: ctx.org.id, role: 'OWNER' } });
    if (owners <= 1) throw new ProblemError('conflict', 'Es braucht mindestens eine Owner-Person.');
  }
  await db.orgMember.delete({ where: { id: memberId } });
}

/** Einladungslink einlösen: Team-Mitglied, verifizierte:r Mitarbeitende:r oder Flex-Pool. */
export async function redeemInvite(user: { id: string; email: string }, token: string) {
  const invite = await db.inviteToken.findUnique({ where: { tokenHash: sha256Hex(token) } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) throw new ProblemError('notFound', 'Diese Einladung ist abgelaufen oder wurde bereits verwendet.');
  if (invite.email !== user.email.toLowerCase()) throw new ProblemError('forbidden', `Diese Einladung gilt für ${invite.email}. Bitte mit dieser Adresse anmelden.`);
  await db.$transaction(async (tx) => {
    if (invite.kind === 'ORG_MEMBER') {
      await tx.orgMember.upsert({
        where: { organizationId_userId: { organizationId: invite.organizationId, userId: user.id } },
        create: { organizationId: invite.organizationId, userId: user.id, role: invite.role ?? 'VIEWER' },
        update: {},
      });
    } else if (invite.kind === 'EMPLOYEE' && invite.wardId) {
      await tx.verifiedEmployee.upsert({
        where: { wardId_userId: { wardId: invite.wardId, userId: user.id } },
        create: { wardId: invite.wardId, userId: user.id, method: 'EMPLOYER_INVITE' },
        update: {},
      });
    } else if (invite.kind === 'POOL' && invite.poolId) {
      const c = await tx.candidateProfile.findUnique({ where: { userId: user.id } });
      if (!c) throw new ProblemError('conflict', 'Bitte zuerst den Qualifikations-Pass anlegen und den Link erneut öffnen.');
      await tx.poolMember.upsert({
        where: { poolId_candidateId: { poolId: invite.poolId, candidateId: c.id } },
        create: { poolId: invite.poolId, candidateId: c.id },
        update: {},
      });
    }
    await tx.inviteToken.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
  });
  return invite;
}

// ───────── API-Schlüssel, Webhooks, Feeds (Spitalgruppe) ─────────

function assertPlanFeature(ctx: OrgContext, feature: 'api' | 'webhooks' | 'feedImport' | 'sso') {
  const limits = limitsFor(ctx.org.plan as Parameters<typeof limitsFor>[0]);
  if (!limits?.[feature]) throw new ProblemError('quotaExceeded', 'Diese Funktion ist im Abo "Spitalgruppe" enthalten.');
}

export async function createApiKey(ctx: OrgContext, name: string, scopes: ('jobs:write' | 'applications:read')[]) {
  assertPlanFeature(ctx, 'api');
  const key = generateApiKey();
  await db.apiKey.create({ data: { organizationId: ctx.org.id, name: name.slice(0, 80), prefix: key.prefix, keyHash: key.hash, scopes } });
  return key.plain;
}

export async function revokeApiKey(ctx: OrgContext, id: string) {
  await db.apiKey.updateMany({ where: { id, organizationId: ctx.org.id }, data: { revokedAt: new Date() } });
}

export async function createWebhook(ctx: OrgContext, url: string, events: string[]) {
  assertPlanFeature(ctx, 'webhooks');
  if (!/^https:\/\//.test(url)) throw new ProblemError('validation', 'Webhook-URLs müssen https verwenden.');
  const secret = randomToken(24);
  await db.webhookEndpoint.create({
    data: {
      organizationId: ctx.org.id,
      url,
      secret: encryptField(secret),
      events: events.filter((e) => (WEBHOOK_EVENTS as readonly string[]).includes(e)),
    },
  });
  return secret;
}

export async function deleteWebhook(ctx: OrgContext, id: string) {
  await db.webhookEndpoint.deleteMany({ where: { id, organizationId: ctx.org.id } });
}

export async function createFeed(ctx: OrgContext, input: { url: string; format: 'XML' | 'JSON'; wardId: string }) {
  assertPlanFeature(ctx, 'feedImport');
  const ward = await db.ward.findFirst({ where: { id: input.wardId, location: { organizationId: ctx.org.id } } });
  if (!ward) throw new ProblemError('notFound');
  if (!/^https:\/\//.test(input.url)) throw new ProblemError('validation', 'Feed-URLs müssen https verwenden.');
  const feed = await db.jobFeed.create({ data: { organizationId: ctx.org.id, wardId: ward.id, url: input.url, format: input.format } });
  await enqueue(QUEUES.feedImport, { feedId: feed.id });
  return feed;
}

export async function orgSettings(ctx: OrgContext) {
  return db.organization.findUniqueOrThrow({
    where: { id: ctx.org.id },
    include: {
      apiKeys: { orderBy: { createdAt: 'desc' } },
      webhooks: { orderBy: { createdAt: 'desc' }, select: { id: true, url: true, events: true, active: true, createdAt: true } },
      feeds: { orderBy: { createdAt: 'desc' } },
      locations: true,
    },
  });
}

export async function updateOrgDomains(ctx: OrgContext, domains: string[]) {
  const parsed = organizationInputSchema.shape.emailDomains.parse(domains);
  return db.organization.update({ where: { id: ctx.org.id }, data: { emailDomains: parsed } });
}
