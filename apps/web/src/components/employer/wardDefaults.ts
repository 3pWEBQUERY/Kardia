import { defaultRosterPattern, type PartialWardProfile } from '@kardia/core';

/** Startwerte für eine neue Station (auch serverseitig nutzbar). */
export function emptyWardServer(): PartialWardProfile {
  return {
    name: '',
    shiftTypes: [],
    thirteenthSalary: false,
    childcare: 'NONE',
    reentryFriendly: false,
    rosterPattern: defaultRosterPattern(),
    onCallChfDay: null,
    minShiftsPerWeek: null,
    patientsPerNurseDay: null,
    patientsPerNurseNight: null,
    skillMixHfFhPct: null,
    skillMixFagePct: null,
    skillMixAidPct: null,
    educationBudgetChf: null,
    educationDays: null,
    childcareAllowanceChf: null,
    reentryOnboardingWeeks: null,
    reentryAccompaniedShifts: null,
    reentryRefresher: null,
    description: null,
  };
}

/** Datenbankzeile → Formularwerte (nur Profilfelder). */
export function wardToDraft(w: Record<string, unknown>): PartialWardProfile {
  const keys = Object.keys(emptyWardServer()).concat([
    'department',
    'salaryMinChf',
    'salaryMaxChf',
    'nightAllowanceChfHour',
    'sundayAllowancePct',
    'rosterLeadWeeks',
    'weekendsPerMonth',
    'guaranteedWishDays',
    'minWorkloadPct',
    'maxWorkloadPct',
    'onboardingWeeks',
    'vacationWeeks',
    'collectiveAgreement',
  ]);
  return Object.fromEntries(keys.map((k) => [k, w[k] ?? null]));
}
