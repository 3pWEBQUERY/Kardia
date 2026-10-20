import type { Db } from '@kardia/db';
import type { AiFunction } from '@kardia/db/enums';

import type { AiLogger } from './runner.ts';

/** Budgetgrenzen im Code (PRD 9.3). */
export const MAX_JOB_STRUCTURING_PER_ORG_PER_DAY = 200;
export const DAILY_COST_ALARM_USD = 25;

export class AiBudgetExceededError extends Error {
  constructor(readonly fn: AiFunction) {
    super('Das tägliche KI-Kontingent dieser Organisation ist erreicht. Morgen ist es wieder verfügbar.');
    this.name = 'AiBudgetExceededError';
  }
}

/** Beginn des heutigen Tages in Schweizer Zeit, als UTC-Zeitpunkt. */
export function startOfZurichDay(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const midnightUtc = new Date(`${parts}T00:00:00Z`);
  // Offset der Zone zu diesem Zeitpunkt bestimmen (CET/CEST).
  const zoned = new Date(midnightUtc.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }));
  const offsetMs = zoned.getTime() - midnightUtc.getTime();
  return new Date(midnightUtc.getTime() - offsetMs);
}

export async function assertAiBudget(db: Db, fn: AiFunction, orgId: string | null): Promise<void> {
  if (fn !== 'JOB_STRUCTURING' || !orgId) return;
  const count = await db.aiRun.count({
    where: { function: fn, orgId, createdAt: { gte: startOfZurichDay() } },
  });
  if (count >= MAX_JOB_STRUCTURING_PER_ORG_PER_DAY) throw new AiBudgetExceededError(fn);
}

export async function dailyCostUsd(db: Db, now = new Date()): Promise<number> {
  const agg = await db.aiRun.aggregate({ _sum: { costUsd: true }, where: { createdAt: { gte: startOfZurichDay(now) } } });
  return Number(agg._sum.costUsd ?? 0);
}

/** Protokoll in die Tabelle AiRun. */
export function dbAiLogger(db: Db): AiLogger {
  return async (r) => {
    await db.aiRun.create({
      data: {
        function: r.function,
        model: r.model,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        costUsd: r.costUsd,
        durationMs: r.durationMs,
        status: r.status,
        inputHash: r.inputHash,
        rawInput: r.rawInput,
        ...(r.rawOutput != null ? { rawOutput: r.rawOutput as object } : {}),
        orgId: r.orgId,
      },
    });
  };
}
