import { expect, test } from '@playwright/test';

import { expectAccessible } from './helpers.ts';

/** Demo-Umgebung (DEMO_LOGIN=true): Ein-Klick-Anmeldung als fiktive Persona. */
test.describe('Demo-Zugang', () => {
  test('Fachperson landet nach einem Klick in ihrem Bereich', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { name: 'Demo-Zugang' })).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('button', { name: /lea@example\.ch/ }).click();
    await expect(page).toHaveURL(/\/me$/);
  });

  test('Arbeitgeber landet im Cockpit', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByRole('button', { name: /leitung@seefeld-ost\.example/ }).click();
    await expect(page).toHaveURL(/\/employer$/);
    await expect(page.locator('main h1').first()).toBeVisible();
  });

  test('Admin landet in der Admin-Konsole (Demo ohne Passkey)', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByRole('button', { name: /admin@kardia\.local/ }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('main h1').first()).toBeVisible();
  });
});
