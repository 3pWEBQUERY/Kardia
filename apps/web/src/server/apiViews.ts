import 'server-only';

import { isStale, resolveJobProfile, type PartialWardProfile } from '@kardia/core';

import type { getJobPublic } from './services/jobs.ts';
import type { SearchHit } from './services/search.ts';
import type { getWardPublic } from './services/wards.ts';

/** Öffentliche API-Darstellungen: nur, was auch die Web-Oberfläche zeigt. */

export function hitView(h: SearchHit) {
  return {
    id: h.jobId,
    title: h.title,
    profession: h.profession,
    workloadMinPct: h.workloadMinPct,
    workloadMaxPct: h.workloadMaxPct,
    startDate: h.startDate,
    publishedAt: h.publishedAt?.toISOString() ?? null,
    allowsPendingRecog: h.allowsPendingRecog,
    specialtyTitle: h.specialtyTitle,
    trainingCategory: h.trainingCategory,
    ward: { id: h.ward.id, name: h.ward.name, department: h.ward.department, rosterPattern: h.ward.rosterPattern, confirmedAt: h.ward.confirmedAt.toISOString() },
    organization: h.org,
    location: { city: h.location.city, canton: h.location.canton, lat: h.location.lat, lng: h.location.lng, hasParking: h.location.hasParking },
    profile: profileView(h.profile),
    commuteMinutes: h.commute,
    conditions: h.match.results.map((r) => ({ condition: r.condition, state: r.state, actual: r.actual })),
    stale: h.stale,
  };
}

/** Stationsprofil ohne interne Felder (IDs, Übersetzungs-Rohdaten, Zeitstempel). */
export function profileView(p: PartialWardProfile | Record<string, unknown>) {
  const { id: _id, locationId: _l, createdAt: _c, updatedAt: _u, translations: _t, ...rest } = p as Record<string, unknown>;
  return rest;
}

/** KI-6-Übersetzungen der Freitexte je Sprache (fr-CH, it-CH, en); Quelle bleibt Deutsch. */
export function translationsView(raw: unknown): Record<string, { description: string | null }> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, { description: string | null }> = {};
  for (const locale of ['fr-CH', 'it-CH', 'en']) {
    const entry = (raw as Record<string, unknown>)[locale];
    const description = entry && typeof entry === 'object' ? (entry as { description?: unknown }).description : null;
    if (typeof description === 'string' && description.trim()) out[locale] = { description };
  }
  return out;
}

type WardPublic = NonNullable<Awaited<ReturnType<typeof getWardPublic>>>;

export function wardView(v: WardPublic) {
  const { ward, reality } = v;
  return {
    id: ward.id,
    name: ward.name,
    department: ward.department,
    confirmedAt: ward.confirmedAt.toISOString(),
    stale: isStale(ward.confirmedAt),
    organization: { id: ward.location.organization.id, name: ward.location.organization.name },
    location: {
      name: ward.location.name,
      street: ward.location.street,
      postalCode: ward.location.postalCode,
      city: ward.location.city,
      canton: ward.location.canton,
      lat: ward.location.lat,
      lng: ward.location.lng,
      hasParking: ward.location.hasParking,
    },
    profile: profileView(ward),
    translations: translationsView(ward.translations),
    rosterPattern: ward.rosterPattern,
    reality,
    employerComments: ward.fieldComments.map((c) => ({ field: c.field, body: c.body })),
    benchmarks: ward.benchmarks.map((b) => ({ field: b.field, wardValue: b.wardValue, medianValue: b.medianValue, peerCount: b.peerCount })),
    jobs: ward.jobs.map((j) => ({ id: j.id, title: j.title, profession: j.profession, workloadMinPct: j.workloadMinPct, workloadMaxPct: j.workloadMaxPct })),
    questions: ward.questions.map((q) => ({ id: q.id, body: q.body, answer: q.answer, answeredAt: q.answeredAt?.toISOString() ?? null, createdAt: q.createdAt.toISOString() })),
  };
}

type JobPublic = NonNullable<Awaited<ReturnType<typeof getJobPublic>>>;

export function jobView(v: JobPublic) {
  const { job } = v;
  return {
    id: job.id,
    title: job.title,
    profession: job.profession,
    workloadMinPct: job.workloadMinPct,
    workloadMaxPct: job.workloadMaxPct,
    startDate: job.startDate ? job.startDate.toISOString().slice(0, 10) : null,
    publishedAt: job.publishedAt?.toISOString() ?? null,
    allowsPendingRecog: job.allowsPendingRecog,
    training: {
      recognized: v.recognizedTraining,
      specialtyTitle: job.specialtyTitle,
      trainingCategory: job.trainingCategory,
      maxCreditableYears: job.maxCreditableYears,
      weeklyHours: job.weeklyHours,
      structuredTrainingHoursWeek: job.structuredTrainingHoursWeek,
      rotations: job.rotations,
      assistantPositions: job.assistantPositions,
    },
    profile: profileView(resolveJobProfile(v.ward as unknown as PartialWardProfile, job.overrides)),
    ward: wardView(v),
  };
}
