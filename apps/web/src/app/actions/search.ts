'use server';

import { redirect } from 'next/navigation';

import { AiError, dbAiLogger, parseSearchSentence } from '@kardia/ai';
import {
  DEALBREAKERS,
  decodeFilter,
  encodeFilter,
  searchFilterSchema,
  type Condition,
  type Dealbreaker,
  type SearchFilterInput,
} from '@kardia/core';

import { toClientHits } from '@/server/clientHits';
import { db } from '@/server/db';
import { searchJobs } from '@/server/services/search';
import { getSession } from '@/server/session';

import { actionResult, type ActionResult } from './result.ts';

import type { ClientHit } from '@/components/search/ResultList';

/** Seitengrösse der Trefferliste (erste Seite und jedes Nachladen). */
const PAGE_SIZE = 30;

const formText = (formData: FormData, key: string): string => {
  const v = formData.get(key);
  return typeof v === 'string' ? v : '';
};

/** Startseite: drei Fragen statt Suchfeld (PRD 7.3) – funktioniert auch ohne JavaScript. */
export async function startSearch(formData: FormData): Promise<void> {
  const profession = formText(formData, 'profession') || undefined;
  const workload = Number(formData.get('workload') ?? 0) || undefined;
  const dealbreakers = formData.getAll('dealbreaker').map(String) as Dealbreaker[];
  const conditions: Condition[] = dealbreakers.filter((d) => d in DEALBREAKERS).map((d) => DEALBREAKERS[d]);
  const parsed = searchFilterSchema.safeParse({ profession, workloadPct: workload, conditions });
  redirect(`/search?f=${encodeFilter(parsed.success ? parsed.data : {})}`);
}

/**
 * KI-2 Suchsatz zu Filter, Zeitlimit 1'500 ms. Bei Überschreitung oder Fehler:
 * klassische Stichwortsuche mit dem Satz als Suchbegriff (PRD 9.2).
 */
export async function searchSentence(formData: FormData): Promise<void> {
  const sentence = formText(formData, 'q').trim().slice(0, 300);
  if (!sentence) redirect('/search');
  let filter: SearchFilterInput = { q: sentence };
  let viaAi = false;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      filter = await parseSearchSentence({ sentence, logger: dbAiLogger(db) });
      viaAi = true;
    } catch (error) {
      if (!(error instanceof AiError)) console.error(error);
    }
  }
  // Gezählt wird einmal auf der Suchseite (search.performed mit viaAi), nicht hier.
  redirect(`/search?f=${encodeFilter(filter)}${viaAi ? '&ai=1' : ''}`);
}

/**
 * "Weitere Treffer laden": nächste Seite zum gleichen Filter (`?f=`, AK-B2). Ohne
 * JavaScript führt derselbe Knopf als Link mit `cursor` zur nächsten Seite.
 */
export async function loadMoreResults(f: string, cursor: string): Promise<ActionResult<{ hits: ClientHit[]; nextCursor: string | null }>> {
  return actionResult(async () => {
    const filter = decodeFilter(f);
    const [result, session] = await Promise.all([searchJobs(filter, { cursor, limit: PAGE_SIZE }), getSession()]);
    const saved = session
      ? await db.savedJob.findMany({ where: { candidate: { userId: session.user.id }, jobId: { in: result.hits.map((h) => h.jobId) } }, select: { jobId: true } })
      : [];
    return { hits: toClientHits(result.hits, new Set(saved.map((s) => s.jobId))), nextCursor: result.nextCursor };
  });
}
