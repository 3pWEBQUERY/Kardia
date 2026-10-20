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

export async function commuteFor(origin: string, wardIds: string[]) {
  if (!isGeohash(origin) || wardIds.length === 0) return { minutes: {}, pending: [] as string[] };
  const fresh = new Date(Date.now() - COMMUTE_CACHE_DAYS * 86400_000);
  const rows = await db.commuteCache.findMany({ where: { originGeohash: origin, wardId: { in: wardIds.slice(0, 100) }, computedAt: { gte: fresh } } });
  const minutes: Record<string, { PT?: number; CAR?: number }> = {};
  for (const r of rows) {
    minutes[r.wardId] = { ...minutes[r.wardId], [r.mode]: r.minutes };
  }
  const pending = wardIds.filter((id) => !minutes[id]?.PT || !minutes[id]?.CAR);
  if (pending.length) {
    // Nur Stationen in plausibler Distanz rechnen lassen (≤ 120 km Luftlinie).
    const from = decodeGeohash(origin);
    const wards = await db.ward.findMany({ where: { id: { in: pending } }, include: { location: { select: { lat: true, lng: true } } } });
    const near = wards.filter((w) => distanceKm(from, w.location) <= 120).map((w) => w.id);
    if (near.length) await enqueue(QUEUES.commute, { origin, wardIds: near }, { singletonKey: `${origin}:${near.sort().join(',').slice(0, 200)}` });
  }
  return { minutes, pending };
}
