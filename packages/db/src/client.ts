import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/prisma/client.ts';

export type Db = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as unknown as { kardiaPrisma?: Db };

/**
 * Creates a Prisma client on the pg driver adapter (Prisma 7 has no built-in engine
 * connection). Pool size stays small: web runs ≥ 2 replicas, worker 1 (PRD 10.2).
 */
export function createDb(connectionString = process.env.DATABASE_URL): Db {
  if (!connectionString) throw new Error('DATABASE_URL ist nicht gesetzt.');
  const adapter = new PrismaPg({ connectionString, max: Number(process.env.DB_POOL_MAX ?? 10) });
  return new PrismaClient({ adapter });
}

/** Process-wide singleton; survives Next.js hot reloads in development. */
export function getDb(): Db {
  globalForPrisma.kardiaPrisma ??= createDb();
  return globalForPrisma.kardiaPrisma;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver) as unknown;
  },
});
