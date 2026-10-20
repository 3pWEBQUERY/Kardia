import { QUEUES } from '@kardia/core';

import { db, enqueue, log } from '../context.ts';
import { feedHash, itemHash, parseFeed } from '../lib/feed.ts';

/**
 * Feed-Import (PRD 12.3, R2): stündlich lesen, neue/geänderte Stellen per Hash
 * erkennen und als Entwurf anlegen. Veröffentlichte Stellen werden nie automatisch
 * verändert – Änderungen landen als Entwurfsdaten, bis jemand bestätigt.
 */
export async function handleFeedImport(job: { feedId: string }): Promise<{ created: number; updated: number; unchanged: boolean }> {
  const feed = await db().jobFeed.findUnique({ where: { id: job.feedId } });
  if (!feed) return { created: 0, updated: 0, unchanged: true };
  let body: string;
  try {
    const res = await fetch(feed.url, { signal: AbortSignal.timeout(20_000), headers: { 'User-Agent': 'KardiaFeed/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    body = await res.text();
  } catch (error) {
    await db().jobFeed.update({ where: { id: feed.id }, data: { lastRunAt: new Date(), lastError: (error as Error).message.slice(0, 300) } });
    return { created: 0, updated: 0, unchanged: true };
  }
  const items = parseFeed(body, feed.format === 'JSON' ? 'JSON' : 'XML');
  const hash = feedHash(items);
  if (hash === feed.lastHash) {
    await db().jobFeed.update({ where: { id: feed.id }, data: { lastRunAt: new Date(), lastError: null } });
    return { created: 0, updated: 0, unchanged: true };
  }
  let created = 0;
  let updated = 0;
  for (const item of items) {
    if (!item.profession) {
      log.warn('Feed-Eintrag ohne erkennbaren Beruf übersprungen', { feedId: feed.id, ref: item.externalRef });
      continue;
    }
    const h = itemHash(item);
    const existing = await db().job.findUnique({ where: { feedId_externalRef: { feedId: feed.id, externalRef: item.externalRef } } });
    if (existing?.sourceHash === h) continue;
    const data = {
      title: item.title,
      profession: item.profession,
      workloadMinPct: item.workloadMinPct ?? 100,
      workloadMaxPct: item.workloadMaxPct ?? item.workloadMinPct ?? 100,
      startDate: item.startDate ? new Date(item.startDate) : null,
      sourceHash: h,
    };
    if (!existing) {
      await db().job.create({ data: { ...data, wardId: feed.wardId, feedId: feed.id, externalRef: item.externalRef, status: 'DRAFT' } });
      created++;
    } else if (existing.status === 'DRAFT') {
      await db().job.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      // Bestehende veröffentlichte Stelle: nur markieren, damit der Arbeitgeber prüft.
      await db().event.create({ data: { name: 'feed.changed', orgId: feed.organizationId, entityId: existing.id, props: { item: { ...item } } } });
      await db().job.update({ where: { id: existing.id }, data: { sourceHash: h } });
      updated++;
    }
  }
  await db().jobFeed.update({ where: { id: feed.id }, data: { lastHash: hash, lastRunAt: new Date(), lastError: null } });
  return { created, updated, unchanged: false };
}

/** Stündlich: alle Feeds einplanen (gleichmässig verteilt). */
export async function handleFeedSchedule(): Promise<{ scheduled: number }> {
  const feeds = await db().jobFeed.findMany({ select: { id: true } });
  for (const [i, f] of feeds.entries()) {
    await enqueue(QUEUES.feedImport, { feedId: f.id }, { singletonKey: f.id, startAfter: (i % 30) * 60 });
  }
  return { scheduled: feeds.length };
}
