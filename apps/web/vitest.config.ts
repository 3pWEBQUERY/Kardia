import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const src = fileURLToPath(new URL('./src', import.meta.url));
const empty = fileURLToPath(new URL('./test/empty.ts', import.meta.url));

const alias = { '@/': `${src}/`, 'server-only': empty };

/**
 * Zwei Projekte: `unit` (reine Logik) und `integration` (gegen eine echte Postgres-Test-DB,
 * seriell). Die Test-DB wird in `test/integration/global-setup.ts` migriert und geleert.
 */
export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      { resolve: { alias }, test: { name: 'unit', include: ['test/unit/**/*.test.ts'] } },
      {
        resolve: { alias },
        test: {
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
          globalSetup: ['test/integration/global-setup.ts'],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 120_000,
          env: {
            NODE_ENV: 'test',
            DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://kardia:kardia@localhost:5432/kardia_test',
            KARDIA_QUEUE_DISABLED: '1',
            RATE_LIMIT_DISABLED: 'true',
            BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-123456',
            FIELD_ENCRYPTION_KEYS: `t1:${randomBytes(32).toString('base64')}`,
            VOTER_HASH_SECRET: 'test-voter-secret',
            APP_ORIGIN: 'http://localhost:3000',
          },
        },
      },
    ],
  },
});
