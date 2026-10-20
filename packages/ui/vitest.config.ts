import { defineConfig } from 'vitest/config';

// visual/ läuft mit Playwright (test:visual), nicht mit Vitest.
export default defineConfig({ test: { include: ['test/**/*.test.ts'] } });
