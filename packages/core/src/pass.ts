import { z } from 'zod';

import {
  CredentialStatus,
  CredentialType,
  Department,
  Profession,
  Registry,
  type CredentialStatus as CredentialStatusT,
  type Department as DepartmentT,
  type Profession as ProfessionT,
  type Registry as RegistryT,
} from '@kardia/db/enums';

import { decodeGeohash, encodeGeohash } from './geo.ts';

/** Qualifikations-Pass (Modul D). */

export const LANGUAGE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];

export const credentialInputSchema = z
  .object({
    type: z.enum(CredentialType),
    title: z.string().trim().min(2).max(200),
    issuer: z.string().trim().max(200).nullable(),
    issuedAt: z.iso.date().nullable(),
    validUntil: z.iso.date().nullable(),
    registry: z.enum(Registry).nullable(),
    registryNumber: z.string().trim().max(40).nullable(),
    fileId: z.string().nullable(),
  })
  .refine((c) => c.type !== CredentialType.REGISTRY_ENTRY || (c.registry && c.registryNumber), {
    message: 'Registereintrag braucht Register und Nummer',
    path: ['registryNumber'],
  });

export type CredentialInput = z.infer<typeof credentialInputSchema>;

/**
 * Wohnort für die Pendelzeit (Modul B): nur Koordinaten in der Schweiz (inkl. Grenzraum).
 * Die Adresse selbst wird nie gespeichert.
 */
export const homeLocationSchema = z.object({
  lat: z.number().min(45.7).max(47.9),
  lng: z.number().min(5.8).max(10.6),
});

export type HomeLocation = z.infer<typeof homeLocationSchema>;

/** Gespeichert wird nur die Mitte der Geohash-Zelle (~150 m), genug für die Pendelzeit. */
export function coarseHome(home: HomeLocation): HomeLocation {
  return decodeGeohash(encodeGeohash(home.lat, home.lng));
}

export const passInputSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(30).nullable(),
  profession: z.enum(Profession),
  yearsExperience: z.number().int().min(0).max(60),
  workAuthorizedCh: z.boolean().nullable(),
  experiences: z
    .array(z.object({ department: z.enum(Department), years: z.number().min(0).max(60) }))
    .max(17),
  languages: z
    .array(z.object({ language: z.string().length(2), level: z.enum(LANGUAGE_LEVELS) }))
    .max(10),
  /** Fehlt = unverändert, null = entfernen. */
  home: homeLocationSchema.nullable().optional(),
  /** Zustimmung zu AGB und Datenschutz; Pflicht, solange keine Zustimmung gespeichert ist. */
  acceptTerms: z.boolean().optional(),
});

export type PassInput = z.infer<typeof passInputSchema>;

/** Felder, deren Änderung einen verifizierten Nachweis zurücksetzt (AK-D2). */
const VERIFIED_LOCKED_FIELDS = [
  'type',
  'title',
  'issuer',
  'issuedAt',
  'registry',
  'registryNumber',
  'fileId',
] as const;

export function credentialEditResetsStatus(
  current: { status: CredentialStatusT } & Partial<
    Record<(typeof VERIFIED_LOCKED_FIELDS)[number], unknown>
  >,
  next: Partial<Record<(typeof VERIFIED_LOCKED_FIELDS)[number], unknown>>,
): boolean {
  if (current.status !== CredentialStatus.VERIFIED && current.status !== CredentialStatus.IN_REVIEW)
    return false;
  return VERIFIED_LOCKED_FIELDS.some(
    (k) => k in next && normalize(next[k]) !== normalize(current[k]),
  );
}

function normalize(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (v == null) return '';
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : JSON.stringify(v);
}

/**
 * Q-2 (offen): Zuordnung Beruf → Register. Vorläufig: MedReg für Ärztinnen und Ärzte,
 * GesReg für Berufe nach Gesundheitsberufegesetz (GesBG), NAREG für die übrigen
 * Gesundheitsberufe. Wird in der Admin-Redaktion bestätigt, bevor sie verbindlich ist.
 */
export const REGISTRY_BY_PROFESSION: Record<ProfessionT, RegistryT> = {
  PHYSICIAN: Registry.MEDREG,
  NURSE_HF_FH: Registry.GESREG,
  PHYSIOTHERAPIST: Registry.GESREG,
  OCCUPATIONAL_THERAPIST: Registry.GESREG,
  MIDWIFE: Registry.GESREG,
  SPEECH_THERAPIST: Registry.NAREG,
  FAGE: Registry.NAREG,
  AGS: Registry.NAREG,
  NURSING_AID_SRK: Registry.NAREG,
  MPA: Registry.NAREG,
  MTRA: Registry.NAREG,
  BMA: Registry.NAREG,
  PARAMEDIC: Registry.NAREG,
  OR_TECHNICIAN: Registry.NAREG,
};

/** Öffentliche Registersuche für die Prüfqueue (Registerlink). */
export const REGISTRY_SEARCH_URL: Record<RegistryT, string> = {
  MEDREG: 'https://www.healthreg-public.admin.ch/medreg/search',
  GESREG: 'https://www.healthreg-public.admin.ch/gesreg/search',
  NAREG: 'https://www.nareg.ch/',
};

/** AK-D3: Prüfung ≤ 2 Arbeitstage. */
export const REVIEW_SLA_BUSINESS_DAYS = 2;

export interface PassMatchInput {
  candidate: {
    profession: ProfessionT;
    experiences: { department: DepartmentT; years: number }[];
    languages: { language: string; level: string }[];
    credentials: { type: string; status: string }[];
    workAuthorizedCh: boolean | null;
  };
  job: { profession: ProfessionT; department: DepartmentT; allowsPendingRecog: boolean };
  /** Arbeitssprache der Station (ISO 639-1), Standard Deutsch. */
  workLanguage?: string;
}

const LEVEL_RANK: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };

/**
 * Pass-Match in Prozent für die KPI "qualifizierte Bewerbungen" (≥ 70 %). Ranking-Hilfe,
 * nie Grundlage für eine automatische Ablehnung (PRD 9.4, revDSG Art. 21).
 */
export function passMatchScore({ candidate, job, workLanguage = 'de' }: PassMatchInput): number {
  let score = 0;
  if (candidate.profession === job.profession) score += 40;
  const verified = candidate.credentials.filter((c) => c.status === CredentialStatus.VERIFIED);
  if (verified.some((c) => c.type === CredentialType.DIPLOMA)) score += 15;
  if (
    verified.some(
      (c) =>
        c.type === CredentialType.REGISTRY_ENTRY ||
        c.type === CredentialType.RECOGNITION_SRK ||
        c.type === CredentialType.RECOGNITION_MEBEKO,
    )
  ) {
    score += 10;
  } else if (job.allowsPendingRecog) {
    score += 5;
  }
  const deptYears = candidate.experiences.find((e) => e.department === job.department)?.years ?? 0;
  score += deptYears >= 2 ? 15 : deptYears >= 1 ? 10 : 0;
  const lang = candidate.languages.find((l) => l.language === workLanguage);
  const rank = lang ? (LEVEL_RANK[lang.level] ?? 0) : 0;
  score += rank >= 4 ? 15 : rank === 3 ? 8 : 0;
  if (candidate.workAuthorizedCh) score += 5;
  return Math.min(100, score);
}
