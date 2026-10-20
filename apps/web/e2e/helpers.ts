import { readFileSync } from 'node:fs';

import AxeBuilder from '@axe-core/playwright';
import { expect, type BrowserContext, type Page } from '@playwright/test';

import { MAGIC_LINK_FILE } from '../playwright.config.ts';

/** Anmeldung per E-Mail-Link: Link aus der E2E-Datei lesen und öffnen. */
export async function signIn(context: BrowserContext, baseURL: string, email: string): Promise<void> {
  const res = await context.request.post(`${baseURL}/api/auth/sign-in/magic-link`, {
    data: { email, callbackURL: '/me' },
    headers: { origin: baseURL },
  });
  expect(res.ok()).toBeTruthy();
  let url: string | undefined;
  for (let i = 0; i < 20 && !url; i++) {
    await new Promise((r) => setTimeout(r, 150));
    try {
      url = readFileSync(MAGIC_LINK_FILE, 'utf8').trim().split('\n').reverse().find((l) => l.startsWith(`${email} `))?.split(' ')[1];
    } catch {
      url = undefined;
    }
  }
  if (!url) throw new Error('Kein Anmeldelink gefunden');
  const verify = await context.request.get(url, { maxRedirects: 0 });
  expect(verify.status()).toBeLessThan(400);
}

/** WCAG 2.2 AA: keine ernsten oder kritischen Verstösse. */
export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}
