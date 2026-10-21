import { QUEUES, daysUntilPlanExpiry } from '@kardia/core';

import { db, enqueue, log } from '../context.ts';

const PLAN_LABEL: Record<string, string> = { PRAXIS: 'Praxis', INSTITUTION: 'Institution', SPITALGRUPPE: 'Spitalgruppe' };

/** Vorwarnung 14 Tage vor Ablauf befristeter Abos (PRD 15). */
export const PLAN_EXPIRY_NOTICE_DAYS = 14;

/**
 * Täglich: Owner 14 Tage vor Ablauf von `planValidUntil` einmal warnen; abgelaufene
 * Abos einmal protokollieren. Die Wirkung (keine Abo-Funktionen, Stellen unsichtbar)
 * ergibt sich aus `effectivePlan`, der Datensatz bleibt für die Abrechnung erhalten.
 */
export async function handlePlanExpiry(now = new Date()): Promise<{ warned: number; expired: number }> {
  const horizon = new Date(now.getTime() + PLAN_EXPIRY_NOTICE_DAYS * 86_400_000);
  const orgs = await db().organization.findMany({
    where: { plan: { not: null }, planValidUntil: { not: null, lte: horizon } },
    select: { id: true, name: true, plan: true, planValidUntil: true },
  });
  let warned = 0;
  let expired = 0;
  for (const org of orgs) {
    if (!org.planValidUntil) continue;
    const days = daysUntilPlanExpiry(org, now) ?? 0;
    if (days <= 0) {
      const logged = await db().event.findFirst({ where: { name: 'plan.expired', orgId: org.id, createdAt: { gte: org.planValidUntil } } });
      if (!logged) {
        await db().event.create({ data: { name: 'plan.expired', orgId: org.id, props: { plan: org.plan, validUntil: org.planValidUntil.toISOString() } } });
        log.info('Abo abgelaufen', { orgId: org.id, plan: org.plan });
        expired++;
      }
      continue;
    }
    // Einmal je Ablaufdatum (eine Verlängerung setzt ein neues Datum und damit eine neue Warnung).
    const already = await db().event.findFirst({
      where: { name: 'plan.expiry_notice', orgId: org.id, entityId: org.planValidUntil.toISOString() },
    });
    if (already) continue;
    const owners = await db().orgMember.findMany({
      where: { organizationId: org.id, role: 'OWNER', user: { deletedAt: null } },
      select: { user: { select: { email: true } } },
    });
    for (const o of owners) {
      await enqueue(QUEUES.emailSend, {
        template: 'plan.expiring',
        to: o.user.email,
        data: { orgName: org.name, planLabel: PLAN_LABEL[org.plan ?? ''] ?? org.plan, validUntil: org.planValidUntil.toISOString(), daysLeft: days },
      });
    }
    await db().event.create({ data: { name: 'plan.expiry_notice', orgId: org.id, entityId: org.planValidUntil.toISOString() } });
    warned++;
  }
  return { warned, expired };
}
