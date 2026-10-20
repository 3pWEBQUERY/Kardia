'use client';

import { Heart, MapPin, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { evaluateMatch, formatChfRange, type Condition, type MatchResult, type PartialWardProfile } from '@kardia/core';
import { Button, Icon, StatusChip, useToast, type RosterCode } from '@kardia/ui';

import { toggleSavedJob } from '@/app/actions/candidate';
import { ConditionChips } from '@/components/domain/ConditionChips';
import { Roster } from '@/components/domain/Roster';
import { useActionMessage } from '@/lib/useActionError';

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
  hits,
  conditions,
  origin,
  workloadPct,
  signedIn,
  compareIds,
}: {
  hits: ClientHit[];
  conditions: Condition[];
  origin: string | null;
  workloadPct: number | null;
  signedIn: boolean;
  compareIds: string[];
}) {
  const t = useTranslations('common');
  const e = useTranslations('enums');
  const toast = useToast();
  const message = useActionMessage();
  const [commute, setCommute] = useState<Record<string, { PT?: number; CAR?: number }>>({});
  const [saved, setSaved] = useState(() => new Set(hits.filter((h) => h.saved).map((h) => h.jobId)));
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
      window.location.href = `/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
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
    const result = await toggleSavedJob(jobId);
    if (!result.ok) {
      flip(wasSaved);
      toast({ tone: 'critical', message: message(result) });
      return;
    }
    toast({
      tone: 'neutral',
      message: result.data.saved ? t('search.savedToast') : t('search.unsavedToast'),
      undo: { label: t('actions.undo'), onUndo: () => void toggleSavedJob(jobId).then((r) => r.ok && flip(r.data.saved)) },
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
          <li key={h.jobId} className="flex flex-col gap-3 rounded-card border border-line-300 bg-surface-0 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <Link href={`/jobs/${h.jobId}`} className="text-h3 text-ink-900 hover:text-accent-700">
                  {h.title}
                </Link>
                <p className="flex flex-wrap items-center gap-x-2 text-body-s text-ink-700">
                  <span>{h.orgName}</span>
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
                <label className="flex items-center gap-1.5 text-micro text-ink-700 pointer-coarse:min-h-touch">
                  <input type="checkbox" checked={compare.has(h.jobId)} onChange={() => toggleCompare(h.jobId)} className="size-4 accent-[var(--k-color-accent-600)]" />
                  {t('actions.compare')}
                </label>
                <button
                  type="button"
                  onClick={() => void onSave(h.jobId)}
                  aria-pressed={saved.has(h.jobId)}
                  aria-label={saved.has(h.jobId) ? t('actions.remembered') : t('actions.remember')}
                  className="inline-flex size-touch items-center justify-center rounded-control text-ink-700 hover:bg-surface-100 aria-pressed:text-accent-600"
                >
                  <Icon icon={Heart} fill={saved.has(h.jobId) ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-body-s text-ink-900 tabular">
              {h.profile.salaryMinChf != null && h.profile.salaryMaxChf != null ? <span>{formatChfRange(h.profile.salaryMinChf, h.profile.salaryMaxChf)}</span> : null}
              <span>
                {h.workloadMinPct === h.workloadMaxPct ? `${h.workloadMinPct} %` : `${h.workloadMinPct}–${h.workloadMaxPct} %`}
              </span>
              <span>{e(`Department.${h.department}`)}</span>
              {h.commute.PT != null ? <span>{t('search.commutePt', { minutes: h.commute.PT })}</span> : null}
              {h.commute.CAR != null ? <span>{t('search.commuteCar', { minutes: h.commute.CAR })}</span> : null}
            </p>
            <Roster pattern={h.rosterPattern} workloadPct={workloadPct ?? 100} compact showLegend={false} />
            <ConditionChips results={h.match.results} />
            {h.stale ? (
              <StatusChip tone="warn" icon={<Icon icon={TriangleAlert} size={14} />}>
                {t('states.stale')}
              </StatusChip>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
