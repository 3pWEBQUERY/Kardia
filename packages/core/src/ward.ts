import { z } from 'zod';

import {
  ChildcareType,
  Department,
  RosterCode,
  ShiftType,
  type Department as DepartmentT,
  type RosterCode as RosterCodeT,
} from '@kardia/db/enums';

/**
 * Stationsprofil (Modul A). Die Station trägt die Arbeitsbedingungen; eine Stelle
 * erbt alle Felder und darf einzelne überschreiben (`Job.overrides`).
 */

/** Fachbereiche, für die der Betreuungsschlüssel Pflicht ist ("Ja (Akut/Langzeit)"). */
export const ACUTE_OR_LONG_TERM: readonly DepartmentT[] = [
  Department.ICU,
  Department.EMERGENCY,
  Department.SURGERY,
  Department.INTERNAL_MEDICINE,
  Department.GERIATRICS,
  Department.PSYCHIATRY,
  Department.PEDIATRICS,
  Department.ONCOLOGY,
  Department.LONG_TERM_CARE,
  Department.REHABILITATION,
  Department.MATERNITY,
];

/**
 * Q-9 (offen): Muster-Dienstplan ab R1 oder erst R2 als Pflichtfeld. Kardia setzt
 * ihn als Pflicht, weil die Dienstrhythmus-Vorschau sonst leer bliebe; ein Schalter
 * statt einer verstreuten Bedingung, damit der Entscheid an einer Stelle fällt.
 */
export const ROSTER_PATTERN_REQUIRED = true;

/** AK-A4: Spanne max. 40 % des Minimums. */
export const MAX_SALARY_SPREAD = 0.4;

/** AK-A3: Bestätigung spätestens alle 180 Tage. */
export const CONFIRMATION_MAX_AGE_DAYS = 180;

export const ROSTER_DAYS = 28;

export type FieldKind = 'int' | 'float' | 'bool' | 'enum' | 'enumList' | 'text' | 'roster';
export type Better = 'higher' | 'lower' | 'true';

export interface WardFieldMeta {
  key: WardProfileKey;
  kind: FieldKind;
  /** Einheit als Suffix im Eingabefeld ("CHF", "%", "Wo"); Übersetzung über i18n `units.*`. */
  unit?: 'chf' | 'chfHour' | 'chfDay' | 'chfMonth' | 'pct' | 'weeks' | 'days' | 'count' | 'ratio';
  required: boolean | 'acuteOrLongTerm';
  /** Welche Ausprägung im Stellen-Vergleich fett wird. */
  better?: Better;
  /** Darf im Realitäts-Check von Mitarbeitenden bestätigt werden (Modul G). */
  realityCheck: boolean;
  /** Fliesst in den Benchmark (Arbeitgeber-Cockpit R2). */
  benchmark: boolean;
  group: 'pay' | 'shifts' | 'workload' | 'care' | 'development' | 'family' | 'contract' | 'reentry';
}

const workloadPct = z
  .number()
  .int()
  .min(10)
  .max(100)
  .refine((v) => v % 10 === 0, { message: 'Pensum in 10er-Schritten' });

const chf = z.number().int().min(0).max(1_000_000);

export const rosterPatternSchema = z
  .array(z.enum(RosterCode))
  .length(ROSTER_DAYS, { message: 'Muster-Dienstplan braucht genau 28 Einträge' });

export const refresherCourseSchema = z.object({
  provider: z.string().min(2).max(120),
  durationDays: z.number().int().min(1).max(365),
  costCoveredChf: chf,
});

/** Alle Felder des Stationsprofils, ohne Bedingungen zwischen Feldern. */
export const wardProfileShape = z.object({
  name: z.string().trim().min(2).max(120),
  department: z.enum(Department),
  salaryMinChf: chf.min(20_000),
  salaryMaxChf: chf.min(20_000),
  thirteenthSalary: z.boolean(),
  nightAllowanceChfHour: z.number().int().min(0).max(200),
  sundayAllowancePct: z.number().int().min(0).max(200),
  onCallChfDay: z.number().int().min(0).max(2000).nullable(),
  shiftTypes: z.array(z.enum(ShiftType)).min(1),
  rosterLeadWeeks: z.number().int().min(0).max(52),
  weekendsPerMonth: z.number().min(0).max(5),
  guaranteedWishDays: z.number().int().min(0).max(31),
  minWorkloadPct: workloadPct,
  maxWorkloadPct: workloadPct,
  minShiftsPerWeek: z.number().int().min(1).max(7).nullable(),
  patientsPerNurseDay: z.number().min(0.5).max(60).nullable(),
  patientsPerNurseNight: z.number().min(0.5).max(80).nullable(),
  skillMixHfFhPct: z.number().int().min(0).max(100).nullable(),
  skillMixFagePct: z.number().int().min(0).max(100).nullable(),
  skillMixAidPct: z.number().int().min(0).max(100).nullable(),
  onboardingWeeks: z.number().int().min(0).max(52),
  vacationWeeks: z.number().int().min(4).max(12),
  educationBudgetChf: chf.nullable(),
  educationDays: z.number().int().min(0).max(60).nullable(),
  childcare: z.enum(ChildcareType),
  childcareAllowanceChf: z.number().int().min(0).max(5000).nullable(),
  collectiveAgreement: z.string().trim().min(2).max(160),
  rosterPattern: rosterPatternSchema,
  reentryFriendly: z.boolean(),
  reentryOnboardingWeeks: z.number().int().min(1).max(52).nullable(),
  reentryAccompaniedShifts: z.number().int().min(0).max(100).nullable(),
  reentryRefresher: z.array(refresherCourseSchema).max(5).nullable(),
  description: z.string().trim().max(4000).nullable(),
});

