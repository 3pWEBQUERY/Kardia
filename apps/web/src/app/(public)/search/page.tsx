import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { EVENTS, decodeFilter, encodeFilter, encodeGeohash, withCondition, withoutCondition } from '@kardia/core';
import { Button, Callout, EmptyState } from '@kardia/ui';

import { ActiveFilters } from '@/components/search/ActiveFilters';
import { MapLoader } from '@/components/search/MapLoader';
import { ResultList } from '@/components/search/ResultList';
import { SaveSearch } from '@/components/search/SaveSearch';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SortSelect, ViewSwitch } from '@/components/search/ViewSwitch';
import { track } from '@/server/audit';
import { toClientHits } from '@/server/clientHits';
import { db } from '@/server/db';
import { searchJobs } from '@/server/services/search';
import { getSession } from '@/server/session';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('public.search');
  return { title: t('title'), robots: { index: false } };
}

/**
 * Suche (Liste/Karte). Ergebnisse sofort, ohne Konto (PRD 7.3). Der Filterzustand
 * steht vollständig in `?f=` (AK-B2).
 */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ f?: string; ai?: string; compare?: string; cursor?: string }> }) {
  const sp = await searchParams;
  const filter = decodeFilter(sp.f);
  const t = await getTranslations('public.search');
  const c = await getTranslations('common');
  const session = await getSession();
  const candidate = session ? await db.candidateProfile.findUnique({ where: { userId: session.user.id }, include: { savedJobs: { select: { jobId: true } } } }) : null;

  // Wohnort des Profils als Startpunkt vorschlagen (nur Geohash-Zelle, nie die Adresse).
  const suggestedOrigin = !filter.origin && candidate?.homeLat != null && candidate.homeLng != null ? encodeGeohash(candidate.homeLat, candidate.homeLng) : null;

  // `cursor` nur als Rückfall ohne JavaScript ("Weitere Treffer laden" als Link).
  const cursor = filter.view === 'list' && sp.cursor && /^[\w-]{1,24}$/.test(sp.cursor) ? sp.cursor : null;
  const result = await searchJobs(filter, { cursor, limit: filter.view === 'map' ? 500 : 30 });
  // Eine Suche zählt einmal (erste Seite), nicht jede weitere Seite.
  if (!cursor) await track(EVENTS.searchPerformed, { userId: session?.user.id ?? null, props: { results: result.total, conditions: filter.conditions.length, viaAi: sp.ai === '1' } });

  const savedIds = new Set(candidate?.savedJobs.map((s) => s.jobId) ?? []);
  const hits = toClientHits(result.hits, savedIds);

  const suggestionHref = (() => {
    const s = result.suggestion;
    if (!s) return null;
    const cond = filter.conditions.find((x) => x.key === s.removeKey);
    if (!cond) return null;
    const next = s.relaxedValue != null && 'value' in cond ? withCondition(filter, { ...cond, value: s.relaxedValue }) : withoutCondition(filter, s.removeKey);
    return { href: `/search?f=${encodeFilter(next)}`, label: s.relaxedValue != null ? t('relax', { condition: c(`conditions.${s.removeKey}.wanted`, { value: s.relaxedValue, transport: '' }), count: s.count }) : t('drop', { condition: c(`conditions.${s.removeKey}.wanted`, { value: 'value' in cond ? cond.value : '', transport: '' }), count: s.count }) };
  })();


  return (
    <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-s text-ink-700 tabular">{c('pagination.results', { count: result.total })}</p>
      </div>
      {sp.ai ? <Callout>{t('aiParsed')}</Callout> : null}
      {suggestedOrigin ? (
        <Callout
          action={
            <Button asChild size="s">
              <Link href={`/search?f=${encodeFilter({ ...filter, origin: suggestedOrigin })}`}>{t('useHome')}</Link>
            </Button>
          }
        >
          {t('useHomeHint')}
        </Callout>
      ) : null}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <SearchFilters filter={filter} total={result.total} />
        <section aria-label={t('results')} className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ViewSwitch filter={filter} />
            <div className="flex items-center gap-3">
              <SortSelect filter={filter} />
              <SaveSearch filter={filter} signedIn={!!session} />
            </div>
          </div>
          <ActiveFilters filter={filter} />
          {result.total === 0 ? (
            <EmptyState
              action={
                suggestionHref ? (
                  <Button asChild variant="primary">
                    <Link href={suggestionHref.href}>{suggestionHref.label}</Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/search">{t('reset')}</Link>
                  </Button>
                )
              }
            >
              {suggestionHref ? t('emptyWithSuggestion') : t('empty')}
            </EmptyState>
          ) : filter.view === 'map' ? (
            <MapLoader
              label={t('map')}
              points={result.hits.map((h) => ({ jobId: h.jobId, title: h.title, orgName: h.org.name, lat: h.location.lat, lng: h.location.lng }))}
            />
          ) : (
            <ResultList
              key={`${sp.f ?? ''}:${cursor ?? ''}`}
              hits={hits}
              total={result.total}
              filterParam={encodeFilter(filter)}
              nextCursor={result.nextCursor}
              showCount={!cursor}
              conditions={filter.conditions}
              origin={filter.origin ?? null}
              workloadPct={filter.workloadPct ?? null}
              signedIn={!!session}
              compareIds={(sp.compare ?? '').split(',').filter(Boolean)}
            />
          )}
        </section>
      </div>
    </div>
  );
}
