import { expect, test } from '@playwright/test';

import { expectAccessible } from './helpers.ts';

test.describe('Fachperson – erster Besuch bis Treffer', () => {
  test('drei Fragen statt Suchfeld, Ergebnisse ohne Konto (PRD 7.3)', async ({ page }) => {
    await page.goto('/');
    await expectAccessible(page);
    await page.getByLabel('Welcher Beruf?').selectOption('NURSE_HF_FH');
    await page.getByLabel('Nachtdienste').check();
    await page.getByRole('button', { name: 'Passende Stationen zeigen' }).click();
    await expect(page).toHaveURL(/\/search\?f=/);
    await expect(page.getByRole('heading', { name: 'Stellen suchen' })).toBeVisible();

    // AK-B1: kein Treffer verletzt die Muss-Bedingung "Keine Nächte".
    const hits = page.locator('main ol > li');
    const count = await hits.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(hits.nth(i).getByRole('img', { name: 'nicht erfüllt' })).toHaveCount(0);
    }
    await expectAccessible(page);

    // AK-B2: Filterzustand vollständig in der URL – Neuladen ergibt dieselben Treffer.
    const url = page.url();
    const titles = await hits.locator('a').first().textContent();
    await page.goto(url);
    await expect(page.locator('main ol > li a').first()).toHaveText(titles ?? '');
  });

  test('Leerzustand nennt die nächste Handlung', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Welcher Beruf?').selectOption('MIDWIFE');
    await page.getByRole('button', { name: 'Passende Stationen zeigen' }).click();
    await expect(page.getByText(/Keine Treffer/)).toBeVisible();
  });

  test('Stelle zeigt Dienstrhythmus, Stationsprofil mit Bestätigungsdatum und JSON-LD', async ({ page }) => {
    await page.goto('/search');
    await page.locator('main ol > li a').first().click();
    await expect(page.getByRole('heading', { name: 'Dienstrhythmus' })).toBeVisible();
    await expect(page.getByText(/bestätigt von Arbeitgeber am \d{2}\.\d{2}\.\d{4}/).first()).toBeVisible();
    const ld = await page.locator('script[type="application/ld+json"]').textContent();
    expect(JSON.parse(ld ?? '{}')['@type']).toBe('JobPosting');
    await expectAccessible(page);
  });
});
