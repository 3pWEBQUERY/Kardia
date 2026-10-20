import { describe, expect, it } from 'vitest';

import { sniffMime, uploadIssues } from '../src/files.ts';
import { shiftsToIcs, canCandidateCancel } from '../src/flexpool.ts';
import { formatChf, formatChfRange, formatDate, formatNumber, formatTime } from '../src/format.ts';
import { decodeGeohash, encodeGeohash } from '../src/geo.ts';
import { IDENTIFYING_KEYS, offerRuleIssues, toAnonymousProfile } from '../src/marketplace.ts';
import { normalizeUid } from '../src/org.ts';
import { credentialEditResetsStatus } from '../src/pass.ts';
import { canTransition, statusChangeSchema } from '../src/pipeline.ts';
import { countShifts, scaleRoster } from '../src/roster.ts';
import { aggregateRealityChecks, computeBenchmark } from '../src/team.ts';
import { trainingGap, yearsClosedByJob } from '../src/training.ts';

import { completeWard } from './fixtures.ts';

describe('Schweizer Formatierung', () => {
  it('Tausender mit Apostroph, CHF vor dem Betrag', () => {
    expect(formatNumber(95000)).toBe("95'000");
    expect(formatNumber(1234567.5, 1)).toBe("1'234'567.5");
    expect(formatChf(95000)).toBe("CHF 95'000");
    expect(formatChfRange(88000, 102000)).toBe("CHF 88'000–102'000");
  });

  it('Datum TT.MM.JJJJ und 24-Stunden-Zeit in Schweizer Zeit', () => {
    expect(formatDate(new Date('2026-03-01T23:30:00Z'))).toBe('02.03.2026');
    expect(formatTime(new Date('2026-07-01T20:05:00Z'))).toBe('22:05');
  });
});

describe('Dienstrhythmus', () => {
  it('skaliert 20 Dienste auf 60 % = 12 Dienste', () => {
    const pattern = completeWard().rosterPattern;
    const work = 28 - countShifts(pattern).X;
    const scaled = scaleRoster(pattern, 60);
    expect(28 - countShifts(scaled).X).toBe(Math.round(work * 0.6));
    expect(scaled).toHaveLength(28);
    expect(scaleRoster(pattern, 100)).toEqual(pattern);
  });
});

describe('Marktplatz', () => {
  it('AK-E2: Angebot unter dem Lohnband-Minimum wird abgelehnt', () => {
    const job = { salaryMinChf: 90_000, workloadMinPct: 60, workloadMaxPct: 100 };
    const today = new Date('2026-10-20');
    expect(
      offerRuleIssues({ salaryChf: 89_999, workloadPct: 80, startDate: '2027-01-01' }, job, today),
    ).toContain('belowSalaryBand');
    expect(
      offerRuleIssues({ salaryChf: 90_000, workloadPct: 80, startDate: '2027-01-01' }, job, today),
    ).toEqual([]);
  });

  it('AK-E1: anonymes Profil enthält keine identifizierenden Schlüssel', () => {
    const anon = toAnonymousProfile(
      {
        profession: 'NURSE_HF_FH',
        yearsExperience: 6,
        homeDistrict: 'Bezirk Uster',
        desiredWorkloadPct: 80,
        earliestStart: new Date('2027-03-01'),
        mustConditions: [{ key: 'noNights', mode: 'must' }],
        experiences: [{ department: 'ICU', years: 4.4 }],
        languages: [{ language: 'de', level: 'C2' }],
        credentials: [{ status: 'VERIFIED' }],
        // Zusätzliche Felder dürfen nie durchgereicht werden:
        ...({ firstName: 'Lea', lastName: 'Muster', email: 'lea@example.ch' } as object),
      },
      'ref-1',
    );
    const json = JSON.stringify(anon);
    for (const key of IDENTIFYING_KEYS) expect(Object.keys(anon)).not.toContain(key);
    expect(json).not.toContain('Lea');
    expect(json).not.toContain('example.ch');
    expect(anon.passVerified).toBe(true);
  });
});

