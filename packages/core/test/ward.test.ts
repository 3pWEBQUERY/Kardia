import { describe, expect, it } from 'vitest';

import {
  isStale,
  missingRequiredFields,
  resolveJobProfile,
  salarySpreadOk,
  wardProfileSchema,
  wardRuleIssues,
} from '../src/ward.ts';

import { completeWard } from './fixtures.ts';

describe('Stationsprofil', () => {
  it('akzeptiert ein vollständiges Profil', () => {
    expect(wardProfileSchema.safeParse(completeWard()).success).toBe(true);
  });

  it('AK-A4: lehnt Lohnbänder mit mehr als 40 % Spanne ab', () => {
    expect(salarySpreadOk(80_000, 112_000)).toBe(true);
    expect(salarySpreadOk(80_000, 112_001)).toBe(false);
    const result = wardProfileSchema.safeParse(
      completeWard({ salaryMinChf: 70_000, salaryMaxChf: 100_000 }),
    );
    expect(result.success).toBe(false);
    expect(wardRuleIssues({ salaryMinChf: 70_000, salaryMaxChf: 100_000 })).toEqual([
      { path: 'salaryMaxChf', code: 'salarySpread' },
    ]);
  });

  it('erzwingt Pensum in 10er-Schritten und genau 28 Dienstplan-Einträge', () => {
    expect(wardProfileSchema.safeParse(completeWard({ minWorkloadPct: 65 })).success).toBe(false);
    expect(wardProfileSchema.safeParse(completeWard({ rosterPattern: ['F', 'S'] })).success).toBe(
      false,
    );
  });

  it('AK-A1: meldet leere Pflichtfelder, Betreuungsschlüssel nur für Akut/Langzeit', () => {
    expect(missingRequiredFields(completeWard())).toEqual([]);
    expect(
      missingRequiredFields({
        ...completeWard(),
        rosterLeadWeeks: null,
        patientsPerNurseDay: null,
      }),
    ).toEqual(['rosterLeadWeeks', 'patientsPerNurseDay']);
    expect(
      missingRequiredFields({
        ...completeWard({ department: 'PRACTICE' }),
        patientsPerNurseDay: null,
      }),
    ).toEqual([]);
  });

  it('Wiedereinstieg braucht Einarbeitung, begleitete Dienste und Refresher', () => {
    const codes = wardRuleIssues({ reentryFriendly: true }).map((i) => i.path);
    expect(codes).toEqual([
      'reentryOnboardingWeeks',
      'reentryAccompaniedShifts',
      'reentryRefresher',
    ]);
  });

  it('Stelle erbt die Station und überschreibt nur erlaubte Felder', () => {
    const ward = completeWard();
    const resolved = resolveJobProfile(ward, { rosterLeadWeeks: 8, department: 'GERIATRICS' });
    expect(resolved.rosterLeadWeeks).toBe(8);
    expect(resolved.department).toBe('ICU');
  });

  it('AK-A3: veraltet nach 180 Tagen', () => {
    const now = new Date('2026-10-20T00:00:00Z');
    expect(isStale(new Date('2026-04-24T00:00:00Z'), now)).toBe(false);
    expect(isStale(new Date('2026-04-22T00:00:00Z'), now)).toBe(true);
  });
});
