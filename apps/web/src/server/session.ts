import 'server-only';

import { headers } from 'next/headers';
import { forbidden, redirect } from 'next/navigation';
import { cache } from 'react';

import { ADMIN_SESSION_MAX_AGE_SEC, ProblemError, can, effectivePlan, type Permission } from '@kardia/core';


import { auth } from './auth.ts';
import { db } from './db.ts';

import type { MemberRole } from '@kardia/db';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  locale: string;
}

export interface CurrentSession {
  user: SessionUser;
  session: { id: string; createdAt: Date; authMethod: string | null };
}

/** Aktuelle Sitzung (Cookie oder Bearer), einmal pro Request. */
export const getSession = cache(async (): Promise<CurrentSession | null> => {
  const result = await auth().api.getSession({ headers: await headers() });
  if (!result) return null;
  const u = result.user as typeof result.user & { isAdmin?: boolean; locale?: string; lastActiveAt?: Date | string };
  // Aktivität höchstens einmal pro Tag festhalten (Löschung inaktiver Konten nach 24 Monaten, PRD 14.1).
  const last = u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : 0;
  if (Date.now() - last > 24 * 3600_000) {
    void db.user.update({ where: { id: u.id }, data: { lastActiveAt: new Date() } }).catch(() => undefined);
  }
  const s = result.session as typeof result.session & { authMethod?: string | null };
  return {
    user: { id: u.id, email: u.email, name: u.name, isAdmin: !!u.isAdmin, locale: u.locale ?? 'DE_CH' },
    session: { id: s.id, createdAt: new Date(s.createdAt), authMethod: s.authMethod ?? null },
  };
});

function signInRedirect(next: string): never {
  redirect(`/sign-in?next=${encodeURIComponent(next)}`);
}

export async function requireUser(next = '/me'): Promise<CurrentSession> {
  const s = await getSession();
  if (!s) signInRedirect(next);
  return s;
}

export const getCandidate = cache(async (userId: string) =>
  db.candidateProfile.findUnique({ where: { userId } }),
);

/** Fachperson mit Profil; ohne Profil → Pass anlegen. */
export async function requireCandidate(next = '/me') {
  const s = await requireUser(next);
  const candidate = await getCandidate(s.user.id);
  if (!candidate) redirect(`/me/pass?setup=1&next=${encodeURIComponent(next)}`);
  return { ...s, candidate };
}

export interface OrgContext extends CurrentSession {
  org: { id: string; name: string; plan: string | null; verification: string; secoRegistryMatch: boolean };
  role: MemberRole;
}

const ORG_COOKIE = 'kardia_org';

/** Arbeitgeber-Kontext: Mitgliedschaft + Rolle; jede Service-Funktion prüft Rolle und Mandant. */
export async function requireOrg(permission?: Permission, next = '/employer'): Promise<OrgContext> {
  const s = await requireUser(next);
  const { cookies } = await import('next/headers');
  const preferred = (await cookies()).get(ORG_COOKIE)?.value;
  const memberships = await db.orgMember.findMany({
    where: { userId: s.user.id },
    include: { organization: true },
    orderBy: { id: 'asc' },
  });
  if (memberships.length === 0) redirect('/employer/onboarding');
  const m = memberships.find((x) => x.organizationId === preferred) ?? memberships[0];
  if (!m) redirect('/employer/onboarding');
  if (permission && !can(m.role, permission)) throw new ProblemError('forbidden');
  return {
    ...s,
    role: m.role,
    org: {
      id: m.organization.id,
      name: m.organization.name,
      // Abgelaufene Abos (planValidUntil) zählen wie kein Abo.
      plan: effectivePlan(m.organization),
      verification: m.organization.verification,
      secoRegistryMatch: m.organization.secoRegistryMatch,
    },
  };
}

/** Wie `requireOrg`, aber für Seiten: fehlende Berechtigung ergibt eine echte 403-Seite. */
export async function requireOrgPage(permission?: Permission, next = '/employer'): Promise<OrgContext> {
  try {
    return await requireOrg(permission, next);
  } catch (e) {
    if (e instanceof ProblemError && e.kind === 'forbidden') forbidden();
    throw e;
  }
}

/**
 * Nur lokale Entwicklung: `DEV_ADMIN_MAGIC_LINK=1` lässt für die Admin-Konsole auch eine
 * E-Mail-Link-Sitzung zu (ohne Passkey-Gerät testbar). In Produktion wirkungslos.
 */
function devAdminMagicLink(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.DEV_ADMIN_MAGIC_LINK === '1';
}

/** Admin-Konsole: Passkey-Sitzung, höchstens 12 h alt (PRD 14.2). */
export async function requireAdmin(): Promise<CurrentSession> {
  const s = await requireUser('/admin');
  if (!s.user.isAdmin) throw new ProblemError('forbidden');
  const ageSec = (Date.now() - s.session.createdAt.getTime()) / 1000;
  const methodOk = s.session.authMethod === 'passkey' || (devAdminMagicLink() && s.session.authMethod === 'magic-link');
  if (!methodOk || ageSec > ADMIN_SESSION_MAX_AGE_SEC) {
    redirect('/sign-in?admin=1&next=/admin');
  }
  return s;
}