describe('Realitäts-Check & Benchmark', () => {
  const vote = (agrees: boolean, proposedValue: string | null = null) => ({
    agrees,
    proposedValue,
  });

  it('AK-G1: unter 5 Stimmen wird nichts angezeigt', () => {
    expect(
      aggregateRealityChecks('rosterLeadWeeks', 6, [
        vote(true),
        vote(true),
        vote(false, '4'),
        vote(true),
      ]),
    ).toBeNull();
  });

  it('zeigt ab 5 Stimmen den Team-Wert und markiert Abweichungen', () => {
    const agg = aggregateRealityChecks('rosterLeadWeeks', 6, [
      vote(false, '4'),
      vote(false, '4'),
      vote(false, '3'),
      vote(true),
      vote(false, '4'),
      vote(false, '5'),
      vote(false, '4'),
    ]);
    expect(agg?.votes).toBe(7);
    expect(agg?.teamValue).toBe(4);
    expect(agg?.deviates).toBe(true);
  });

  it('Benchmark erst ab 8 Vergleichsstationen', () => {
    expect(computeBenchmark('rosterLeadWeeks', 3, [5, 5, 4, 6, 5, 5, 4])).toBeNull();
    expect(computeBenchmark('rosterLeadWeeks', 3, [5, 5, 4, 6, 5, 5, 4, 5])?.medianValue).toBe(5);
  });
});

describe('Verschiedenes', () => {
  it('prüft UID-Prüfziffern', () => {
    expect(normalizeUid('CHE-116.281.710')).toBe('CHE-116.281.710');
    expect(normalizeUid('CHE116281711')).toBeNull();
  });

  it('Geohash Präzision 7 rundet auf ~150 m', () => {
    const hash = encodeGeohash(47.3769, 8.5417);
    expect(hash).toHaveLength(7);
    const c = decodeGeohash(hash);
    expect(Math.abs(c.lat - 47.3769)).toBeLessThan(0.001);
    expect(Math.abs(c.lng - 8.5417)).toBeLessThan(0.001);
  });

  it('Pipeline: Absage braucht Grund, Angestellt ist Endzustand', () => {
    expect(statusChangeSchema.safeParse({ status: 'REJECTED' }).success).toBe(false);
    expect(
      statusChangeSchema.safeParse({ status: 'REJECTED', rejectionReason: 'LANGUAGE' }).success,
    ).toBe(true);
    expect(canTransition('HIRED', 'REJECTED')).toBe(false);
    expect(canTransition('NEW', 'INTERVIEW')).toBe(true);
  });

  it('Flex-Pool: Absagefrist und ICS-Export', () => {
    const now = new Date('2026-10-20T08:00:00Z');
    expect(canCandidateCancel(new Date('2026-10-22T09:00:00Z'), 48, now)).toBe(true);
    expect(canCandidateCancel(new Date('2026-10-21T09:00:00Z'), 48, now)).toBe(false);
    const ics = shiftsToIcs(
      [
        {
          id: 's1',
          startsAt: now,
          endsAt: new Date('2026-10-20T16:00:00Z'),
          title: 'Frühdienst, IPS',
          location: 'Zürich',
        },
      ],
      now,
    );
    expect(ics).toContain('DTSTART:20261020T080000Z');
    expect(ics).toContain('SUMMARY:Frühdienst\\, IPS');
  });

  it('Dateien: Magic Bytes und Limits', () => {
    expect(sniffMime(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))).toBe('application/pdf');
    expect(sniffMime(new TextEncoder().encode('WEBVTT\n\n00:00.000'))).toBe('text/vtt');
    expect(
      uploadIssues({ purpose: 'logo', mimeType: 'image/png', sizeBytes: 3 * 1024 * 1024 }),
    ).toEqual(['tooLarge']);
  });

  it('AK-D2: Änderung eines verifizierten Nachweises setzt den Status zurück', () => {
    expect(
      credentialEditResetsStatus(
        { status: 'VERIFIED', title: 'Dipl. Pflegefachfrau HF' },
        { title: 'Pflegefachfrau FH' },
      ),
    ).toBe(true);
    expect(credentialEditResetsStatus({ status: 'VERIFIED', title: 'A' }, { title: 'A' })).toBe(
      false,
    );
    expect(credentialEditResetsStatus({ status: 'SUBMITTED', title: 'A' }, { title: 'B' })).toBe(
      false,
    );
  });

  it('Weiterbildung: Lücke und anrechenbare Jahre', () => {
    const gap = trainingGap('Allgemeine Innere Medizin', [
      { specialtyTitle: 'Allgemeine Innere Medizin', area: 'basis', yearsCompleted: 2 },
    ]);
    expect(gap?.remainingYears).toBe(3);
    expect(
      gap &&
        yearsClosedByJob(gap, {
          specialtyTitle: 'Allgemeine Innere Medizin',
          maxCreditableYears: 2,
        }),
    ).toBe(2);
  });
});
