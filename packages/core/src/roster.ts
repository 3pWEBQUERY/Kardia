import { RosterCode, type RosterCode as RosterCodeT } from '@kardia/db/enums';

import { ROSTER_DAYS } from './ward.ts';

/**
 * Dienstrhythmus-Vorschau (PRD 7.1): Der Muster-Dienstplan gilt für 100 %. Bei
 * Teilzeit wird er auf das Pensum skaliert – z. B. 60 % von 20 Diensten = 12. Die
 * entfallenden Dienste werden gleichmässig verteilt in "frei" umgewandelt, damit der
 * Rhythmus (Früh/Spät/Nacht-Folge) erhalten bleibt.
 */
export function scaleRoster(pattern: readonly RosterCodeT[], workloadPct: number): RosterCodeT[] {
  const workIdx = pattern.flatMap((code, i) => (code === RosterCode.X ? [] : [i]));
  const target = Math.round((workIdx.length * Math.min(100, Math.max(0, workloadPct))) / 100);
  if (target >= workIdx.length) return [...pattern];
  const drop = workIdx.length - target;
  const result = [...pattern];
  // Jeden k-ten Dienst streichen, deterministisch und gleichmässig über die 4 Wochen.
  for (let n = 0; n < drop; n++) {
    const pos = Math.floor(((n + 0.5) * workIdx.length) / drop);
    const idx = workIdx[Math.min(pos, workIdx.length - 1)];
    if (idx !== undefined) result[idx] = RosterCode.X;
  }
  return result;
}

export function countShifts(pattern: readonly RosterCodeT[]): Record<RosterCodeT, number> {
  const counts = { F: 0, S: 0, N: 0, T: 0, X: 0 } as Record<RosterCodeT, number>;
  for (const code of pattern) counts[code] += 1;
  return counts;
}

/** Wochenend-Tage mit Dienst im Muster; Tag 0 ist ein Montag. */
export function weekendShiftDays(pattern: readonly RosterCodeT[]): number {
  return pattern.filter((code, i) => code !== RosterCode.X && i % 7 >= 5).length;
}

export function hasNights(pattern: readonly RosterCodeT[]): boolean {
  return pattern.includes(RosterCode.N);
}

/** Leeres 4-Wochen-Muster (Mo–Fr Früh, Wochenende frei) als Startwert für Formulare. */
export function defaultRosterPattern(): RosterCodeT[] {
  return Array.from({ length: ROSTER_DAYS }, (_, i) => (i % 7 >= 5 ? RosterCode.X : RosterCode.F));
}
