import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { LOCALES, NAMESPACES } from '../../src/i18n/config.ts';

const dir = fileURLToPath(new URL('../../messages/', import.meta.url));

function keys(obj: unknown, prefix = ''): string[] {
  if (Array.isArray(obj)) return [prefix];
  if (obj && typeof obj === 'object') return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  return [prefix];
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\s*[,}]/g)].map((m) => m[1] ?? '').filter((n) => /^[a-z]/.test(n)).sort();
}

function flatten(obj: unknown, prefix = ''): Record<string, string> {
  if (typeof obj === 'string') return { [prefix]: obj };
  if (obj && typeof obj === 'object') return Object.assign({}, ...Object.entries(obj).map(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k))) as Record<string, string>;
  return {};
}

const load = (locale: string, ns: string): unknown => JSON.parse(readFileSync(`${dir}${locale}/${ns}.json`, 'utf8'));

describe('Übersetzungen (UI viersprachig, PRD 4)', () => {
  for (const ns of NAMESPACES) {
    const base = load('de-CH', ns);
    for (const locale of LOCALES.filter((l) => l !== 'de-CH')) {
      const file = `${dir}${locale}/${ns}.json`;
      it.skipIf(!existsSync(file))(`${locale}/${ns}: gleiche Schlüssel und Platzhalter wie de-CH`, () => {
        const other = load(locale, ns);
        expect(keys(other).sort()).toEqual(keys(base).sort());
        const a = flatten(base);
        const b = flatten(other);
        for (const [k, v] of Object.entries(a)) expect(placeholders(b[k] ?? ''), `${locale}/${ns}:${k}`).toEqual(placeholders(v));
      });
    }
  }
});
