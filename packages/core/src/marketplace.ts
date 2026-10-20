import { z } from 'zod';

import {
  Department,
  Profession,
  type Department as DepartmentT,
  type Profession as ProfessionT,
} from '@kardia/db/enums';

import { conditionSchema, type Condition } from './search.ts';

/**
 * Umgekehrter Marktplatz (Modul E). Fachpersonen veröffentlichen ein anonymes
 * Verfügbarkeitsprofil; Arbeitgeber senden strukturierte Angebote.
 */

export const OFFER_VALIDITY_DAYS = 14;
export const OFFER_NOTE_MAX = 600;

export const offerInputSchema = z.object({
  candidateRef: z.string().min(10), // anonyme Profil-ID, nie die User-ID
  jobId: z.string().min(10),
  salaryChf: z.number().int().min(20_000).max(1_000_000),
  workloadPct: z
    .number()
    .int()
    .min(10)
    .max(100)
    .refine((v) => v % 10 === 0),
  startDate: z.iso.date(),
  note: z.string().trim().max(OFFER_NOTE_MAX).optional(),
});

export type OfferInput = z.infer<typeof offerInputSchema>;

export type OfferRuleIssue = 'belowSalaryBand' | 'workloadOutsideJob' | 'startInPast';

/** AK-E2 und Plausibilität: Angebot unter dem Lohnband-Minimum wird abgelehnt. */
export function offerRuleIssues(
  offer: Pick<OfferInput, 'salaryChf' | 'workloadPct' | 'startDate'>,
  job: { salaryMinChf: number; workloadMinPct: number; workloadMaxPct: number },
  today = new Date(),
): OfferRuleIssue[] {
  const issues: OfferRuleIssue[] = [];
  // Lohnangaben gelten bei 100 %; das Angebot nennt den Jahreslohn bei 100 %.
  if (offer.salaryChf < job.salaryMinChf) issues.push('belowSalaryBand');
  if (offer.workloadPct < job.workloadMinPct || offer.workloadPct > job.workloadMaxPct) {
    issues.push('workloadOutsideJob');
  }
  if (offer.startDate < today.toISOString().slice(0, 10)) issues.push('startInPast');
  return issues;
}

export function offerExpiry(from = new Date()): Date {
  return new Date(from.getTime() + OFFER_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
}

export const offerResponseSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('interested') }),
  z.object({
    action: z.literal('decline'),
    reason: z.enum(['salary', 'workload', 'location', 'conditions', 'timing', 'other']).optional(),
  }),
]);

export type OfferResponse = z.infer<typeof offerResponseSchema>;

export const marketplaceProfileSchema = z.object({
  marketplaceActive: z.boolean(),
  desiredWorkloadPct: z
    .number()
    .int()
    .min(10)
    .max(100)
    .refine((v) => v % 10 === 0)
    .nullable(),
  earliestStart: z.iso.date().nullable(),
  homeDistrict: z.string().trim().max(80).nullable(),
  mustConditions: z.array(conditionSchema).max(15),
});

/**
 * Anonymes Profil (Modul E, AK-E1): Beruf, Fachbereich, Erfahrung, Region (Bezirk),
 * Pensum, Muss-Bedingungen, frühester Start, Pass-Status. Kein Name, kein Foto, kein
 * Geburtsjahr, keine aktuellen Arbeitgeber. Diese Funktion ist der einzige Weg, wie
 * Kandidatendaten in die Marktplatz-Suche gelangen – sie arbeitet mit einer Positivliste.
 */
export interface AnonymousProfile {
  ref: string;
  profession: ProfessionT;
  departments: { department: DepartmentT; years: number }[];
  yearsExperience: number;
  district: string | null;
  desiredWorkloadPct: number | null;
  earliestStart: string | null;
  mustConditions: Condition[];
  passVerified: boolean;
  verifiedCredentialCount: number;
  languages: { language: string; level: string }[];
}

export interface AnonymizableCandidate {
  profession: ProfessionT;
  yearsExperience: number;
  homeDistrict: string | null;
  desiredWorkloadPct: number | null;
  earliestStart: Date | null;
  mustConditions: unknown;
  experiences: { department: DepartmentT; years: number }[];
  languages: { language: string; level: string }[];
  credentials: { status: string }[];
}

/**
 * `ref` ist eine pro Organisation verschlüsselte Kennung (siehe `marketplaceRef` in
 * crypto.ts) – nie die Profil-ID, damit ein Arbeitgeber ein anonymes Profil nicht mit
 * einer Bewerbung derselben Person verknüpfen kann.
 */
export function toAnonymousProfile(c: AnonymizableCandidate, ref: string): AnonymousProfile {
  const parsed = z.array(conditionSchema).safeParse(c.mustConditions ?? []);
  const verified = c.credentials.filter((cr) => cr.status === 'VERIFIED').length;
  return {
    ref,
    profession: z.enum(Profession).parse(c.profession),
    departments: c.experiences.map((e) => ({
      department: z.enum(Department).parse(e.department),
      years: Math.round(e.years),
    })),
    yearsExperience: c.yearsExperience,
    district: c.homeDistrict,
    desiredWorkloadPct: c.desiredWorkloadPct,
    earliestStart: c.earliestStart ? c.earliestStart.toISOString().slice(0, 10) : null,
    mustConditions: parsed.success ? parsed.data : [],
    passVerified: verified > 0 && c.credentials.every((cr) => cr.status !== 'REJECTED'),
    verifiedCredentialCount: verified,
    languages: c.languages.map((l) => ({ language: l.language, level: l.level })),
  };
}

/** Schlüssel, die ein anonymes Profil niemals enthalten darf (Test AK-E1 im CI). */
export const IDENTIFYING_KEYS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'userId',
  'homeLat',
  'homeLng',
  'birthYear',
  'photo',
  'image',
  'name',
  'currentEmployer',
] as const;

/** Aggregierte Ablehnungsgründe (AK-E3) – nur ab 3 Antworten, sonst nichts. */
export const DECLINE_AGGREGATE_MIN = 3;

export function aggregateDeclineReasons(
  reasons: (string | null)[],
): { reason: string; count: number }[] | null {
  if (reasons.length < DECLINE_AGGREGATE_MIN) return null;
  const counts = new Map<string, number>();
  for (const r of reasons) counts.set(r ?? 'none', (counts.get(r ?? 'none') ?? 0) + 1);
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}
