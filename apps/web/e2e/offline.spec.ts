import { expect, test } from '@playwright/test';

import { signIn } from './helpers.ts';

/** AK-PWA1: Offline-Navigation auf gemerkte Stellen funktioniert im Flugmodus. */
test('gemerkte Stellen bleiben offline lesbar', async ({ page, context, baseURL }) => {
  await signIn(context, baseURL ?? '', 'lea@example.ch');
  await page.goto('/me/saved');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Zweiter Aufruf mit aktivem Service Worker füllt den Cache (Network First).
  await page.reload();
  const title = await page.locator('main a[href^="/jobs/"]').first().textContent();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('main a[href^="/jobs/"]').first()).toHaveText(title ?? '');
  await page.goto('/me/does-not-exist-offline');
  await expect(page.getByRole('heading', { name: 'Keine Verbindung' })).toBeVisible();
  await context.setOffline(false);
});

test('Manifest erfüllt die Installierbarkeit', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBeTruthy();
  const m = (await res.json()) as { display: string; start_url: string; icons: { purpose?: string; sizes: string }[] };
  expect(m.display).toBe('standalone');
  expect(m.start_url).toBe('/?source=pwa');
  expect(m.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  expect(m.icons.some((i) => i.sizes === '512x512')).toBe(true);
});
