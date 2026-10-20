import 'server-only';

import { PLAN_LIMITS, ProblemError } from '@kardia/core';


import { audit } from '../audit.ts';
import { db } from '../db.ts';

import type { CurrentSession } from '../session.ts';
import type { PlanTier } from '@kardia/db';

/** Ergebnisse des Worker-Abgleichs (UID-Register, SECO) je Organisation. */
export async function orgCheckEvents(orgIds: string[]) {
  if (orgIds.length === 0) return new Map<string, unknown>();
  const events = await db.event.findMany({
    where: { name: 'organization.checked', entityId: { in: orgIds } },
    orderBy: { createdAt: 'desc' },
  });
  const map = new Map<string, unknown>();
  for (const e of events) if (e.entityId && !map.has(e.entityId)) map.set(e.entityId, e.props);
  return map;
}

/**
 * Abo manuell setzen (Gründungspartner oder bezahlte QR-Rechnung, PRD 15).
 * `plan = null` beendet das Abo. Immer mit Audit-Log.
 */
export async function setOrganizationPlan(
  s: CurrentSession,
  id: string,
  input: { plan: PlanTier | null; validUntil: string | null; foundingPartner: boolean },
) {
  const before = await db.organization.findUnique({ where: { id } });
  if (!before) throw new ProblemError('notFound');
  if (input.validUntil && Number.isNaN(Date.parse(input.validUntil))) {
    throw new ProblemError('validation', 'Das Datum «gültig bis» ist ungültig. Format JJJJ-MM-TT verwenden.');
  }
  const after = await db.organization.update({
    where: { id },
    data: {
      plan: input.plan,
      planValidUntil: input.validUntil ? new Date(input.validUntil) : null,
      foundingPartner: input.foundingPartner,
      offerQuotaPerMonth: input.plan ? PLAN_LIMITS[input.plan].offersPerMonth : 0,
    },
  });
  await audit({
    actorId: s.user.id,
    action: 'organization.plan',
    entity: 'Organization',
    entityId: id,
    before: { plan: before.plan, planValidUntil: before.planValidUntil, foundingPartner: before.foundingPartner },
    after: { plan: after.plan, planValidUntil: after.planValidUntil, foundingPartner: after.foundingPartner },
  });
  return after;
}
