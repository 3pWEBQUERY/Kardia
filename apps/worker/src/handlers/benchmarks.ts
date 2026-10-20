import { BENCHMARK_FIELDS, computeBenchmark } from '@kardia/core';

import { db } from '../context.ts';

/**
 * Benchmark (Cockpit R2): Werte jeder Station gegen den Median ihres Fachbereichs in
 * ihrer Region (Kanton). Nur aggregiert und erst ab 8 Vergleichsstationen (PRD 14.3);
 * darunter wird ein bestehender Wert entfernt.
 */
export async function handleBenchmarks(): Promise<{ upserted: number; removed: number }> {
  const wards = await db().ward.findMany({ include: { location: { select: { canton: true, organization: { select: { verification: true } } } } } });
  const verified = wards.filter((w) => w.location.organization.verification === 'VERIFIED');
  let upserted = 0;
  let removed = 0;
  for (const ward of verified) {
    const peers = verified.filter((p) => p.id !== ward.id && p.department === ward.department && p.location.canton === ward.location.canton);
    for (const field of BENCHMARK_FIELDS) {
      const value = (w: (typeof wards)[number]) => {
        const v = (w as unknown as Record<string, unknown>)[field];
        return typeof v === 'number' ? v : null;
      };
      const result = computeBenchmark(field, value(ward), peers.map(value));
      if (result) {
        await db().wardBenchmark.upsert({
          where: { wardId_field: { wardId: ward.id, field } },
          create: { wardId: ward.id, field, wardValue: result.wardValue, medianValue: result.medianValue, peerCount: result.peerCount },
          update: { wardValue: result.wardValue, medianValue: result.medianValue, peerCount: result.peerCount, computedAt: new Date() },
        });
        upserted++;
      } else {
        const del = await db().wardBenchmark.deleteMany({ where: { wardId: ward.id, field } });
        removed += del.count;
      }
    }
  }
  return { upserted, removed };
}
