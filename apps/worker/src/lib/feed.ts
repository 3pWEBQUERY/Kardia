import { createHash } from 'node:crypto';

import { XMLParser } from 'fast-xml-parser';

import type { Profession } from '@kardia/db/enums';

/**
 * Feed-Import (PRD 12.3, R2): XML- oder JSON-Feed des Bewerbermanagementsystems.
 * Neue/geänderte Stellen werden per Hash erkannt und als Entwurf angelegt;
 * veröffentlicht wird erst nach Bestätigung der Pflichtfelder (AK-A1).
 */
export interface FeedItem {
  externalRef: string;
  title: string;
  profession: Profession | null;
  workloadMinPct: number | null;
  workloadMaxPct: number | null;
  startDate: string | null;
  description: string | null;
}

const PROFESSION_PATTERNS: [RegExp, Profession][] = [
  [/(assistenz|ober|leitend)\w*\s*(arzt|ärztin)|\barzt\b|ärztin|médecin|medico/i, 'PHYSICIAN'],
  [/\bMPA\b|praxisassistent/i, 'MPA'],
  [/\bFaGe\b|fachfrau gesundheit|fachmann gesundheit|fachperson gesundheit/i, 'FAGE'],
  [/\bAGS\b|assistent\w* gesundheit und soziales/i, 'AGS'],
  [/pflegehelfer|pflegeassistent|\bSRK\b/i, 'NURSING_AID_SRK'],
  [/hebamme|sage-femme|levatrice/i, 'MIDWIFE'],
  [/physiotherap/i, 'PHYSIOTHERAPIST'],
  [/ergotherap/i, 'OCCUPATIONAL_THERAPIST'],
  [/logopäd/i, 'SPEECH_THERAPIST'],
  [/\bMTRA\b|radiologiefach/i, 'MTRA'],
  [/\bBMA\b|biomedizinische analyti/i, 'BMA'],
  [/rettungssanit|ambulanc/i, 'PARAMEDIC'],
  [/\bTOA\b|operationstechni|fachperson operationstechnik/i, 'OR_TECHNICIAN'],
  [/pflegefach|pflegefachfrau|pflegefachmann|dipl\.?\s*pflege|infirmi|infermier/i, 'NURSE_HF_FH'],
];

export function guessProfession(title: string): Profession | null {
  for (const [re, p] of PROFESSION_PATTERNS) if (re.test(title)) return p;
  return null;
}

const round10 = (n: number) => Math.min(100, Math.max(10, Math.round(n / 10) * 10));

/** "80–100 %", "60%", "50 - 80" → [min, max]. */
export function parseWorkload(text: string | null | undefined): [number, number] | null {
  if (!text) return null;
  const nums = [...text.matchAll(/(\d{2,3})\s*%?/g)].map((m) => Number(m[1])).filter((n) => n >= 10 && n <= 100);
  if (nums.length === 0) return null;
  const min = round10(Math.min(...nums));
  const max = round10(Math.max(...nums));
  return [min, max];
}

function pick(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
    if (v && typeof v === 'object' && '#text' in v) return String((v)['#text']).trim();
  }
  return null;
}

function toIsoDate(value: string | null): string | null {
  if (!value) return null;
  const ch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);
  if (ch) return `${ch[3]}-${ch[2]?.padStart(2, '0')}-${ch[1]?.padStart(2, '0')}`;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function normalizeItem(raw: Record<string, unknown>): FeedItem | null {
  const externalRef = pick(raw, 'id', 'externalId', 'ref', 'reference', 'guid', 'jobId');
  const title = pick(raw, 'title', 'name', 'jobTitle', 'titel');
  if (!externalRef || !title) return null;
  const workload =
    parseWorkload(pick(raw, 'workload', 'pensum', 'employmentLevel')) ??
    (pick(raw, 'workloadMin') ? [round10(Number(pick(raw, 'workloadMin'))), round10(Number(pick(raw, 'workloadMax') ?? pick(raw, 'workloadMin')))] : null) ??
    parseWorkload(title);
  const professionRaw = pick(raw, 'profession', 'beruf');
  return {
    externalRef: externalRef.slice(0, 120),
    title: title.slice(0, 160),
    profession: (professionRaw && /^[A-Z_]+$/.test(professionRaw) ? (professionRaw as Profession) : null) ?? guessProfession(title),
    workloadMinPct: workload?.[0] ?? null,
    workloadMaxPct: workload?.[1] ?? null,
    startDate: toIsoDate(pick(raw, 'startDate', 'start', 'eintritt', 'entryDate')),
    description: pick(raw, 'description', 'beschreibung', 'text')?.slice(0, 20_000) ?? null,
  };
}

function findItemArray(node: unknown): Record<string, unknown>[] {
  if (Array.isArray(node)) {
    if (node.every((n) => n && typeof n === 'object')) return node as Record<string, unknown>[];
    return [];
  }
  if (!node || typeof node !== 'object') return [];
  const obj = node as Record<string, unknown>;
  for (const key of ['jobs', 'job', 'items', 'item', 'positions', 'position', 'stellen', 'stelle', 'entry']) {
    const v = obj[key];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
    if (v && typeof v === 'object') {
      const inner = findItemArray(v);
      if (inner.length) return inner;
      return [v as Record<string, unknown>];
    }
  }
  for (const v of Object.values(obj)) {
    const inner = findItemArray(v);
    if (inner.length) return inner;
  }
  return [];
}

export function parseFeed(body: string, format: 'XML' | 'JSON'): FeedItem[] {
  const doc: unknown = format === 'JSON' ? JSON.parse(body) : new XMLParser({ removeNSPrefix: true, ignoreAttributes: true }).parse(body);
  return findItemArray(doc)
    .map(normalizeItem)
    .filter((i): i is FeedItem => i !== null);
}

/** Stabiler Hash eines Eintrags: Änderung erkennen, ohne die Stelle neu zu schreiben. */
export function itemHash(item: FeedItem): string {
  const stable = JSON.stringify(Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))));
  return createHash('sha256').update(stable).digest('hex');
}

export function feedHash(items: FeedItem[]): string {
  return createHash('sha256').update(items.map(itemHash).sort().join('\n')).digest('hex');
}
