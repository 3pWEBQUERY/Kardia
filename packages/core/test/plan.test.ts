import { describe, expect, it } from 'vitest';

import { daysUntilPlanExpiry, effectivePlan, locationQuotaExceeded, wardQuotaExceeded } from '../src/org.ts';

const now = new Date('2026-10-21T12:00:00Z');

describe('Wirksames Abo (planValidUntil)', () => {
  it('ohne Frist gilt das Abo', () => {
    expect(effectivePlan({ plan: 'INSTITUTION', planValidUntil: null }, now)).toBe('INSTITUTION');
  });
  it('vor Ablauf gilt das Abo, ab Ablauf nicht mehr', () => {
    expect(effectivePlan({ plan: 'PRAXIS', planValidUntil: new Date('2026-10-22T00:00:00Z') }, now)).toBe('PRAXIS');
    expect(effectivePlan({ plan: 'PRAXIS', planValidUntil: now }, now)).toBeNull();
    expect(effectivePlan({ plan: 'PRAXIS', planValidUntil: new Date('2026-01-01') }, now)).toBeNull();
  });
  it('ohne Abo bleibt es ohne Abo', () => {
    expect(effectivePlan({ plan: null, planValidUntil: new Date('2030-01-01') }, now)).toBeNull();
  });
  it('Tage bis Ablauf aufgerundet', () => {
    expect(daysUntilPlanExpiry({ plan: 'PRAXIS', planValidUntil: new Date('2026-11-04T12:00:00Z') }, now)).toBe(14);
    expect(daysUntilPlanExpiry({ plan: 'PRAXIS', planValidUntil: new Date('2026-11-04T11:00:00Z') }, now)).toBe(14);
    expect(daysUntilPlanExpiry({ plan: 'PRAXIS', planValidUntil: null }, now)).toBeNull();
  });
});

describe('Kontingente Stationen und Standorte', () => {
  it('Praxis: eine Station, ein Standort', () => {
    expect(wardQuotaExceeded('PRAXIS', 0)).toBe(false);
    expect(wardQuotaExceeded('PRAXIS', 1)).toBe(true);
    expect(locationQuotaExceeded('PRAXIS', 0)).toBe(false);
    expect(locationQuotaExceeded('PRAXIS', 1)).toBe(true);
  });
  it('Spitalgruppe: unbegrenzt', () => {
    expect(wardQuotaExceeded('SPITALGRUPPE', 500)).toBe(false);
    expect(locationQuotaExceeded('SPITALGRUPPE', 12)).toBe(false);
  });
  it('ohne Abo keine Obergrenze beim Anlegen', () => {
    expect(wardQuotaExceeded(null, 9)).toBe(false);
    expect(locationQuotaExceeded(null, 3)).toBe(false);
  });
});
