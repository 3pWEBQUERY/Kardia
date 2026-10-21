import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
export const MAGIC_LINK_FILE = process.env.E2E_MAGIC_LINK_FILE ?? '/tmp/kardia-e2e-magic-links.log';

/**
 * E2E für alle Kernflows (PRD 10.4) gegen den Produktions-Build, inkl. Service Worker
 * (Offline, AK-PWA1) und axe-Prüfung (WCAG 2.2 AA).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'de-CH',
    timezoneId: 'Europe/Zurich',
    trace: 'retain-on-failure',
    ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}),
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      APP_ORIGIN: `http://localhost:${PORT}`,
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
      E2E_MAGIC_LINK_FILE: MAGIC_LINK_FILE,
      KARDIA_QUEUE_DISABLED: '1',
      RATE_LIMIT_DISABLED: 'true',
      DEMO_LOGIN: 'true',
    },
  },
});
