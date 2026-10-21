import { describe, expect, it } from 'vitest';

import { STATIC_PUBLIC_PATHS, buildSitemap } from '../../src/lib/sitemap.ts';
import { localizedWardText } from '../../src/lib/wardText.ts';

describe('Sitemap (PRD 16)', () => {
  it('enthält statische Seiten und alle Entitäten mit absoluten URLs', () => {
    const d = new Date('2026-10-01T00:00:00Z');
    const map = buildSitemap('https://kardia.example/', {
      jobs: [{ id: 'j1', updatedAt: d }],
      wards: [{ id: 'w1', confirmedAt: d }],
      organizations: [{ id: 'o1', createdAt: d }],
      guides: [{ id: 'g1', reviewedAt: d }],
    });
    const urls = map.map((e) => e.url);
    expect(urls).toContain('https://kardia.example/');
    expect(urls).toContain('https://kardia.example/legal/terms-employers');
    expect(urls).toEqual(
      expect.arrayContaining([
        'https://kardia.example/jobs/j1',
        'https://kardia.example/wards/w1',
        'https://kardia.example/organizations/o1',
        'https://kardia.example/guide/recognition/g1',
      ]),
    );
    expect(map).toHaveLength(STATIC_PUBLIC_PATHS.length + 4);
    expect(urls.every((u) => u.startsWith('https://kardia.example/'))).toBe(true);
  });
});

describe('Stationsbeschreibung in der Sprache der Anfrage (KI-6)', () => {
  const translations = { 'fr-CH': { description: 'Unité de soins intensifs' }, en: { description: '  ' } };

  it('nimmt die Übersetzung, wenn vorhanden', () => {
    expect(localizedWardText('Intensivstation', translations, 'fr-CH')).toEqual({ text: 'Unité de soins intensifs', translated: true });
  });

  it('fällt auf Deutsch zurück (fehlend, leer, Deutsch angefragt, kaputte Daten)', () => {
    expect(localizedWardText('Intensivstation', translations, 'it-CH')).toEqual({ text: 'Intensivstation', translated: false });
    expect(localizedWardText('Intensivstation', translations, 'en')).toEqual({ text: 'Intensivstation', translated: false });
    expect(localizedWardText('Intensivstation', translations, 'de-CH')).toEqual({ text: 'Intensivstation', translated: false });
    expect(localizedWardText('Intensivstation', 'kaputt', 'fr-CH')).toEqual({ text: 'Intensivstation', translated: false });
    expect(localizedWardText(null, translations, 'fr-CH')).toEqual({ text: null, translated: false });
  });
});
