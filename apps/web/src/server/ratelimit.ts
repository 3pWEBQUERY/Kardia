import 'server-only';

import { db } from './db.ts';
import { env } from './env.ts';

/**
 * Token-Bucket in Postgres (PRD 12.1): öffentlich 60/min pro IP, angemeldet 300/min,
 * Org-API 1'000/min. Ein einziges UPSERT pro Anfrage, atomar ohne Sperren.
 */
export const LIMITS = {
  public: 60,
  user: 300,
  orgApi: 1000,
} as const;

export async function consume(key: string, perMinute: number): Promise<{ ok: boolean; remaining: number }> {
  if (env().RATE_LIMIT_DISABLED) return { ok: true, remaining: perMinute };
  const refillPerSec = perMinute / 60;
  const rows = await db.$queryRaw<{ tokens: number }[]>`
    INSERT INTO "RateLimit" ("key", "tokens", "updatedAt")
    VALUES (${key}, ${perMinute - 1}, now())
    ON CONFLICT ("key") DO UPDATE SET
      "tokens" = GREATEST(-1, LEAST(${perMinute}::float8,
        "RateLimit"."tokens" + EXTRACT(EPOCH FROM (now() - "RateLimit"."updatedAt")) * ${refillPerSec}::float8) - 1),
      "updatedAt" = now()
    RETURNING "tokens"`;
  const tokens = rows[0]?.tokens ?? 0;
  return { ok: tokens >= 0, remaining: Math.max(0, Math.floor(tokens)) };
}
