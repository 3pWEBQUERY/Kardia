import { z } from 'zod';

import { Department, Profession, ShiftType } from '@kardia/db/enums';

import { COMMUTE_GEOHASH_PRECISION, isGeohash } from './geo.ts';

import type { PartialWardProfile } from './ward.ts';

/**
 * Lebensmodell-Suche (Modul B). Jede Bedingung ist Muss oder Wunsch. Ein Treffer,
 * der eine Muss-Bedingung verletzt, wird nie angezeigt (AK-B1); die Bedingungszeile
 * zeigt pro Bedingung erfüllt / nicht erfüllt / unbekannt – kein Prozent-Score.
 */

export const conditionMode = z.enum(['must', 'wish']);
export type ConditionMode = z.infer<typeof conditionMode>;

const num = (min: number, max: number) => z.number().min(min).max(max);

export const conditionSchema = z.discriminatedUnion('key', [
  z.object({ key: z.literal('noNights'), mode: conditionMode }),
  z.object({ key: z.literal('noSplitShifts'), mode: conditionMode }),
  z.object({ key: z.literal('weekdaysOnly'), mode: conditionMode }),
  z.object({ key: z.literal('noEarlyShifts'), mode: conditionMode }),
  z.object({ key: z.literal('noLateShifts'), mode: conditionMode }),
  z.object({ key: z.literal('no12hShifts'), mode: conditionMode }),
  z.object({ key: z.literal('maxRequiredShiftsPerWeek'), mode: conditionMode, value: num(1, 7) }),
  z.object({ key: z.literal('maxWeekendsPerMonth'), mode: conditionMode, value: num(0, 5) }),
  z.object({ key: z.literal('minRosterLeadWeeks'), mode: conditionMode, value: num(1, 26) }),
  z.object({ key: z.literal('minWishDays'), mode: conditionMode, value: num(1, 10) }),
  z.object({ key: z.literal('minSalary'), mode: conditionMode, value: num(30_000, 400_000) }),
  z.object({ key: z.literal('thirteenthSalary'), mode: conditionMode }),
  z.object({ key: z.literal('minNightAllowance'), mode: conditionMode, value: num(1, 100) }),
  z.object({ key: z.literal('minSundayAllowancePct'), mode: conditionMode, value: num(1, 200) }),
  z.object({ key: z.literal('minOnCallChfDay'), mode: conditionMode, value: num(1, 500) }),
  z.object({ key: z.literal('maxPatientsDay'), mode: conditionMode, value: num(1, 40) }),
  z.object({ key: z.literal('maxPatientsNight'), mode: conditionMode, value: num(1, 60) }),
  z.object({ key: z.literal('minSkillMixHfFhPct'), mode: conditionMode, value: num(10, 100) }),
  z.object({ key: z.literal('minOnboardingWeeks'), mode: conditionMode, value: num(1, 26) }),
  z.object({ key: z.literal('minVacationWeeks'), mode: conditionMode, value: num(4, 10) }),
  z.object({ key: z.literal('minEducationDays'), mode: conditionMode, value: num(1, 30) }),
  z.object({ key: z.literal('minEducationBudget'), mode: conditionMode, value: num(100, 20_000) }),
  z.object({ key: z.literal('childcare'), mode: conditionMode }),
  z.object({ key: z.literal('collectiveAgreement'), mode: conditionMode }),
  z.object({ key: z.literal('parking'), mode: conditionMode }),
  z.object({ key: z.literal('reentryFriendly'), mode: conditionMode }),
  z.object({ key: z.literal('pendingRecognition'), mode: conditionMode }),
  z.object({ key: z.literal('recognizedTraining'), mode: conditionMode }),
  z.object({
    key: z.literal('maxCommute'),
    mode: conditionMode,
    value: num(5, 180),
    transport: z.enum(['PT', 'CAR']),
  }),
]);

export type Condition = z.infer<typeof conditionSchema>;
export type ConditionKey = Condition['key'];