export type WardProfile = z.infer<typeof wardProfileShape>;
export type WardProfileKey = keyof WardProfile;
export type PartialWardProfile = Partial<{ [K in WardProfileKey]: WardProfile[K] | null }>;

export const WARD_FIELDS: readonly WardFieldMeta[] = [
  {
    key: 'department',
    kind: 'enum',
    required: true,
    realityCheck: false,
    benchmark: false,
    group: 'care',
  },
  {
    key: 'salaryMinChf',
    kind: 'int',
    unit: 'chf',
    required: true,
    better: 'higher',
    realityCheck: true,
    benchmark: true,
    group: 'pay',
  },
  {
    key: 'salaryMaxChf',
    kind: 'int',
    unit: 'chf',
    required: true,
    better: 'higher',
    realityCheck: true,
    benchmark: true,
    group: 'pay',
  },
  {
    key: 'thirteenthSalary',
    kind: 'bool',
    required: true,
    better: 'true',
    realityCheck: false,
    benchmark: false,
    group: 'pay',
  },
  {
    key: 'nightAllowanceChfHour',
    kind: 'int',
    unit: 'chfHour',
    required: true,
    better: 'higher',
    realityCheck: true,
    benchmark: true,
    group: 'pay',
  },
  {
    key: 'sundayAllowancePct',
    kind: 'int',
    unit: 'pct',
    required: true,
    better: 'higher',
    realityCheck: true,
    benchmark: true,
    group: 'pay',
  },
  {
    key: 'onCallChfDay',
    kind: 'int',
    unit: 'chfDay',
    required: false,
    better: 'higher',
    realityCheck: true,
    benchmark: false,
    group: 'pay',
  },
  {
    key: 'shiftTypes',
    kind: 'enumList',
    required: true,
    realityCheck: true,
    benchmark: false,
    group: 'shifts',
  },
  {
    key: 'rosterLeadWeeks',
    kind: 'int',
    unit: 'weeks',
    required: true,
    better: 'higher',
    realityCheck: true,
    benchmark: true,
    group: 'shifts',
  },
  {
    key: 'weekendsPerMonth',
    kind: 'float',
    unit: 'count',
    required: true,
    better: 'lower',
    realityCheck: true,
    benchmark: true,
    group: 'shifts',
  },
  {
    key: 'guaranteedWishDays',
    kind: 'int',
    unit: 'days',
    required: true,
    better: 'higher',
    realityCheck: true,
    benchmark: true,
    group: 'shifts',
  },
  {
    key: 'rosterPattern',
    kind: 'roster',
    required: ROSTER_PATTERN_REQUIRED,
    realityCheck: false,
    benchmark: false,
    group: 'shifts',
  },
  {
    key: 'minWorkloadPct',
    kind: 'int',
    unit: 'pct',
    required: true,
    better: 'lower',
    realityCheck: false,
    benchmark: false,
    group: 'workload',
  },
  {
    key: 'maxWorkloadPct',
    kind: 'int',
    unit: 'pct',
    required: true,
    better: 'higher',
    realityCheck: false,
    benchmark: false,
    group: 'workload',
  },
  {
    key: 'minShiftsPerWeek',
    kind: 'int',
    unit: 'count',
    required: false,
    better: 'lower',
    realityCheck: true,
    benchmark: false,
    group: 'workload',
  },
  {
    key: 'patientsPerNurseDay',
    kind: 'float',
    unit: 'ratio',
    required: 'acuteOrLongTerm',
    better: 'lower',
    realityCheck: true,
    benchmark: true,
    group: 'care',
  },
  {
    key: 'patientsPerNurseNight',
    kind: 'float',
    unit: 'ratio',
    required: 'acuteOrLongTerm',
    better: 'lower',
    realityCheck: true,
    benchmark: true,
    group: 'care',
  },
  {
    key: 'skillMixHfFhPct',
    kind: 'int',
    unit: 'pct',
    required: false,
    better: 'higher',
    realityCheck: true,
    benchmark: false,
    group: 'care',
  },
  {
    key: 'skillMixFagePct',
    kind: 'int',
    unit: 'pct',
    required: false,
    realityCheck: true,
    benchmark: false,
    group: 'care',
  },
  {
    key: 'skillMixAidPct',
    kind: 'int',
    unit: 'pct',
    required: false,
    realityCheck: true,
    benchmark: false,
    group: 'care',
  },
  {
    key: 'onboardingWeeks',
    kind: 'int',
    unit: 'weeks',
    required: true,
    better: 'higher',
    realityCheck: true,
    benchmark: true,
    group: 'development',
  },
  {
    key: 'vacationWeeks',
    kind: 'int',
    unit: 'weeks',
    required: true,
    better: 'higher',
    realityCheck: false,
    benchmark: true,
    group: 'contract',
  },
  {
    key: 'educationBudgetChf',
    kind: 'int',
    unit: 'chf',
    required: false,
    better: 'higher',
    realityCheck: true,
    benchmark: false,
    group: 'development',
  },
  {
    key: 'educationDays',
    kind: 'int',
    unit: 'days',
    required: false,
    better: 'higher',
    realityCheck: true,
    benchmark: false,
    group: 'development',
  },
  {
    key: 'childcare',
    kind: 'enum',
    required: false,
    realityCheck: false,
    benchmark: false,
    group: 'family',
  },
  {
    key: 'childcareAllowanceChf',
    kind: 'int',
    unit: 'chfMonth',
    required: false,
    better: 'higher',
    realityCheck: false,
    benchmark: false,
    group: 'family',
  },
  {
    key: 'collectiveAgreement',
    kind: 'text',
    required: true,
    realityCheck: false,
    benchmark: false,
    group: 'contract',
  },
  {
    key: 'reentryFriendly',
    kind: 'bool',
    required: false,
    better: 'true',
    realityCheck: false,
    benchmark: false,
    group: 'reentry',
  },
  {
    key: 'reentryOnboardingWeeks',
    kind: 'int',
    unit: 'weeks',
    required: false,
    better: 'higher',
    realityCheck: true,
    benchmark: false,
    group: 'reentry',
  },
  {
    key: 'reentryAccompaniedShifts',
    kind: 'int',
    unit: 'count',
    required: false,
    better: 'higher',
    realityCheck: true,
    benchmark: false,
    group: 'reentry',
  },
];

