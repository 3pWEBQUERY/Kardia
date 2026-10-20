import { defineConfig } from '@playwright/test';

/** Visuelle Regressionstests: Screenshots jeder Story aus dem statischen Storybook-Build. */
export default defineConfig({
  testDir: '.',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  use: { baseURL: 'http://127.0.0.1:6007' },
  webServer: {
    command: 'npx http-server ../storybook-static -p 6007 -s',
    url: 'http://127.0.0.1:6007',
    reuseExistingServer: !process.env.CI,
  },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002 } },
  projects: [
    { name: 'light', use: { colorScheme: 'light', viewport: { width: 1280, height: 900 } } },
    { name: 'dark', use: { colorScheme: 'dark', viewport: { width: 1280, height: 900 } } },
  ],
});
