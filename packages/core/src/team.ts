import { z } from 'zod';

import { REALITY_CHECK_FIELDS, type WardProfileKey } from './ward.ts';

/**
 * Team-Einblicke & Realitäts-Check (Modul G). Unter 5 Antworten pro Feld wird nichts
 * angezeigt (AK-G1); die Schwelle wird ausschliesslich hier und serverseitig geprüft.
 */
export const REALITY_CHECK_MIN_VOTES = 5;

/** Benchmark (Cockpit R2, PRD 14.3): nur aggregierte Mediane ab 8 Vergleichsstationen. */
export const BENCHMARK_MIN_PEERS = 8;

export const MAX_VIDEOS_PER_WARD = 5;
export const MAX_VIDEO_SECONDS = 60;

export const realityVoteSchema = z.object({
  field: z.enum(REALITY_CHECK_FIELDS as [WardProfileKey, ...WardProfileKey[]]),
  agrees: z.boolean(),
  proposedValue: z.string().trim().max(60).optional(),
  comment: z.string().trim().max(400).optional(),
});

export type RealityVote = z.infer<typeof realityVoteSchema>;

export interface RealityAggregate {
  field: string;
  votes: number;
  agreeShare: number;
  /** Median der vorgeschlagenen Werte, falls numerisch. */
  teamValue: number | null;
  /** Abweichung zwischen Arbeitgeber und Team → Warn-Token in der UI. */
  deviates: boolean;
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const a = sorted[mid] ?? 0;
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + a) / 2 : a;
}

/** Aggregation aller Stimmen eines Felds. Gibt `null` zurück, solange < 5 Stimmen. */
export function aggregateRealityChecks(
  field: string,
  employerValue: number | null,
  votes: readonly { agrees: boolean; proposedValue: string | null }[],
): RealityAggregate | null {
  if (votes.length < REALITY_CHECK_MIN_VOTES) return null;
  const agree = votes.filter((v) => v.agrees).length;
  const proposals = votes
    .filter((v) => !v.agrees && v.proposedValue != null)
    .map((v) =>
      Number(
        String(v.proposedValue)
          .replace(/['’\s]/g, '')
          .replace(',', '.'),
      ),
    )
    .filter((n) => Number.isFinite(n));
  // Team-Wert: Zustimmende zählen mit dem Arbeitgeberwert, Widersprechende mit ihrem Vorschlag.
  const teamValues =
    employerValue == null ? proposals : [...Array<number>(agree).fill(employerValue), ...proposals];
  const teamValue = median(teamValues);
  const agreeShare = agree / votes.length;
  return {
    field,
    votes: votes.length,
    agreeShare,
    teamValue,
    deviates:
      agreeShare < 0.5 ||
      (teamValue != null && employerValue != null && teamValue !== employerValue),
  };
}

export interface BenchmarkResult {
  field: string;
  wardValue: number;
  medianValue: number;
  peerCount: number;
}

/** Median des Fachbereichs und der Region; null unter 8 Vergleichsstationen. */
export function computeBenchmark(
  field: string,
  wardValue: number | null,
  peerValues: readonly (number | null)[],
): BenchmarkResult | null {
  const values = peerValues.filter((v): v is number => v != null);
  if (wardValue == null || values.length < BENCHMARK_MIN_PEERS) return null;
  const m = median(values);
  return m == null ? null : { field, wardValue, medianValue: m, peerCount: values.length };
}

export const teamQuestionSchema = z.object({
  body: z.string().trim().min(10).max(500),
});

export const teamAnswerSchema = z.object({
  answer: z.string().trim().min(5).max(1500),
});

/** Mitarbeitenden-Verifizierung: E-Mail-Domain der Institution. */
export function emailMatchesDomains(email: string, domains: readonly string[]): boolean {
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return false;
  return domains.some((d) => {
    const clean = d.toLowerCase().replace(/^@/, '').trim();
    return domain === clean || domain.endsWith(`.${clean}`);
  });
}
