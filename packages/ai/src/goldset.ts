/**
 * Goldset-Lauf für KI-1 (PRD 9.3): echte, anonymisierte Inserate mit manuell
 * erfassten Soll-Feldern in goldset/*.json. Freigabe nur bei ≥ 95 % Feldgenauigkeit
 * und 0 % erfundenen Werten (Wert ohne Soll-Wert). Läuft nächtlich im CI.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { IMPORT_FIELD_KEYS, structureJobAd } from './functions/jobStructuring.ts';

import type { AiRunRecord } from './runner.ts';

const dir = fileURLToPath(new URL('../goldset', import.meta.url));
const sampleSchema = z.object({
  id: z.string(),
  synthetic: z.boolean().default(false),
  text: z.string().min(50),
  expected: z.record(z.string(), z.unknown()),
});

const ACCURACY_MIN = 0.95;

function same(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    const sa = (a as unknown[]).map(String).sort();
    const sb = (b as unknown[]).map(String).sort();
    return sa.length === sb.length && sa.join() === sb.join();
  }
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-6;
  if (typeof a === 'string' && typeof b === 'string') return a.trim().toLowerCase() === b.trim().toLowerCase();
  return a === b;
}

const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const runs: AiRunRecord[] = [];
let correct = 0;
let total = 0;
let invented = 0;
const report: { id: string; wrong: string[]; invented: string[] }[] = [];

for (const file of files) {
  const sample = sampleSchema.parse(JSON.parse(readFileSync(join(dir, file), 'utf8')));
  const result = await structureJobAd({
    text: sample.text,
    orgId: 'goldset',
    logger: (r) => Promise.resolve(void runs.push(r)),
  });
  const wrong: string[] = [];
  const inventedHere: string[] = [];
  for (const key of IMPORT_FIELD_KEYS) {
    const expected = sample.expected[key] ?? null;
    const actual = result.fields[key]?.value ?? null;
    total += 1;
    if (expected === null && actual !== null) {
      invented += 1;
      inventedHere.push(key);
    } else if (same(expected, actual)) {
      correct += 1;
    } else {
      wrong.push(key);
    }
  }
  report.push({ id: sample.id, wrong, invented: inventedHere });
}

const accuracy = total ? correct / total : 0;
const cost = runs.reduce((s, r) => s + r.costUsd, 0);
const summary = { samples: files.length, accuracy, invented, costUsd: cost, report };
writeFileSync(join(dir, '..', 'goldset-report.json'), JSON.stringify(summary, null, 2));
console.warn(
  `Goldset: ${files.length} Inserate, Feldgenauigkeit ${(accuracy * 100).toFixed(1)} %, erfundene Werte ${invented}, Kosten USD ${cost.toFixed(4)}`,
);
if (accuracy < ACCURACY_MIN || invented > 0) {
  console.error('KI-1 erfüllt die Freigabekriterien nicht (≥ 95 % Genauigkeit, 0 erfundene Werte).');
  process.exit(1);
}
