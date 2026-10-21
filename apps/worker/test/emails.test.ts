import { describe, expect, it } from 'vitest';

import { EMAIL_TEXT, emailLocale, type EmailLocale } from '../src/emails/strings.ts';
import { TEMPLATES, renderEmail, type Audience } from '../src/emails/templates.tsx';
import { alertChannels } from '../src/handlers/alerts.ts';
import { pushMessageFor } from '../src/handlers/notify.ts';

const LOCALES: EmailLocale[] = ['de', 'fr', 'it', 'en'];

/** Beispieldaten, die jede Vorlage vollständig füllen. */
const DATA: Record<string, unknown> = {
  url: 'https://kardia.example/link',
  applicationId: 'a1',
  jobTitle: 'IPS 80 %',
  status: 'INTERVIEW',
  orgName: 'Spital Demo',
  offerId: 'o1',
  action: 'interested',
  wardName: 'Intensivstation 1',
  wardId: 'w1',
  startsAt: '2026-11-02T06:30:00Z',
  title: 'BLS-AED',
  verified: false,
  reason: 'Unleserlich',
  searchName: 'IPS Zürich',
  searchUrl: 'https://kardia.example/search',
  jobs: [
    {
      title: 'IPS 80 %',
      orgName: 'Spital Demo',
      url: 'https://kardia.example/jobs/j1',
      salaryMinChf: 90000,
    },
  ],
  deleteOn: '2026-12-31',
  daysLeft: 14,
  validUntil: '2026-11-30',
  planLabel: 'Institution',
  costUsd: 31.5,
  limitUsd: '25',
};

describe('E-Mails in vier Sprachen', () => {
  it('ordnet Prisma-Locales zu und fällt auf Deutsch zurück', () => {
    expect(emailLocale('FR_CH')).toBe('fr');
    expect(emailLocale('IT_CH')).toBe('it');
    expect(emailLocale('EN')).toBe('en');
    expect(emailLocale('DE_CH')).toBe('de');
    expect(emailLocale(null)).toBe('de');
  });

  for (const template of TEMPLATES) {
    it(`${template}: rendert in allen Sprachen ohne leere oder fehlende Texte`, async () => {
      const subjects = new Set<string>();
      for (const locale of LOCALES) {
        for (const audience of ['candidate', 'employer'] as Audience[]) {
          const mail = await renderEmail(template, DATA, audience, locale);
          expect(mail.subject.trim().length, `${template}/${locale}`).toBeGreaterThan(3);
          expect(mail.text).not.toMatch(/undefined|\[object Object\]|NaN/);
          expect(mail.html).toContain(`lang="${EMAIL_TEXT[locale].lang}"`);
          expect(mail.text).toContain(EMAIL_TEXT[locale].manage);
          if (audience === 'candidate') subjects.add(mail.subject);
        }
      }
      // Jede Sprache hat einen eigenen Betreff (nichts bleibt deutsch hängen).
      expect(subjects.size).toBe(LOCALES.length);
    });
  }

  it('Links zeigen absolut auf die App-Origin', async () => {
    const mail = await renderEmail('credential.expired', DATA, 'candidate', 'fr');
    expect(mail.html).toMatch(/href="https?:\/\/[^"]+\/me\/pass"/);
    expect(mail.html).toMatch(/href="https?:\/\/[^"]+\/me\/settings"/);
  });

  it('Suchabo-Mail enthält den Link zum Abbestellen', async () => {
    const mail = await renderEmail('search.alert', DATA, 'candidate', 'it');
    expect(mail.text).toContain(EMAIL_TEXT.it.searchAlert.manage);
    expect(mail.text).toContain('da CHF');
  });
});

describe('Kanal der Suchabo-Meldung', () => {
  it('E-Mail, Push oder beides – Push ohne Gerät fällt auf E-Mail zurück', () => {
    expect(alertChannels('EMAIL', 3)).toEqual({ email: true, push: false });
    expect(alertChannels('PUSH', 1)).toEqual({ email: false, push: true });
    expect(alertChannels('PUSH', 0)).toEqual({ email: true, push: false });
    expect(alertChannels('BOTH', 2)).toEqual({ email: true, push: true });
    expect(alertChannels('BOTH', 0)).toEqual({ email: true, push: false });
  });
});

describe('Push-Texte', () => {
  it('Angebot zurückgezogen, je Sprache', () => {
    expect(
      pushMessageFor('offer.withdrawn', { offerId: 'o1', orgName: 'Spital', jobTitle: 'IPS' }),
    ).toEqual({
      title: 'Angebot zurückgezogen: Spital',
      body: 'IPS',
      url: '/me/marketplace',
      tag: 'offer-o1',
    });
    expect(pushMessageFor('offer.withdrawn', { orgName: 'Spital' }, 'fr')?.title).toBe(
      'Offre retirée : Spital',
    );
    expect(pushMessageFor('shift.reminder', {}, 'en')?.title).toBe('Shift in 12 hours');
  });
});