export const searchFilterSchema = z.object({
  q: z.string().trim().max(200).optional(),
  profession: z.enum(Profession).optional(),
  departments: z.array(z.enum(Department)).max(17).optional(),
  cantons: z.array(z.string().length(2)).max(26).optional(),
  workloadPct: z
    .number()
    .int()
    .min(10)
    .max(100)
    .refine((v) => v % 10 === 0)
    .optional(),
  /** Frühester eigener Start, ISO-Datum. */
  availableFrom: z.iso.date().optional(),
  /** Wohnort als Geohash (Präzision 7) – nie genauer (Datenminimierung). */
  origin: z
    .string()
    .refine((v) => isGeohash(v, COMMUTE_GEOHASH_PRECISION))
    .optional(),
  specialtyTitle: z.string().max(160).optional(),
  conditions: z.array(conditionSchema).max(25).default([]),
  sort: z.enum(['match', 'newest', 'salary']).default('match'),
  view: z.enum(['list', 'map']).default('list'),
});

export type SearchFilter = z.infer<typeof searchFilterSchema>;
export type SearchFilterInput = z.input<typeof searchFilterSchema>;

export const EMPTY_FILTER: SearchFilter = searchFilterSchema.parse({});

/** AK-B2: Filterzustand vollständig in der URL (`?f=` base64url-JSON, wie API v1). */
export function encodeFilter(filter: SearchFilterInput): string {
  const json = JSON.stringify(stripDefaults(filter));
  return base64UrlEncode(json);
}

export function decodeFilter(value: string | null | undefined): SearchFilter {
  if (!value) return EMPTY_FILTER;
  try {
    const parsed = searchFilterSchema.safeParse(JSON.parse(base64UrlDecode(value)));
    return parsed.success ? parsed.data : EMPTY_FILTER;
  } catch {
    return EMPTY_FILTER;
  }
}

function stripDefaults(filter: SearchFilterInput): Partial<SearchFilterInput> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(filter)) {
    if (v === undefined || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (k === 'sort' && v === 'match') continue;
    if (k === 'view' && v === 'list') continue;
    out[k] = v;
  }
  return out;
}

