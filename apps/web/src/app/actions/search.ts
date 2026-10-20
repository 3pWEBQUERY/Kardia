'use server';

import { redirect } from 'next/navigation';

import { AiError, dbAiLogger, parseSearchSentence } from '@kardia/ai';
import {
  DEALBREAKERS,
  EVENTS,
  encodeFilter,
  searchFilterSchema,
  type Condition,
  type Dealbreaker,
  type SearchFilterInput,
} from '@kardia/core';

import { track } from '@/server/audit';
import { db } from '@/server/db';
import { getSession } from '@/server/session';

/** Startseite: drei Fragen statt Suchfeld (PRD 7.3) – funktioniert auch ohne JavaScript. */
export async function startSearch(formData: FormData): Promise<void> {
  const profession = formData.get('profession')?.toString() || undefined;
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
  const sentence = (formData.get('q')?.toString() ?? '').trim().slice(0, 300);
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
  const s = await getSession();
  await track(EVENTS.searchPerformed, { userId: s?.user.id ?? null, props: { viaAi } });
  redirect(`/search?f=${encodeFilter(filter)}${viaAi ? '&ai=1' : ''}`);
}
