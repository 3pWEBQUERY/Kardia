import { DAILY_COST_ALARM_USD, dailyCostUsd } from '@kardia/ai';
import { CONFIRMATION_MAX_AGE_DAYS, QUEUES, daysUntilStale } from '@kardia/core';

import { db, enqueue, log } from '../context.ts';
import { config } from '../env.ts';

/** Zeitgesteuerte Aufgaben mit kleinem Umfang. */

/** Angebote sind 14 Tage gültig (Modul E); beide Seiten erfahren vom Ablauf. */
export async function handleOfferExpiry(now = new Date()): Promise<{ expired: number }> {
  const due = await db().offer.findMany({
    where: { status: 'SENT', expiresAt: { lt: now } },
    select: { id: true, organizationId: true, organization: { select: { name: true } }, job: { select: { title: true } }, candidate: { select: { userId: true } } },
  });
  if (due.length === 0) return { expired: 0 };
  // Nur Angebote, die in diesem Lauf noch offen waren (gleichzeitige Antwort gewinnt).
  await db().offer.updateMany({ where: { id: { in: due.map((o) => o.id) }, status: 'SENT' }, data: { status: 'EXPIRED' } });
  const expired = await db().offer.findMany({ where: { id: { in: due.map((o) => o.id) }, status: 'EXPIRED' }, select: { id: true } });
  const ids = new Set(expired.map((o) => o.id));
  for (const o of due.filter((x) => ids.has(x.id))) {
    const data = { offerId: o.id, orgName: o.organization.name, jobTitle: o.job.title };
    await enqueue(QUEUES.emailSend, { template: 'offer.expired', userId: o.candidate.userId, data });
    await enqueue(QUEUES.pushSend, { kind: 'offer.expired', userId: o.candidate.userId, data });
    await enqueue(QUEUES.emailSend, { template: 'offer.expired', orgId: o.organizationId, data });
  }
  return { expired: ids.size };
}

/** Nachweise mit abgelaufenem Gültigkeitsdatum → "abgelaufen" (Modul D), mit Hinweis an die Person. */
export async function handleCredentialExpiry(now = new Date()): Promise<{ expired: number }> {
  const today = new Date(now.toISOString().slice(0, 10));
  const due = await db().credential.findMany({
    where: { status: { in: ['VERIFIED', 'SUBMITTED', 'IN_REVIEW'] }, validUntil: { lt: today } },
    select: { id: true, title: true, validUntil: true, candidate: { select: { userId: true } } },
  });
  if (due.length === 0) return { expired: 0 };
  await db().credential.updateMany({ where: { id: { in: due.map((c) => c.id) } }, data: { status: 'EXPIRED' } });
  for (const c of due) {
    const data = { credentialId: c.id, title: c.title, validUntil: c.validUntil };
    await enqueue(QUEUES.emailSend, { template: 'credential.expired', userId: c.candidate.userId, data });
    await enqueue(QUEUES.pushSend, { kind: 'credential.expired', userId: c.candidate.userId, data });
  }
  return { expired: due.length };
}

/** Schicht-Erinnerung 12 h vorher (PRD 13.3); vergangene Schichten → COMPLETED. */
export async function handleShiftReminders(now = new Date()): Promise<{ reminded: number; completed: number }> {
  const from = new Date(now.getTime() + 11 * 3600_000);
  const to = new Date(now.getTime() + 12 * 3600_000);
  const shifts = await db().shift.findMany({
    where: { status: 'BOOKED', startsAt: { gte: from, lte: to }, bookedByCandidateId: { not: null } },
    include: { ward: { select: { name: true } } },
  });
  let reminded = 0;
  for (const s of shifts) {
    const already = await db().event.findFirst({ where: { name: 'shift.reminder', entityId: s.id } });
    if (already || !s.bookedByCandidateId) continue;
    const c = await db().candidateProfile.findUnique({ where: { id: s.bookedByCandidateId }, select: { userId: true } });
    if (!c) continue;
    await enqueue(QUEUES.pushSend, { kind: 'shift.reminder', userId: c.userId, data: { shiftId: s.id, wardName: s.ward.name, startsAt: s.startsAt } });
    await db().event.create({ data: { name: 'shift.reminder', userId: c.userId, entityId: s.id } });
    reminded++;
  }
  const completed = await db().shift.updateMany({ where: { status: 'BOOKED', endsAt: { lt: now } }, data: { status: 'COMPLETED' } });
  return { reminded, completed: completed.count };
}

/** AK-A3: Arbeitgeber 10 Tage vor Ablauf der 180 Tage an die Bestätigung erinnern. */
export async function handleStaleProfiles(now = new Date()): Promise<{ notified: number }> {
  const threshold = new Date(now.getTime() - (CONFIRMATION_MAX_AGE_DAYS - 10) * 86400_000);
  const wards = await db().ward.findMany({
    where: { confirmedAt: { lt: threshold } },
    include: { location: { select: { organizationId: true } } },
  });
  let notified = 0;
  for (const w of wards) {
    const already = await db().event.findFirst({ where: { name: 'ward.stale_notice', entityId: w.id, createdAt: { gt: w.confirmedAt } } });
    if (already) continue;
    await enqueue(QUEUES.emailSend, {
      template: 'ward.stale',
      orgId: w.location.organizationId,
      data: { wardId: w.id, wardName: w.name, daysLeft: Math.max(0, daysUntilStale(w.confirmedAt, now)) },
    });
    await db().event.create({ data: { name: 'ward.stale_notice', orgId: w.location.organizationId, entityId: w.id } });
    notified++;
  }
  return { notified };
}

/** Globaler Tageskosten-Alarm bei USD 25 (PRD 9.3), höchstens einmal pro Tag. */
export async function handleAiCostAlarm(now = new Date()): Promise<{ costUsd: number; alarmed: boolean }> {
  const cost = await dailyCostUsd(db(), now);
  if (cost < DAILY_COST_ALARM_USD) return { costUsd: cost, alarmed: false };
  const startOfDay = new Date(now.toISOString().slice(0, 10));
  const already = await db().event.findFirst({ where: { name: 'ai.cost_alarm', createdAt: { gte: startOfDay } } });
  if (already) return { costUsd: cost, alarmed: false };
  await db().event.create({ data: { name: 'ai.cost_alarm', props: { costUsd: cost } } });
  if (config.mail.opsEmail) {
    await enqueue(QUEUES.emailSend, { template: 'ops.cost-alarm', to: config.mail.opsEmail, data: { costUsd: cost, limitUsd: DAILY_COST_ALARM_USD } });
  } else {
    log.error('KI-Kostenalarm, aber OPS_EMAIL ist nicht gesetzt', { costUsd: cost });
  }
  return { costUsd: cost, alarmed: true };
}
