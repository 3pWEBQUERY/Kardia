import 'server-only';

import { ProblemError, can, type Permission } from '@kardia/core';

import { type ApiPrincipal, type ApiScope } from './api.ts';
import { db } from './db.ts';

import type { OrgContext } from './session.ts';

/**
 * Org-Kontext für die REST-API ohne Cookies (PRD 12.1): entweder Org-API-Schlüssel mit
 * Scope oder Sitzung eines Mitglieds mit passender Rolle. Bei mehreren Mitgliedschaften
 * wählt der Header `Kardia-Organization` die Organisation.
 */
export async function orgContextForApi(
  who: ApiPrincipal,
  req: Request,
  need: { scope: ApiScope; permission: Permission },
): Promise<OrgContext> {
  if (who.kind === 'apiKey') {
    if (!who.organizationId || !who.scopes.includes(need.scope)) {
      throw new ProblemError('forbidden', `Der API-Schlüssel braucht den Scope ${need.scope}.`);
    }
    const org = await db.organization.findUniqueOrThrow({ where: { id: who.organizationId } });
    return {
      user: { id: `apikey:${org.id}`, email: '', name: 'API', isAdmin: false, locale: 'DE_CH' },
      session: { id: 'apikey', createdAt: new Date(), authMethod: 'apikey' },
      role: 'RECRUITER',
      org: { id: org.id, name: org.name, plan: org.plan, verification: org.verification, secoRegistryMatch: org.secoRegistryMatch },
    };
  }
  if (who.kind !== 'user' || !who.userId) throw new ProblemError('unauthorized');
  const preferred = req.headers.get('kardia-organization');
  const memberships = await db.orgMember.findMany({
    where: { userId: who.userId, ...(preferred ? { organizationId: preferred } : {}) },
    include: { organization: true, user: true },
    orderBy: { id: 'asc' },
  });
  const m = memberships[0];
  if (!m) throw new ProblemError('forbidden', 'Kein Mitglied einer Organisation.');
  if (!can(m.role, need.permission)) throw new ProblemError('forbidden');
  return {
    user: { id: m.user.id, email: m.user.email, name: m.user.name, isAdmin: m.user.isAdmin, locale: m.user.locale },
    session: { id: 'api', createdAt: new Date(), authMethod: null },
    role: m.role,
    org: {
      id: m.organization.id,
      name: m.organization.name,
      plan: m.organization.plan,
      verification: m.organization.verification,
      secoRegistryMatch: m.organization.secoRegistryMatch,
    },
  };
}
