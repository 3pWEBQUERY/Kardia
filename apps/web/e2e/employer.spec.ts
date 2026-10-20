import { expect, test } from '@playwright/test';

import { expectAccessible, signIn } from './helpers.ts';

/** Arbeitgeber-Cockpit: Kernseiten laden für die Owner-Person und sind barrierefrei. */
test.describe('Arbeitgeber-Cockpit', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await signIn(context, baseURL ?? '', 'leitung@seefeld-ost.example');
  });

  for (const path of ['/employer', '/employer/wards', '/employer/jobs', '/employer/pipeline', '/employer/benchmark', '/employer/billing']) {
    test(`${path} lädt`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator('main h1').first()).toBeVisible();
      await expectAccessible(page);
    });
  }

  test('Druckansicht der Rechnung blendet die Navigation aus', async ({ page }) => {
    await page.goto('/employer/billing');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('aside')).toBeHidden();
  });
});
