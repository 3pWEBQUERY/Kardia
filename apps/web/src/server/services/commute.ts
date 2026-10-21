import 'server-only';

import { QUEUES, decodeGeohash, distanceKm, isGeohash } from '@kardia/core';

import { db } from '../db.ts';
import { enqueue } from '../queue.ts';

/**
 * Pendelzeit (Modul B): ÖV über opentransportdata.swiss, Auto über OSRM; Ergebnis
 * pro Geohash-Zelle (~150 m) und Station 30 Tage gecacht. Fehlende Werte rechnet
 * der Worker asynchron; der Client fragt erneut nach (Nachladen ohne Spinner).
 */
export const COMMUTE_CACHE_DAYS = 30;
/** Weiter entfernte Stationen werden nicht gerechnet (Luftlinie). */
export const COMMUTE_MAX_KM = 120;

export async function commuteFor(origin: string, wardIds: string[]) {
  if (!isGeohash(origin) || wardIds.length === 0) return { minutes: {}, pending: [] as string[], unavailable: [] as string[] };
  const fresh = new Date(Date.now() - COMMUTE_CACHE_DAYS * 86400_000);
  const rows = await db.commuteCache.findMany({ where: { originGeohash: origin, wardId: { in: wardIds.slice(0, 100) }, computedAt: { gte: fresh } } });
  const minutes: Record<string, { PT?: number; CAR?: number }> = {};
  for (const r of rows) {
    minutes[r.wardId] = { ...minutes[r.wardId], [r.mode]: r.minutes };
  }
  const missing = wardIds.filter((id) => minutes[id]?.PT == null || minutes[id]?.CAR == null);
  let pending: string[] = [];
  let unavailable: string[] = [];
  if (missing.length) {
    // Nur Stationen in plausibler Distanz rechnen lassen; weiter entfernte gelten als
    // "nicht verfügbar", damit der Client nicht vergeblich nachfragt.
    const from = decodeGeohash(origin);
    const wards = await db.ward.findMany({ where: { id: { in: missing } }, include: { location: { select: { lat: true, lng: true } } } });
    const near = new Set(wards.filter((w) => distanceKm(from, w.location) <= COMMUTE_MAX_KM).map((w) => w.id));
    pending = missing.filter((id) => near.has(id));
    unavailable = missing.filter((id) => !near.has(id));
    if (pending.length) await enqueue(QUEUES.commute, { origin, wardIds: pending }, { singletonKey: `${origin}:${[...pending].sort().join(',').slice(0, 200)}` });
  }
  return { minutes, pending, unavailable };
}