export const REALITY_CHECK_FIELDS = WARD_FIELDS.filter((f) => f.realityCheck).map((f) => f.key);
export const BENCHMARK_FIELDS = WARD_FIELDS.filter((f) => f.benchmark).map((f) => f.key);

/** Felder, die eine Stelle über `Job.overrides` abweichend setzen darf. */
export const OVERRIDABLE_FIELDS = [
  'salaryMinChf',
  'salaryMaxChf',
  'thirteenthSalary',
  'nightAllowanceChfHour',
  'sundayAllowancePct',
  'onCallChfDay',
  'shiftTypes',
  'rosterLeadWeeks',
  'weekendsPerMonth',
  'guaranteedWishDays',
  'minShiftsPerWeek',
  'onboardingWeeks',
  'vacationWeeks',
  'educationBudgetChf',
  'educationDays',
] as const satisfies readonly WardProfileKey[];

export type OverridableField = (typeof OVERRIDABLE_FIELDS)[number];

export const jobOverridesSchema = wardProfileShape
  .pick(
    Object.fromEntries(OVERRIDABLE_FIELDS.map((k) => [k, true])) as {
      [K in OverridableField]: true;
    },
  )
  .partial();

export type JobOverrides = z.infer<typeof jobOverridesSchema>;

export interface WardRuleIssue {
  path: WardProfileKey;
  code:
    | 'salaryOrder'
    | 'salarySpread'
    | 'workloadOrder'
    | 'skillMixSum'
    | 'childcareAllowance'
    | 'reentryDetails'
    | 'ratioRequired';
}

