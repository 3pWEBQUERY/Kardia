import { z } from 'zod';

import {
  MemberRole,
  PlanTier,
  type MemberRole as MemberRoleT,
  type PlanTier as PlanTierT,
} from '@kardia/db/enums';

import { CANTONS } from './geo.ts';

/** Arbeitgeber: Organisation → Standorte → Stationen → Stellen. */

/** UID nach BFS: CHE-123.456.789, Prüfziffer Modulo 11 (Gewichte 5,4,3,2,7,6,5,4). */
export function normalizeUid(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 9) return null;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const check = 11 - (sum % 11);
  const expected = check === 11 ? 0 : check;
  if (expected === 10 || expected !== Number(digits[8])) return null;
  return `CHE-${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}`;
}

export const uidSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const uid = normalizeUid(v);
    if (!uid) {
      ctx.addIssue({ code: 'custom', message: 'invalidUid' });
      return z.NEVER;
    }
    return uid;
  });

const domain = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/, { message: 'invalidDomain' });

export const organizationInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  uid: uidSchema,
  emailDomains: z.array(domain).min(1).max(10),
});

export const locationInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  street: z.string().trim().min(2).max(160),
  postalCode: z.string().regex(/^\d{4}$/),
  city: z.string().trim().min(2).max(80),
  canton: z.enum(CANTONS),
  lat: z.number().min(45.8).max(47.9),
  lng: z.number().min(5.9).max(10.6),
  hasParking: z.boolean(),
});

export type LocationInput = z.infer<typeof locationInputSchema>;

/** Rollen pro Mitglied: was darf wer? Serverseitig in jeder Service-Funktion geprüft. */
export type Permission =
  | 'org.manage'
  | 'billing.manage'
  | 'team.manage'
  | 'wards.edit'
  | 'jobs.edit'
  | 'jobs.publish'
  | 'applications.read'
  | 'applications.update'
  | 'marketplace.offer'
  | 'pool.manage'
  | 'apikeys.manage';

const ROLE_PERMISSIONS: Record<MemberRoleT, readonly Permission[]> = {
  OWNER: [
    'org.manage',
    'billing.manage',
    'team.manage',
    'wards.edit',
    'jobs.edit',
    'jobs.publish',
    'applications.read',
    'applications.update',
    'marketplace.offer',
    'pool.manage',
    'apikeys.manage',
  ],
  RECRUITER: [
    'wards.edit',
    'jobs.edit',
    'jobs.publish',
    'applications.read',
    'applications.update',
    'marketplace.offer',
    'pool.manage',
  ],
  WARD_LEAD: ['wards.edit', 'jobs.edit', 'applications.read', 'applications.update', 'pool.manage'],
  VIEWER: ['applications.read'],
};

export function can(role: MemberRoleT, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const memberInviteSchema = z.object({
  email: z.email(),
  role: z.enum(MemberRole),
});

/** Pricing (PRD 15). `null` = unbegrenzt. */
export interface PlanLimits {
  activeJobs: number | null;
  wards: number | null;
  users: number | null;
  offersPerMonth: number;
  poolMembers: number | null;
  benchmark: boolean;
  flexPool: boolean;
  sso: boolean;
  api: boolean;
  webhooks: boolean;
  feedImport: boolean;
  multipleLocations: boolean;
  monthlyChf: number;
}

export const PLAN_LIMITS: Record<PlanTierT, PlanLimits> = {
  PRAXIS: {
    activeJobs: 2,
    wards: 1,
    users: 2,
    offersPerMonth: 0,
    poolMembers: 0,
    benchmark: false,
    flexPool: false,
    sso: false,
    api: false,
    webhooks: false,
    feedImport: false,
    multipleLocations: false,
    monthlyChf: 79,
  },
  INSTITUTION: {
    activeJobs: 25,
    wards: null,
    users: 10,
    offersPerMonth: 20,
    poolMembers: 100,
    benchmark: true,
    flexPool: true,
    sso: false,
    api: false,
    webhooks: false,
    feedImport: false,
    multipleLocations: false,
    monthlyChf: 690,
  },
  SPITALGRUPPE: {
    activeJobs: null,
    wards: null,
    users: null,
    offersPerMonth: 100,
    poolMembers: null,
    benchmark: true,
    flexPool: true,
    sso: true,
    api: true,
    webhooks: true,
    feedImport: true,
    multipleLocations: true,
    monthlyChf: 2400,
  },
};

/** Einzelinserat: CHF 290 pro Stelle, 60 Tage, 1 Station, KI-Import, Pipeline. */
export const SINGLE_LISTING = { priceChf: 290, days: 60 } as const;

/** Jährliche Vorauszahlung mit 2 Monaten Rabatt. */
export function yearlyPriceChf(plan: PlanTierT): number {
  return PLAN_LIMITS[plan].monthlyChf * 10;
}

/** Gründungspartner: erste 30 Institutionen im Kanton ZH, 6 Monate "Institution" kostenlos. */
export const FOUNDING_PARTNER = {
  slots: 30,
  months: 6,
  plan: PlanTier.INSTITUTION,
  canton: 'ZH',
} as const;

export function limitsFor(plan: PlanTierT | null): PlanLimits | null {
  return plan ? PLAN_LIMITS[plan] : null;
}

/**
 * Wirksames Abo: `planValidUntil` begrenzt Abos aus QR-Rechnung, Gründungspartnerschaft
 * und gekündigten Stripe-Abos. Abgelaufen → kein Abo (Funktionen wie ohne Abo).
 */
export function effectivePlan<P extends string>(
  org: { plan: P | null; planValidUntil?: Date | null },
  now: Date = new Date(),
): P | null {
  if (!org.plan) return null;
  if (org.planValidUntil && org.planValidUntil.getTime() <= now.getTime()) return null;
  return org.plan;
}

/** Tage bis zum Ablauf eines befristeten Abos (aufgerundet); null ohne Frist oder Abo. */
export function daysUntilPlanExpiry(org: { plan: string | null; planValidUntil?: Date | null }, now: Date = new Date()): number | null {
  if (!org.plan || !org.planValidUntil) return null;
  return Math.ceil((org.planValidUntil.getTime() - now.getTime()) / 86_400_000);
}

/**
 * Kontingente für Stationen und Standorte (PRD 15). Ohne Abo (Einzelinserate) gilt
 * keine Obergrenze beim Anlegen – bezahlt wird je veröffentlichter Stelle.
 */
export function wardQuotaExceeded(plan: PlanTierT | null, existingWards: number): boolean {
  const limit = plan ? PLAN_LIMITS[plan].wards : null;
  return limit !== null && existingWards >= limit;
}

export function locationQuotaExceeded(plan: PlanTierT | null, existingLocations: number): boolean {
  return plan !== null && !PLAN_LIMITS[plan].multipleLocations && existingLocations >= 1;
}
