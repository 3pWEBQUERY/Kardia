import 'server-only';

import type { SearchHit } from './services/search.ts';
import type { ClientHit } from '@/components/search/ResultList';

/** Treffer für die Client-Liste: nur, was die Liste anzeigt (JS-Budget, PRD 10.4). */
export function toClientHits(hits: SearchHit[], savedIds: ReadonlySet<string>): ClientHit[] {
  return hits.map((h) => ({
    jobId: h.jobId,
    title: h.title,
    orgName: h.org.name,
    city: h.location.city,
    wardId: h.ward.id,
    wardName: h.ward.name,
    department: h.ward.department,
    workloadMinPct: h.workloadMinPct,
    workloadMaxPct: h.workloadMaxPct,
    rosterPattern: h.ward.rosterPattern,
    profile: h.profile,
    hasParking: h.location.hasParking,
    allowsPendingRecog: h.allowsPendingRecog,
    trainingCategory: h.trainingCategory,
    commute: h.commute,
    match: h.match,
    stale: h.stale,
    saved: savedIds.has(h.jobId),
  }));
}
