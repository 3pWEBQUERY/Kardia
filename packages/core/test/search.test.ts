import { describe, expect, it } from 'vitest';

import {
  DEALBREAKERS,
  compareRank,
  decodeFilter,
  encodeFilter,
  evaluateMatch,
  type Condition,
  type MatchSubject,
} from '../src/search.ts';

import { completeWard } from './fixtures.ts';

const subject = (profile = completeWard(), commute?: MatchSubject['commute']): MatchSubject => ({
  profile,
  hasParking: true,
  allowsPendingRecog: false,
  trainingCategory: null,
  ...(commute ? { commute } : {}),
});

describe('Lebensmodell-Suche', () => {
  it('AK-B2: Filter überlebt den Weg durch die URL', () => {
    const filter = {
      profession: 'NURSE_HF_FH' as const,
      workloadPct: 80,
      conditions: [
        DEALBREAKERS.nights,
        { key: 'minSalary', mode: 'wish', value: 95_000 } as Condition,
      ],
    };
    const decoded = decodeFilter(encodeFilter(filter));
    expect(decoded.profession).toBe('NURSE_HF_FH');
    expect(decoded.conditions).toHaveLength(2);
    expect(decodeFilter('kaputt!!')).toEqual(decodeFilter(null));
  });

  it('AK-B1: eine verletzte Muss-Bedingung schliesst den Treffer aus', () => {
    const match = evaluateMatch([DEALBREAKERS.nights], subject());
    expect(match.excluded).toBe(true);
    const ok = evaluateMatch(
      [DEALBREAKERS.nights],
      subject(completeWard({ shiftTypes: ['EARLY', 'LATE'] })),
    );
    expect(ok.excluded).toBe(false);
    expect(ok.mustMet).toBe(1);
  });

  it('Dienstarten und weitere Felder aus Modul A sind als Bedingungen suchbar', () => {
    const ward = completeWard({ shiftTypes: ['EARLY', 'LATE', 'NIGHT'], sundayAllowancePct: 50, skillMixHfFhPct: 80, educationBudgetChf: 3000, minShiftsPerWeek: 3 });
    const state = (c: Condition, profile = ward) => evaluateMatch([c], subject(profile)).results[0]?.state;
    expect(state({ key: 'noEarlyShifts', mode: 'must' })).toBe('unmet');
    expect(state({ key: 'no12hShifts', mode: 'must' })).toBe('met');
    expect(state({ key: 'noLateShifts', mode: 'must' }, completeWard({ shiftTypes: ['EARLY'] }))).toBe('met');
    expect(state({ key: 'minSundayAllowancePct', mode: 'must', value: 60 })).toBe('unmet');
    expect(state({ key: 'minSkillMixHfFhPct', mode: 'must', value: 70 })).toBe('met');
    expect(state({ key: 'minEducationBudget', mode: 'must', value: 2500 })).toBe('met');
    expect(state({ key: 'maxRequiredShiftsPerWeek', mode: 'must', value: 2 })).toBe('unmet');
    // Fehlender Wert ist "unbekannt" und schliesst nie aus (AK-B1).
    const onCall: Condition = { key: 'minOnCallChfDay', mode: 'must', value: 40 };
    expect(state(onCall, completeWard({ onCallChfDay: null }))).toBe('unknown');
    expect(evaluateMatch([onCall], subject(completeWard({ onCallChfDay: null }))).excluded).toBe(false);
  });

  it('unbekannte Pendelzeit ist "unbekannt", nicht verletzt', () => {
    const c: Condition = { key: 'maxCommute', mode: 'must', value: 30, transport: 'PT' };
    expect(evaluateMatch([c], subject()).results[0]?.state).toBe('unknown');
    expect(evaluateMatch([c], subject(completeWard(), { PT: 34 })).excluded).toBe(true);
  });

  it('Wünsche verletzen nie, sortieren aber', () => {
    const wish: Condition = { key: 'minRosterLeadWeeks', mode: 'wish', value: 8 };
    const a = evaluateMatch([wish], subject());
    const b = evaluateMatch([wish], subject(completeWard({ rosterLeadWeeks: 10 })));
    expect(a.excluded).toBe(false);
    const base = { stale: false, completeness: 1, publishedAt: null };
    expect(compareRank({ ...base, match: a }, { ...base, match: b })).toBeGreaterThan(0);
  });

  it('veraltete Profile werden zurückgestuft (AK-A3)', () => {
    const m = evaluateMatch([], subject());
    expect(
      compareRank(
        { match: m, stale: true, completeness: 1, publishedAt: null },
        { match: m, stale: false, completeness: 0.5, publishedAt: null },
      ),
    ).toBeGreaterThan(0);
  });
});
