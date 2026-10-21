import { describe, expect, it } from 'vitest';

import { colors } from '../src/tokens.generated.ts';

type Token = keyof typeof colors;

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const SURFACES: Token[] = ['surface-0', 'surface-50', 'surface-100'];
const TEXT: Token[] = ['ink-900', 'ink-700', 'ink-500', 'accent-600', 'ok-600', 'warn-600', 'critical-600'];

/** WCAG 2.2 AA (PRD 10.4): Text-Tokens erreichen 4.5:1 auf allen Flächen, hell und dunkel. */
describe('Farbkontrast der Text-Tokens', () => {
  for (const mode of ['light', 'dark'] as const) {
    for (const fg of TEXT) {
      it(`${fg} (${mode})`, () => {
        for (const bg of SURFACES) {
          expect(ratio(colors[fg][mode], colors[bg][mode]), `${fg} auf ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  }
});

/** Markenflächen sind in beiden Modi dunkel; Text darauf nur in brand-100/brand-300. */
describe('Kontrast auf Marken- und Sandflächen', () => {
  for (const mode of ['light', 'dark'] as const) {
    it(`brand-100/brand-300 auf brand-950/900 (${mode})`, () => {
      for (const fg of ['brand-100', 'brand-300'] as const) {
        for (const bg of ['brand-950', 'brand-900'] as const) {
          expect(ratio(colors[fg][mode], colors[bg][mode]), `${fg} auf ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
    it(`Text-Tokens auf sand-100 (${mode})`, () => {
      for (const fg of ['ink-900', 'ink-700', 'ink-500', 'accent-600'] as const) {
        expect(ratio(colors[fg][mode], colors['sand-100'][mode]), `${fg} auf sand-100`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
