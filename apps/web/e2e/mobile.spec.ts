import { expect, test } from '@playwright/test';

import { signIn } from './helpers.ts';

test('Mobile: untere Leiste mit max. 4 Einträgen + "Mehr" (PRD 7.2)', async ({ page, context, baseURL }) => {
  await signIn(context, baseURL ?? '', 'lea@example.ch');
  await page.goto('/me');
  const nav = page.locator('nav.fixed');
  await expect(nav.getByRole('link')).toHaveCount(4);
  await expect(nav.getByRole('button', { name: 'Mehr' })).toBeVisible();
  // Touch-Ziele mindestens 44 × 44 px.
  const box = await nav.getByRole('link').first().boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
});
