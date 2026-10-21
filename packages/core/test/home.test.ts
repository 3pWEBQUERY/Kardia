import { describe, expect, it } from 'vitest';

import { coarseHome, distanceKm, homeLocationSchema, passInputSchema } from '../src/index.ts';

const pass = {
  firstName: 'Lea',
  lastName: 'Muster',
  phone: null,
  profession: 'NURSE_HF_FH',
  yearsExperience: 5,
  workAuthorizedCh: true,
  experiences: [],
  languages: [],
} as const;

describe('Wohnort für Pendelzeiten (Modul B)', () => {
  it('nimmt nur Koordinaten in der Schweiz (inkl. Grenzraum) an', () => {
    expect(homeLocationSchema.safeParse({ lat: 47.3769, lng: 8.5417 }).success).toBe(true);
    expect(homeLocationSchema.safeParse({ lat: 52.52, lng: 13.405 }).success).toBe(false);
  });

  it('speichert nur die Zellmitte, höchstens ~150 m vom Eingabepunkt entfernt', () => {
    const input = { lat: 47.37689, lng: 8.54169 };
    const stored = coarseHome(input);
    expect(stored).not.toEqual(input);
    expect(distanceKm(input, stored)).toBeLessThan(0.15);
    // Gleiche Zelle → gleicher gespeicherter Punkt.
    expect(coarseHome({ lat: input.lat + 0.0001, lng: input.lng })).toEqual(stored);
  });

  it('Pass-Eingabe: Wohnort optional (fehlend = unverändert, null = entfernen)', () => {
    expect(passInputSchema.parse(pass).home).toBeUndefined();
    expect(passInputSchema.parse({ ...pass, home: null }).home).toBeNull();
    expect(passInputSchema.parse({ ...pass, home: { lat: 46.95, lng: 7.44 }, acceptTerms: true }).acceptTerms).toBe(true);
    expect(passInputSchema.safeParse({ ...pass, home: { lat: 0, lng: 0 } }).success).toBe(false);
  });
});
