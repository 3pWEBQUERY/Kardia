import { z } from 'zod';

import {
  OrgVerification,
  Profession,
  type OrgVerification as OrgVerificationT,
} from '@kardia/db/enums';

import {
  jobOverridesSchema,
  missingRequiredFields,
  resolveJobProfile,
  type PartialWardProfile,
  type WardProfileKey,
} from './ward.ts';

const workload = z
  .number()
  .int()
  .min(10)
  .max(100)
  .refine((v) => v % 10 === 0, { message: 'Pensum in 10er-Schritten' });

export const jobInputSchema = z
  .object({
    wardId: z.string().min(10),
    title: z.string().trim().min(4).max(160),
    profession: z.enum(Profession),
    workloadMinPct: workload,
    workloadMaxPct: workload,
    startDate: z.iso.date().nullable(),
    overrides: jobOverridesSchema.nullable(),
    allowsPendingRecog: z.boolean().default(false),
    // Modul F – ärztliche Weiterbildung
    specialtyTitle: z.string().trim().max(160).nullable().default(null),
    trainingCategory: z.string().trim().max(10).nullable().default(null),
    maxCreditableYears: z.number().min(0).max(6).nullable().default(null),
    weeklyHours: z.number().int().min(20).max(60).nullable().default(null),
    structuredTrainingHoursWeek: z.number().int().min(0).max(20).nullable().default(null),
    rotations: z.array(z.string().trim().min(2).max(80)).max(10).default([]),
    assistantPositions: z.number().int().min(1).max(200).nullable().default(null),
  })
  .refine((j) => j.workloadMaxPct >= j.workloadMinPct, {
    message: 'workloadOrder',
    path: ['workloadMaxPct'],
  });

export type JobInput = z.infer<typeof jobInputSchema>;

export const jobPatchSchema = z
  .object({
    title: z.string().trim().min(4).max(160),
    profession: z.enum(Profession),
    workloadMinPct: workload,
    workloadMaxPct: workload,
    startDate: z.iso.date().nullable(),
    overrides: jobOverridesSchema.nullable(),
    allowsPendingRecog: z.boolean(),
    specialtyTitle: z.string().trim().max(160).nullable(),
    trainingCategory: z.string().trim().max(10).nullable(),
    maxCreditableYears: z.number().min(0).max(6).nullable(),
    weeklyHours: z.number().int().min(20).max(60).nullable(),
    structuredTrainingHoursWeek: z.number().int().min(0).max(20).nullable(),
    rotations: z.array(z.string().trim().min(2).max(80)).max(10),
    assistantPositions: z.number().int().min(1).max(200).nullable(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED']),
  })
  .partial();

export type PublishBlocker =
  | { kind: 'missingField'; field: WardProfileKey }
  | { kind: 'missingLocation' }
  | { kind: 'orgNotVerified'; verification: OrgVerificationT }
  | { kind: 'agencyReview' }
  | { kind: 'planLimit' }
  | { kind: 'jobWorkloadOutsideWard' };

export interface PublishCheckInput {
  ward: PartialWardProfile;
  overrides: unknown;
  job: {
    workloadMinPct: number;
    workloadMaxPct: number;
    profession: string;
    specialtyTitle: string | null;
  };
  location: { street: string; lat: number; lng: number } | null;
  org: { verification: OrgVerificationT; secoRegistryMatch: boolean };
  activeJobs: number;
  activeJobLimit: number | null;
}

/**
 * Darf eine Stelle veröffentlicht werden?
 * AK-A1: kein Pflichtfeld leer. AK-C1: SECO-Treffer nie ohne Admin-Freigabe.
 * Agenturfrei (Modul C): ohne konkrete Station und Adresse technisch unmöglich.
 */
export function publishBlockers(input: PublishCheckInput): PublishBlocker[] {
  const blockers: PublishBlocker[] = [];
  const profile = resolveJobProfile(input.ward, input.overrides);
  for (const field of missingRequiredFields(profile))
    blockers.push({ kind: 'missingField', field });
  if (
    !input.location?.street ||
    !Number.isFinite(input.location.lat) ||
    !Number.isFinite(input.location.lng)
  ) {
    blockers.push({ kind: 'missingLocation' });
  }
  if (
    input.org.verification === OrgVerification.AGENCY_REVIEW ||
    (input.org.secoRegistryMatch && input.org.verification !== OrgVerification.VERIFIED)
  ) {
    blockers.push({ kind: 'agencyReview' });
  } else if (input.org.verification !== OrgVerification.VERIFIED) {
    blockers.push({ kind: 'orgNotVerified', verification: input.org.verification });
  }
  if (input.activeJobLimit != null && input.activeJobs >= input.activeJobLimit)
    blockers.push({ kind: 'planLimit' });
  if (
    profile.minWorkloadPct != null &&
    profile.maxWorkloadPct != null &&
    (input.job.workloadMinPct < profile.minWorkloadPct ||
      input.job.workloadMaxPct > profile.maxWorkloadPct)
  ) {
    blockers.push({ kind: 'jobWorkloadOutsideWard' });
  }
  return blockers;
}

/** AK-F1: Arztstelle ohne Weiterbildungsstätten-Angabe → "keine anerkannte Weiterbildung". */
export function hasRecognizedTraining(job: {
  profession: string;
  specialtyTitle: string | null;
  trainingCategory: string | null;
}): boolean {
  return job.profession === Profession.PHYSICIAN && !!job.specialtyTitle && !!job.trainingCategory;
}

/** Strukturierte Daten nach schema.org/JobPosting inkl. Lohnangabe (Go-to-Market, SEO). */
export function jobPostingJsonLd(input: {
  url: string;
  title: string;
  description: string;
  datePosted: Date;
  validThrough: Date | null;
  orgName: string;
  street: string;
  postalCode: string;
  city: string;
  canton: string;
  salaryMinChf: number;
  salaryMaxChf: number;
  workloadMinPct: number;
  workloadMaxPct: number;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: input.title,
    description: input.description,
    datePosted: input.datePosted.toISOString().slice(0, 10),
    ...(input.validThrough ? { validThrough: input.validThrough.toISOString() } : {}),
    employmentType:
      input.workloadMaxPct < 100
        ? 'PART_TIME'
        : input.workloadMinPct < 100
          ? ['FULL_TIME', 'PART_TIME']
          : 'FULL_TIME',
    directApply: true,
    url: input.url,
    hiringOrganization: { '@type': 'Organization', name: input.orgName },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: input.street,
        postalCode: input.postalCode,
        addressLocality: input.city,
        addressRegion: input.canton,
        addressCountry: 'CH',
      },
    },
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'CHF',
      value: {
        '@type': 'QuantitativeValue',
        minValue: input.salaryMinChf,
        maxValue: input.salaryMaxChf,
        unitText: 'YEAR',
      },
    },
  };
}
