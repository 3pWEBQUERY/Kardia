'use client';

import { ArrowRight, Banknote, Car, Gauge, Heart, MapPin, TrainFront, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { evaluateMatch, formatChfRange, type Condition, type MatchResult, type PartialWardProfile } from '@kardia/core';
import { Button, Icon, StatusChip, cx, useToast, type RosterCode } from '@kardia/ui';

import { loadMoreResults } from '@/app/actions/search';
import { DEPARTMENT_ICONS } from '@/components/brand/departmentIcons';
import { ConditionChips } from '@/components/domain/ConditionChips';
import { Roster } from '@/components/domain/Roster';
import { saveJob } from '@/lib/saveJob';
import { useActionMessage } from '@/lib/useActionError';

import type { Department } from '@kardia/db/enums';

export interface ClientHit {
  jobId: string;
  title: string;
  orgName: string;
  city: string;
  wardId: string;
  wardName: string;
  department: string;
  workloadMinPct: number;
  workloadMaxPct: number;
  rosterPattern: RosterCode[];
  profile: PartialWardProfile;
  hasParking: boolean;
  allowsPendingRecog: boolean;
  trainingCategory: string | null;
  commute: { PT?: number; CAR?: number };
  match: MatchResult;
  stale: boolean;
  saved: boolean;
}

const MAX_POLLS = 6;

/**
 * Trefferliste. Pendelzeit lädt clientseitig nach (aus dem Cache oder per Job);
 * sobald sie bekannt ist, werden Bedingungen neu bewertet und Treffer, die eine
 * Muss-Bedingung verletzen, ausgeblendet (AK-B1).
 */
export function ResultList({
  hits: firstPage,
  total,
  filterParam,
  nextCursor: firstCursor,
  showCount = true,
  conditions,
  origin,
  workloadPct,
  signedIn,
  compareIds,
}: {
  hits: ClientHit[];
  total: number;
  /** Kodierter Filter (`?f=`), damit Nachladen denselben Zustand nutzt (AK-B2). */
  filterParam: string;
  nextCursor: string | null;
  showCount?: boolean;
  conditions: Condition[];
  origin: string | null;
  workloadPct: number | null;
  signedIn: boolean;
  compareIds: string[];
}) {
  const r = useTranslations('public.results');
  const [hits, setHits] = useState(firstPage);
  const [cursor, setCursor] = useState(firstCursor);
  const [loading, setLoading] = useState(false);
  const t = useTranslations('common');
  const e = useTranslations('enums');
  const x = useTranslations('explore.search');
  const toast = useToast();
  const message = useActionMessage();
  const [commute, setCommute] = useState<Record<string, { PT?: number; CAR?: number }>>({});
  const [saved, setSaved] = useState(() => new Set(firstPage.filter((h) => h.saved).map((h) => h.jobId)));

  const loadMore = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    const res = await loadMoreResults(filterParam, cursor);
    setLoading(false);
    if (!res.ok) return toast({ tone: 'critical', message: message(res) });
    const known = new Set(hits.map((h) => h.jobId));
    const fresh = res.data.hits.filter((h) => !known.has(h.jobId));
    setHits((prev) => [...prev, ...fresh]);
    setSaved((prev) => new Set([...prev, ...fresh.filter((h) => h.saved).map((h) => h.jobId)]));
    setCursor(res.data.nextCursor);
  };
  const [compare, setCompare] = useState(() => new Set(compareIds));
  const wantsCommute = !!origin && conditions.some((c) => c.key === 'maxCommute');

  useEffect(() => {
    if (!origin || hits.length === 0) return;
    let polls = 0;
    let stop = false;
    const wardIds = [...new Set(hits.map((h) => h.wardId))];
    const load = async () => {
      polls += 1;
      const res = await fetch(`/api/commute?origin=${origin}&wards=${wardIds.join(',')}`);
      if (!res.ok || stop) return;
      const json = (await res.json()) as { minutes: Record<string, { PT?: number; CAR?: number }>; pending: string[] };
      setCommute(json.minutes);
      if (json.pending.length && polls < MAX_POLLS) setTimeout(() => void load(), 2000 * polls);
    };
    void load();
    return () => {
      stop = true;
    };
  }, [origin, hits]);

  const evaluated = useMemo(
    () =>
      hits
        .map((h) => {
          const c = { ...h.commute, ...commute[h.wardId] };
          const match = wantsCommute
            ? evaluateMatch(conditions, { profile: h.profile, hasParking: h.hasParking, allowsPendingRecog: h.allowsPendingRecog, trainingCategory: h.trainingCategory, commute: c })
            : h.match;
          return { ...h, match, commute: c };
        })
        .filter((h) => !h.match.excluded),
    [hits, commute, conditions, wantsCommute],
  );

  const onSave = async (jobId: string) => {
    if (!signedIn) {
      window.location.assign(new URL(`/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`, window.location.origin).href);
      return;
    }
    // Optimistisch, weil umkehrbar (PRD 7.4) – mit Rückgängig im Toast.
    const wasSaved = saved.has(jobId);
    const flip = (on: boolean) =>
      setSaved((prev) => {
        const next = new Set(prev);
        if (on) next.add(jobId);
        else next.delete(jobId);
        return next;
      });
    flip(!wasSaved);
    const result = await saveJob(jobId, wasSaved);
    if (!result.ok) {
      flip(wasSaved);
      toast({ tone: 'critical', message: message(result) });
      return;
    }
    toast({
      tone: 'neutral',
      message: result.data.saved ? t('search.savedToast') : t('search.unsavedToast'),
      undo: { label: t('actions.undo'), onUndo: () => void saveJob(jobId, result.data.saved).then((r) => r.ok && flip(r.data.saved)) },
    });
  };

  const toggleCompare = (jobId: string) =>
    setCompare((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else if (next.size < 4) next.add(jobId);
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      {compare.size > 0 ? (
        <div className="sticky top-16 z-20 flex items-center justify-between gap-3 rounded-card border border-accent-600 bg-accent-50 px-4 py-2">
          <span className="text-body-s text-ink-900">{t('search.compareCount', { count: compare.size })}</span>
          <Button asChild size="s" variant="primary">
            <Link href={`/compare?ids=${[...compare].join(',')}`}>{t('actions.compare')}</Link>
          </Button>
        </div>
      ) : null}
      <ol className="flex flex-col gap-3">
        {evaluated.map((h) => (
          <li
            key={h.jobId}
            className={cx(
              'group flex flex-col gap-4 rounded-card border bg-surface-0 p-4 transition-colors hover:border-ink-500 md:p-5',
              compare.has(h.jobId) ? 'border-accent-600' : 'border-line-200',
            )}
          >
            <div className="flex items-start gap-4">
              <span className="hidden size-12 shrink-0 items-center justify-center rounded-control bg-accent-50 text-accent-700 sm:inline-flex">
                <Icon icon={DEPARTMENT_ICONS[h.department as Department]} size={22} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-micro font-semibold tracking-wide text-accent-700 uppercase">{e(`Department.${h.department}`)}</span>
                <Link href={`/jobs/${h.jobId}`} className="text-h3 text-ink-900 hover:text-accent-700">
                  {h.title}
                </Link>
                <p className="flex flex-wrap items-center gap-x-2 text-body-s text-ink-700">
                  <span className="font-medium text-ink-900">{h.orgName}</span>
                  <span aria-hidden>·</span>
                  <span>{h.wardName}</span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Icon icon={MapPin} size={14} />
                    {h.city}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <label className="hidden items-center gap-1.5 rounded-control px-2 text-micro text-ink-700 hover:bg-surface-100 sm:flex pointer-coarse:min-h-touch">
                  <input type="checkbox" checked={compare.has(h.jobId)} onChange={() => toggleCompare(h.jobId)} className="size-4 accent-[var(--k-color-accent-600)]" />
                  {t('actions.compare')}
                </label>
                <button
                  type="button"
                  onClick={() => void onSave(h.jobId)}
                  aria-pressed={saved.has(h.jobId)}
                  aria-label={saved.has(h.jobId) ? t('actions.remembered') : t('actions.remember')}
                  className="inline-flex size-touch items-center justify-center rounded-control border border-line-200 text-ink-700 hover:bg-surface-100 aria-pressed:border-accent-600 aria-pressed:bg-accent-50 aria-pressed:text-accent-600"
                >
                  <Icon icon={Heart} fill={saved.has(h.jobId) ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
            <ul className="flex flex-wrap gap-2 text-body-s font-medium text-ink-900 tabular">
              {h.profile.salaryMinChf != null && h.profile.salaryMaxChf != null ? (
                <li className="inline-flex items-center gap-1.5 rounded-chip bg-surface-100 px-3 py-1">
                  <Icon icon={Banknote} size={14} className="text-ink-500" />
                  {formatChfRange(h.profile.salaryMinChf, h.profile.salaryMaxChf)}
                </li>
              ) : null}
              <li className="inline-flex items-center gap-1.5 rounded-chip bg-surface-100 px-3 py-1">
                <Icon icon={Gauge} size={14} className="text-ink-500" />
                {h.workloadMinPct === h.workloadMaxPct ? `${h.workloadMinPct} %` : `${h.workloadMinPct}–${h.workloadMaxPct} %`}
              </li>
              {h.commute.PT != null ? (
                <li className="inline-flex items-center gap-1.5 rounded-chip bg-surface-100 px-3 py-1">
                  <Icon icon={TrainFront} size={14} className="text-ink-500" />
                  {t('search.commutePt', { minutes: h.commute.PT })}
                </li>
              ) : null}
              {h.commute.CAR != null ? (
                <li className="inline-flex items-center gap-1.5 rounded-chip bg-surface-100 px-3 py-1">
                  <Icon icon={Car} size={14} className="text-ink-500" />
                  {t('search.commuteCar', { minutes: h.commute.CAR })}
                </li>
              ) : null}
            </ul>
            <div className="rounded-control bg-surface-50 p-3">
              <Roster pattern={h.rosterPattern} workloadPct={workloadPct ?? 100} compact showLegend={false} />
            </div>
            <ConditionChips results={h.match.results} />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-200 pt-3">
              {h.stale ? (
                <StatusChip tone="warn" icon={<Icon icon={TriangleAlert} size={14} />}>
                  {t('states.stale')}
                </StatusChip>
              ) : (
                <label className="flex items-center gap-1.5 text-micro text-ink-700 sm:hidden pointer-coarse:min-h-touch">
                  <input type="checkbox" checked={compare.has(h.jobId)} onChange={() => toggleCompare(h.jobId)} className="size-4 accent-[var(--k-color-accent-600)]" />
                  {t('actions.compare')}
                </label>
              )}
              <div className="ml-auto flex items-center gap-4 text-body-s font-medium">
                <Link href={`/wards/${h.wardId}`} className="text-ink-700 hover:text-accent-700">
                  {x('viewWard')}
                </Link>
                <Link href={`/jobs/${h.jobId}`} className="inline-flex items-center gap-1 text-accent-600 hover:text-accent-700">
                  {x('details')}
                  <Icon icon={ArrowRight} size={16} />
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {cursor || (showCount && hits.length < total) ? (
        <div className="flex flex-col items-center gap-2 py-2">
          {showCount ? <p className="text-micro text-ink-500 tabular">{r('shown', { shown: hits.length, total })}</p> : null}
          {cursor ? (
            <Button asChild aria-busy={loading}>
              {/* Ohne JavaScript ein normaler Link auf die nächste Seite; mit JavaScript wird angehängt. */}
              <a
                href={`/search?f=${filterParam}&cursor=${cursor}`}
                rel="next"
                onClick={(ev) => {
                  ev.preventDefault();
                  void loadMore();
                }}
              >
                {loading ? r('loading') : r('loadMore')}
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
