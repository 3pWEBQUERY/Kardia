import { decodeGeohash, isGeohash } from '@kardia/core';

import { db, log } from '../context.ts';
import { carMinutes, publicTransportMinutes } from '../lib/routing.ts';

/** Pendelzeit je Station (ÖV + Auto), Cache 30 Tage pro Geohash-Zelle und Station. */
export async function handleCommute(job: { origin: string; wardIds: string[] }): Promise<{ computed: number }> {
  if (!isGeohash(job.origin)) return { computed: 0 };
  const from = decodeGeohash(job.origin);
  const wards = await db().ward.findMany({ where: { id: { in: job.wardIds.slice(0, 100) } }, include: { location: { select: { lat: true, lng: true } } } });
  let computed = 0;
  for (const ward of wards) {
    const to = { lat: ward.location.lat, lng: ward.location.lng };
    for (const [mode, fn] of [
      ['PT', publicTransportMinutes],
      ['CAR', carMinutes],
    ] as const) {
      try {
        const minutes = await fn(from, to);
        if (minutes === null) continue;
        await db().commuteCache.upsert({
          where: { originGeohash_wardId_mode: { originGeohash: job.origin, wardId: ward.id, mode } },
          create: { originGeohash: job.origin, wardId: ward.id, mode, minutes },
          update: { minutes, computedAt: new Date() },
        });
        computed++;
      } catch (error) {
        log.warn('Pendelzeit fehlgeschlagen', { mode, wardId: ward.id, error: (error as Error).message });
      }
    }
  }
  return { computed };
}