function base64UrlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): string {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Startseite: "Was darf auf keinen Fall sein?" → Muss-Bedingungen. */
export const DEALBREAKERS = {
  nights: { key: 'noNights', mode: 'must' },
  weekends: { key: 'maxWeekendsPerMonth', mode: 'must', value: 0 },
  splitShifts: { key: 'noSplitShifts', mode: 'must' },
  shortNotice: { key: 'minRosterLeadWeeks', mode: 'must', value: 4 },
} as const satisfies Record<string, Condition>;

export type Dealbreaker = keyof typeof DEALBREAKERS;

/** Daten, gegen die eine Bedingung geprüft wird: aufgelöstes Profil + Stellen-/Ortsfelder. */
export interface MatchSubject {
  profile: PartialWardProfile;
  hasParking: boolean | null;
  allowsPendingRecog: boolean | null;
  trainingCategory: string | null;
  /** Pendelzeit in Minuten je Verkehrsmittel, sofern schon berechnet. */
  commute?: Partial<Record<'PT' | 'CAR', number>>;
}

export type ConditionState = 'met' | 'unmet' | 'unknown';

export interface ConditionResult {
  condition: Condition;
  state: ConditionState;
  /** Tatsächlicher Wert der Stelle für die Anzeige ("Pendelzeit 34 min (Wunsch 30)"). */
  actual: number | string | boolean | null;
}

const NO_GAV = /^kein\s+gav$/i;

function cmp(actual: number | null | undefined, ok: (v: number) => boolean): ConditionState {
  if (actual == null) return 'unknown';
  return ok(actual) ? 'met' : 'unmet';
}

function flag(actual: boolean | null | undefined): ConditionState {
  if (actual == null) return 'unknown';
  return actual ? 'met' : 'unmet';
}

/** Dienstart ausgeschlossen: erfüllt, wenn die Station sie nicht im Dienstmodell hat. */
function excludeShift(condition: Condition, shifts: readonly ShiftType[] | null, type: ShiftType): ConditionResult {
  return {
    condition,
    state: shifts == null ? 'unknown' : shifts.includes(type) ? 'unmet' : 'met',
    actual: shifts == null ? null : !shifts.includes(type),
  };
}

export function evaluateCondition(condition: Condition, s: MatchSubject): ConditionResult {
  const p = s.profile;
  const shifts = p.shiftTypes ?? null;
  switch (condition.key) {
    case 'noNights':
      return {
        condition,
        state: shifts == null ? 'unknown' : shifts.includes(ShiftType.NIGHT) ? 'unmet' : 'met',
        actual: shifts == null ? null : !shifts.includes(ShiftType.NIGHT),
      };
    case 'noSplitShifts':
      return {
        condition,
        state: shifts == null ? 'unknown' : shifts.includes(ShiftType.SPLIT) ? 'unmet' : 'met',
        actual: shifts == null ? null : !shifts.includes(ShiftType.SPLIT),
      };
    case 'weekdaysOnly':
      return {
        condition,
        state:
          shifts == null ? 'unknown' : shifts.includes(ShiftType.WEEKDAYS_ONLY) ? 'met' : 'unmet',
        actual: shifts?.includes(ShiftType.WEEKDAYS_ONLY) ?? null,
      };
    case 'noEarlyShifts':
      return excludeShift(condition, shifts, ShiftType.EARLY);
    case 'noLateShifts':
      return excludeShift(condition, shifts, ShiftType.LATE);
    case 'no12hShifts':
      return excludeShift(condition, shifts, ShiftType.DAY_12H);
    case 'maxRequiredShiftsPerWeek':
      return {
        condition,
        state: cmp(p.minShiftsPerWeek, (v) => v <= condition.value),
        actual: p.minShiftsPerWeek ?? null,
      };
    case 'maxWeekendsPerMonth':
      return {
        condition,
        state: cmp(p.weekendsPerMonth, (v) => v <= condition.value),
        actual: p.weekendsPerMonth ?? null,
      };
    case 'minRosterLeadWeeks':
      return {
        condition,
        state: cmp(p.rosterLeadWeeks, (v) => v >= condition.value),
        actual: p.rosterLeadWeeks ?? null,
      };
    case 'minWishDays':
      return {
        condition,
        state: cmp(p.guaranteedWishDays, (v) => v >= condition.value),
        actual: p.guaranteedWishDays ?? null,
      };
    case 'minSalary':
      // Das Band muss den Wunschlohn erreichen; Angebote müssen ≥ Minimum liegen (AK-E2).
      return {
        condition,
        state: cmp(p.salaryMaxChf, (v) => v >= condition.value),
        actual: p.salaryMaxChf ?? null,
      };
    case 'thirteenthSalary':
      return { condition, state: flag(p.thirteenthSalary), actual: p.thirteenthSalary ?? null };
    case 'minNightAllowance':
      return {
        condition,
        state: cmp(p.nightAllowanceChfHour, (v) => v >= condition.value),
        actual: p.nightAllowanceChfHour ?? null,
      };
    case 'minSundayAllowancePct':
      return {
        condition,
        state: cmp(p.sundayAllowancePct, (v) => v >= condition.value),
        actual: p.sundayAllowancePct ?? null,
      };
    case 'minOnCallChfDay':
      return {
        condition,
        state: cmp(p.onCallChfDay, (v) => v >= condition.value),
        actual: p.onCallChfDay ?? null,
      };
    case 'minSkillMixHfFhPct':
      return {
        condition,
        state: cmp(p.skillMixHfFhPct, (v) => v >= condition.value),
        actual: p.skillMixHfFhPct ?? null,
      };
    case 'minEducationBudget':
      return {
        condition,
        state: cmp(p.educationBudgetChf, (v) => v >= condition.value),
        actual: p.educationBudgetChf ?? null,
      };
    case 'maxPatientsDay':
      return {
        condition,
        state: cmp(p.patientsPerNurseDay, (v) => v <= condition.value),
        actual: p.patientsPerNurseDay ?? null,
      };
    case 'maxPatientsNight':
      return {
        condition,
        state: cmp(p.patientsPerNurseNight, (v) => v <= condition.value),
        actual: p.patientsPerNurseNight ?? null,
      };
    case 'minOnboardingWeeks':
      return {
        condition,
        state: cmp(p.onboardingWeeks, (v) => v >= condition.value),
        actual: p.onboardingWeeks ?? null,
      };
    case 'minVacationWeeks':
      return {
        condition,
        state: cmp(p.vacationWeeks, (v) => v >= condition.value),
        actual: p.vacationWeeks ?? null,
      };
    case 'minEducationDays':
      return {
        condition,
        state: cmp(p.educationDays, (v) => v >= condition.value),
        actual: p.educationDays ?? null,
      };
    case 'childcare':
      return {
        condition,
        state: p.childcare == null ? 'unknown' : p.childcare === 'NONE' ? 'unmet' : 'met',
        actual: p.childcare ?? null,
      };
    case 'collectiveAgreement': {
      const gav = p.collectiveAgreement;
      return {
        condition,
        state: gav == null ? 'unknown' : NO_GAV.test(gav.trim()) ? 'unmet' : 'met',
        actual: gav ?? null,
      };
    }
    case 'parking':
      return { condition, state: flag(s.hasParking), actual: s.hasParking };
    case 'reentryFriendly':
      return { condition, state: flag(p.reentryFriendly), actual: p.reentryFriendly ?? null };
    case 'pendingRecognition':
      return { condition, state: flag(s.allowsPendingRecog), actual: s.allowsPendingRecog };
    case 'recognizedTraining':
      return {
        condition,
        state: s.trainingCategory ? 'met' : 'unmet',
        actual: s.trainingCategory,
      };
    case 'maxCommute': {
      const minutes = s.commute?.[condition.transport];
      return {
        condition,
        state: cmp(minutes, (v) => v <= condition.value),
        actual: minutes ?? null,
      };
    }
  }
}

export interface MatchResult {
  results: ConditionResult[];
  /** Mindestens eine Muss-Bedingung ist sicher verletzt → nie anzeigen (AK-B1). */
  excluded: boolean;
  mustMet: number;
  mustTotal: number;
  wishMet: number;
  wishTotal: number;
}

export function evaluateMatch(
  conditions: readonly Condition[],
  subject: MatchSubject,
): MatchResult {
  const results = conditions.map((c) => evaluateCondition(c, subject));
  const must = results.filter((r) => r.condition.mode === 'must');
  const wish = results.filter((r) => r.condition.mode === 'wish');
  // Anzeige-Reihenfolge der Chips: Muss vor Wunsch.
  results.sort((a, b) => Number(a.condition.mode === 'wish') - Number(b.condition.mode === 'wish'));
  return {
    results,
    excluded: must.some((r) => r.state === 'unmet'),
    mustMet: must.filter((r) => r.state === 'met').length,
    mustTotal: must.length,
    wishMet: wish.filter((r) => r.state === 'met').length,
    wishTotal: wish.length,
  };
}

export interface RankInput {
  match: MatchResult;
  stale: boolean;
  completeness: number;
  publishedAt: Date | null;
}

/**
 * Sortierung "match": erfüllte Muss-Bedingungen, dann Wünsche (PRD 6.B). Veraltete
 * Profile werden zurückgestuft (AK-A3); Hervorhebung nur über Vollständigkeit und
 * Aktualität, nie über Bezahlung (PRD 15).
 */
export function compareRank(a: RankInput, b: RankInput): number {
  return (
    b.match.mustMet - a.match.mustMet ||
    b.match.wishMet - a.match.wishMet ||
    Number(a.stale) - Number(b.stale) ||
    b.completeness - a.completeness ||
    (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)
  );
}

/** Upsert einer Bedingung in einem Filter (für Chips mit Entfernen-Knopf). */
export function withCondition(filter: SearchFilter, condition: Condition): SearchFilter {
  return {
    ...filter,
    conditions: [...filter.conditions.filter((c) => c.key !== condition.key), condition],
  };
}

export function withoutCondition(filter: SearchFilter, key: ConditionKey): SearchFilter {
  return { ...filter, conditions: filter.conditions.filter((c) => c.key !== key) };
}
