import {
  QUEUES,
  alertDue,
  encodeFilter,
  evaluateMatch,
  resolveJobProfile,
  searchFilterSchema,
  type PartialWardProfile,
  type SearchFilter,
} from '@kardia/core';


import { db, enqueue } from '../context.ts';
import { config } from '../env.ts';

import type { AlertFrequency } from '@kardia/db';

/**
 * Gespeicherte Suchen (Modul B): stündlicher Lauf. Sofort = jede Stunde, täglich um
 * 07 Uhr, wöchentlich montags um 07 Uhr (Schweizer Zeit). Treffer müssen alle
 * Muss-Bedingungen erfüllen (AK-B1); Pendelzeit ist hier unbekannt und schliesst nicht aus.
 */
export function zurichClock(now: Date): { hour: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  return { hour, weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd) };
}

export function isDueNow(frequency: AlertFrequency, lastSentAt: Date | null, now: Date): boolean {
  if (!alertDue(frequency, lastSentAt, now)) return false;
  if (frequency === 'INSTANT') return true;
  const { hour, weekday } = zurichClock(now);
  if (frequency === 'DAILY') return hour === 7;
  return hour === 7 && weekday === 1;
}

type JobRow = Awaited<ReturnType<typeof loadJobs>>[number];

async function loadJobs(since: Date) {
  return db().job.findMany({
    where: { status: 'PUBLISHED', publishedAt: { gt: since }, ward: { location: { organization: { verification: 'VERIFIED' } } } },
    include: { ward: { include: { location: { include: { organization: { select: { name: true } } } } } } },
    orderBy: { publishedAt: 'desc' },
    take: 2000,
  });
}

export function jobMatchesFilter(job: JobRow, filter: SearchFilter): boolean {
  if (filter.profession && job.profession !== filter.profession) return false;
  if (filter.departments?.length && !filter.departments.includes(job.ward.department)) return false;
  if (filter.cantons?.length && !filter.cantons.includes(job.ward.location.canton)) return false;
  if (filter.workloadPct !== undefined && (job.workloadMinPct > filter.workloadPct || job.workloadMaxPct < filter.workloadPct)) return false;
  if (filter.specialtyTitle && job.specialtyTitle !== filter.specialtyTitle) return false;
  if (filter.q) {
    const q = filter.q.toLowerCase();
    if (!job.title.toLowerCase().includes(q) && !job.ward.location.organization.name.toLowerCase().includes(q)) return false;
  }
  const profile = resolveJobProfile(job.ward as unknown as PartialWardProfile, job.overrides);
  const match = evaluateMatch(filter.conditions, {
    profile,
    hasParking: job.ward.location.hasParking,
    allowsPendingRecog: job.allowsPendingRecog,
    trainingCategory: job.trainingCategory,
  });
  return !match.excluded;
}

/**
 * Kanal der Treffermeldung (PRD 13.3, Wahl pro Suchabo). Gewählter Web Push ohne
 * abonniertes Gerät fällt auf E-Mail zurück, damit kein Treffer verloren geht.
 */
export function alertChannels(channel: 'EMAIL' | 'PUSH' | 'BOTH', pushDevices: number): { email: boolean; push: boolean } {
  const canPush = pushDevices > 0;
  switch (channel) {
    case 'EMAIL':
      return { email: true, push: false };
    case 'PUSH':
      return { email: !canPush, push: canPush };
    case 'BOTH':
      return { email: true, push: canPush };
  }
}

export async function handleSearchAlerts(now = new Date()): Promise<{ sent: number; checked: number }> {
  const searches = await db().savedSearch.findMany({ include: { candidate: { select: { userId: true } } } });
  const due = searches.filter((s) => isDueNow(s.frequency, s.lastSentAt, now));
  if (due.length === 0) return { sent: 0, checked: 0 };
  const oldest = due.reduce((min, s) => Math.min(min, (s.lastSentAt ?? new Date(now.getTime() - 7 * 86400_000)).getTime()), now.getTime());
  const jobs = await loadJobs(new Date(oldest));
  let sent = 0;
  for (const s of due) {
    const parsed = searchFilterSchema.safeParse(s.filters);
    if (!parsed.success) continue;
    const since = s.lastSentAt ?? new Date(now.getTime() - 7 * 86400_000);
    const hits = jobs.filter((j) => j.publishedAt && j.publishedAt > since && jobMatchesFilter(j, parsed.data));
    if (hits.length > 0) {
      const searchUrl = `${config.appOrigin}/search?f=${encodeFilter(parsed.data)}`;
      const data = {
        searchName: s.name,
        searchUrl,
        count: hits.length,
        jobs: hits.slice(0, 10).map((j) => ({
          title: j.title,
          orgName: j.ward.location.organization.name,
          url: `${config.appOrigin}/jobs/${j.id}`,
          salaryMinChf: j.ward.salaryMinChf,
        })),
      };
      const pushDevices = s.channel === 'EMAIL' ? 0 : await db().pushSubscription.count({ where: { userId: s.candidate.userId } });
      const route = alertChannels(s.channel, pushDevices);
      if (route.push) await enqueue(QUEUES.pushSend, { kind: 'search.alert', userId: s.candidate.userId, data: { searchName: s.name, searchUrl } });
      if (route.email) await enqueue(QUEUES.emailSend, { template: 'search.alert', userId: s.candidate.userId, data });
      sent++;
    }
    await db().savedSearch.update({ where: { id: s.id }, data: { lastSentAt: now } });
  }
  return { sent, checked: due.length };
}
