import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { createDb } from '@kardia/db/client';

/** Test-DB migrieren und alle Tabellen leeren (ausser der Migrationshistorie). */
export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://kardia:kardia@localhost:5432/kardia_test';
  const dbPkg = fileURLToPath(new URL('../../../../packages/db', import.meta.url));
  execSync('npx prisma migrate deploy', { cwd: dbPkg, env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });
  const db = createDb(url);
  const rows = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (rows.length) await db.$executeRawUnsafe(`TRUNCATE ${rows.map((r) => `"public"."${r.tablename}"`).join(', ')} CASCADE`);
  await db.$disconnect();
}