/** Regeln zwischen Feldern; gilt für Formulare, API und KI-Import gleichermassen. */
export function wardRuleIssues(p: PartialWardProfile): WardRuleIssue[] {
  const issues: WardRuleIssue[] = [];
  if (p.salaryMinChf != null && p.salaryMaxChf != null) {
    if (p.salaryMaxChf < p.salaryMinChf) issues.push({ path: 'salaryMaxChf', code: 'salaryOrder' });
    else if (!salarySpreadOk(p.salaryMinChf, p.salaryMaxChf))
      issues.push({ path: 'salaryMaxChf', code: 'salarySpread' });
  }
  if (p.minWorkloadPct != null && p.maxWorkloadPct != null && p.maxWorkloadPct < p.minWorkloadPct) {
    issues.push({ path: 'maxWorkloadPct', code: 'workloadOrder' });
  }
  const mix = [p.skillMixHfFhPct, p.skillMixFagePct, p.skillMixAidPct].filter(
    (v): v is number => v != null,
  );
  if (mix.length > 0 && mix.reduce((a, b) => a + b, 0) > 100) {
    issues.push({ path: 'skillMixHfFhPct', code: 'skillMixSum' });
  }
  if (p.childcare === ChildcareType.ALLOWANCE && p.childcareAllowanceChf == null) {
    issues.push({ path: 'childcareAllowanceChf', code: 'childcareAllowance' });
  }
  if (p.reentryFriendly) {
    if (p.reentryOnboardingWeeks == null)
      issues.push({ path: 'reentryOnboardingWeeks', code: 'reentryDetails' });
    if (p.reentryAccompaniedShifts == null)
      issues.push({ path: 'reentryAccompaniedShifts', code: 'reentryDetails' });
    if (!p.reentryRefresher?.length)
      issues.push({ path: 'reentryRefresher', code: 'reentryDetails' });
  }
  return issues;
}

/** AK-A4: max ≤ min × 1.4 (ganze Franken, ohne Rundungsfehler). */
export function salarySpreadOk(min: number, max: number): boolean {
  return max * 10 <= min * (10 + MAX_SALARY_SPREAD * 10);
}

/** Vollständiges, gültiges Stationsprofil (Speichern einer Station). */
export const wardProfileSchema = wardProfileShape.superRefine((p, ctx) => {
  for (const issue of wardRuleIssues(p)) {
    ctx.addIssue({ code: 'custom', path: [issue.path], message: issue.code });
  }
  if (ACUTE_OR_LONG_TERM.includes(p.department)) {
    for (const key of ['patientsPerNurseDay', 'patientsPerNurseNight'] as const) {
      if (p[key] == null) ctx.addIssue({ code: 'custom', path: [key], message: 'ratioRequired' });
    }
  }
});

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** AK-A1: Liste der leeren Pflichtfelder eines (Teil-)Profils. */
export function missingRequiredFields(p: PartialWardProfile): WardProfileKey[] {
  const missing: WardProfileKey[] = [];
  for (const field of WARD_FIELDS) {
    const required =
      field.required === true ||
      (field.required === 'acuteOrLongTerm' &&
        p.department != null &&
        ACUTE_OR_LONG_TERM.includes(p.department));
    if (!required) continue;
    const value = p[field.key];
    if (field.kind === 'roster') {
      if (!Array.isArray(value) || value.length !== ROSTER_DAYS) missing.push(field.key);
    } else if (isEmpty(value)) {
      missing.push(field.key);
    }
  }
  return missing;
}

/** Profil einer Stelle = Stationsprofil + Überschreibungen. */
export function resolveJobProfile<T extends PartialWardProfile>(ward: T, overrides: unknown): T {
  const parsed = jobOverridesSchema.safeParse(overrides ?? {});
  if (!parsed.success) return ward;
  const clean = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
  return { ...ward, ...clean };
}

/** Welche Felder einer Stelle überschrieben sind (für "Quelle" in der Profil-Feldzeile). */
export function overriddenFields(overrides: unknown): OverridableField[] {
  const parsed = jobOverridesSchema.safeParse(overrides ?? {});
  if (!parsed.success) return [];
  return OVERRIDABLE_FIELDS.filter((k) => parsed.data[k] !== undefined);
}

/** AK-A3: veraltet, wenn die letzte Bestätigung älter als 180 Tage ist. */
export function isStale(confirmedAt: Date, now = new Date()): boolean {
  const ageMs = now.getTime() - confirmedAt.getTime();
  return ageMs > CONFIRMATION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

export function daysUntilStale(confirmedAt: Date, now = new Date()): number {
  const ageDays = (now.getTime() - confirmedAt.getTime()) / (24 * 60 * 60 * 1000);
  return Math.ceil(CONFIRMATION_MAX_AGE_DAYS - ageDays);
}

/** Anteil gefüllter Felder (Pflicht + optional) für das Ranking ("Profilvollständigkeit"). */
export function profileCompleteness(p: PartialWardProfile): number {
  const relevant = WARD_FIELDS.filter((f) => f.group !== 'reentry');
  const filled = relevant.filter((f) => !isEmpty(p[f.key])).length;
  return filled / relevant.length;
}

/** Ist der Dienstcode ein Arbeitsdienst? */
export function isWorkShift(code: RosterCodeT): boolean {
  return code !== RosterCode.X;
}
