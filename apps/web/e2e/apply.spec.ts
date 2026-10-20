import { expect, test } from '@playwright/test';

import { expectAccessible, signIn } from './helpers.ts';

test('Ein-Klick-Bewerbung mit Pass (Modul D) und Statusliste', async ({ page, context, baseURL }) => {
  await signIn(context, baseURL ?? '', 'marco@example.ch');
  await page.goto('/search');
  // Eine Stelle wählen, auf die Marco noch nicht beworben ist.
  const links = page.locator('main ol > li a[href^="/jobs/"]');
  const n = await links.count();
  let applied = false;
  for (let i = 0; i < n && !applied; i++) {
    await page.goto((await links.nth(i).getAttribute('href')) ?? '/');
    const button = page.getByRole('button', { name: 'Bewerben' });
    if (await button.isVisible()) {
      await page.getByLabel('Persönliche Nachricht (optional)').fill('Ich freue mich auf ein Gespräch.');
      await button.click();
      await expect(page.getByText('Ihre Bewerbung ist eingegangen.')).toBeVisible();
      applied = true;
    }
    if (!applied) await page.goto('/search');
  }
  expect(applied).toBe(true);
  await page.goto('/me/applications');
  await expect(page.getByRole('heading', { name: 'Bewerbungen' })).toBeVisible();
  await expectAccessible(page);
});

test('Qualifikations-Pass ist barrierefrei und zeigt Status je Nachweis', async ({ page, context, baseURL }) => {
  await signIn(context, baseURL ?? '', 'lea@example.ch');
  await page.goto('/me/pass');
  await expect(page.getByText('Verifiziert').first()).toBeVisible();
  await expectAccessible(page);
});
