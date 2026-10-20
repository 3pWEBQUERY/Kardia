'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';

import {
  encodeFilter,
  formatChfShort,
  encodeGeohash,
  withCondition,
  withoutCondition,
  type Condition,
  type ConditionKey,
  type ConditionMode,
  type SearchFilter,
} from '@kardia/core';
import { Department, Profession } from '@kardia/db/enums';
import { Button, Icon, Select, Sheet } from '@kardia/ui';

/** Bedingungen, die der Filter anbietet, mit Standardwert (Zahl) oder ohne. */
const OFFERED: { key: ConditionKey; value?: number; step?: number; unit?: string }[] = [
  { key: 'noNights' },
  { key: 'maxWeekendsPerMonth', value: 1, step: 1 },
  { key: 'noSplitShifts' },
  { key: 'weekdaysOnly' },
  { key: 'minRosterLeadWeeks', value: 6, step: 1 },
  { key: 'minWishDays', value: 3, step: 1 },
  { key: 'minSalary', value: 90_000, step: 1000 },
  { key: 'thirteenthSalary' },
  { key: 'maxPatientsDay', value: 6, step: 1 },
  { key: 'minOnboardingWeeks', value: 4, step: 1 },
  { key: 'minVacationWeeks', value: 5, step: 1 },
  { key: 'childcare' },
  { key: 'collectiveAgreement' },
  { key: 'parking' },
  { key: 'reentryFriendly' },
  { key: 'pendingRecognition' },
  { key: 'recognizedTraining' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2 border-t border-line-200 pt-4">
      <legend className="text-caption text-ink-700">{title}</legend>
      {children}
    </fieldset>
  );
}

/**
 * Filter der Lebensmodell-Suche. Jede Änderung schreibt den vollständigen Zustand in
 * die URL (AK-B2); Liste und Karte teilen ihn.
 */
export function SearchFilters({ filter, total }: { filter: SearchFilter; total: number }) {
  const t = useTranslations('common');
  const e = useTranslations('enums');
  const router = useRouter();
  const [pending, start] = useTransition();
  const [place, setPlace] = useState('');
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const go = (next: SearchFilter) => start(() => router.push(`/search?f=${encodeFilter(next)}`, { scroll: false }));
  const current = (key: ConditionKey) => filter.conditions.find((c) => c.key === key);

  const setCondition = (key: ConditionKey, mode: ConditionMode | null, value?: number) => {
    if (!mode) return go(withoutCondition(filter, key));
    const offered = OFFERED.find((o) => o.key === key);
    const existing = current(key);
    const v = value ?? (existing && 'value' in existing ? existing.value : offered?.value);
    const c = (v !== undefined ? { key, mode, value: v } : { key, mode }) as Condition;
    go(withCondition(filter, c));
  };

  const locate = async () => {
    setPlaceError(null);
    const q = place.trim();
    if (!q) return;
    try {
      const res = await fetch(
        `https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(q)}&type=locations&origins=zipcode,gg25&sr=4326&limit=1`,
      );
      const json = (await res.json()) as { results?: { attrs: { lat: number; lon: number } }[] };
      const hit = json.results?.[0]?.attrs;
      if (!hit) throw new Error('none');
      // Nur auf ~150 m genau in die URL (Datenminimierung, PRD 14.1).
      go({ ...filter, origin: encodeGeohash(hit.lat, hit.lon) });
    } catch {
      setPlaceError(t('search.placeNotFound'));
    }
  };

  const commute = current('maxCommute') as Extract<Condition, { key: 'maxCommute' }> | undefined;

  const body = (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      <Select
        label={t('search.profession')}
        placeholder={t('search.any')}
        value={filter.profession ?? ''}
        onChange={(ev) => go({ ...filter, ...(ev.target.value ? { profession: ev.target.value as Profession } : { profession: undefined }) } as SearchFilter)}
        options={Object.values(Profession).map((p) => ({ value: p, label: e(`Profession.${p}`) }))}
      />
      <Select
        label={t('search.workload')}
        placeholder={t('search.any')}
        value={filter.workloadPct ? String(filter.workloadPct) : ''}
        onChange={(ev) => go({ ...filter, workloadPct: ev.target.value ? Number(ev.target.value) : undefined } as SearchFilter)}
        options={[100, 90, 80, 70, 60, 50, 40, 30, 20, 10].map((v) => ({ value: String(v), label: `${v} %` }))}
      />
      <Section title={t('search.departments')}>
        <div className="flex flex-wrap gap-1.5">
          {Object.values(Department).map((d) => {
            const on = filter.departments?.includes(d) ?? false;
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const list = new Set(filter.departments ?? []);
                  if (on) list.delete(d);
                  else list.add(d);
                  go({ ...filter, departments: [...list] });
                }}
                className="h-8 rounded-chip border border-line-300 px-3 text-caption text-ink-700 aria-pressed:border-accent-600 aria-pressed:bg-accent-50 aria-pressed:text-accent-700 pointer-coarse:h-touch"
              >
                {e(`Department.${d}`)}
              </button>
            );
          })}
        </div>
      </Section>
      <Section title={t('search.conditions')}>
        <p className="text-micro text-ink-500">{t('search.conditionsHint')}</p>
        <ul className="flex flex-col divide-y divide-line-200">
          {OFFERED.filter((o, i) => i < 7 || showAll || current(o.key)).map((o) => {
            const c = current(o.key);
            const value = c && 'value' in c ? c.value : o.value;
            return (
              <li key={o.key} className="flex flex-wrap items-center gap-2 py-2">
                <span className="min-w-40 flex-1 text-body-s">
                  {t(`conditions.${o.key}.wanted`, { value: o.key === 'minSalary' && value ? formatChfShort(value) : (value ?? ''), transport: '' })}
                </span>
                {o.value !== undefined ? (
                  <input
                    type="number"
                    aria-label={t(`conditions.${o.key}.wanted`, { value: '', transport: '' })}
                    className="h-8 w-24 rounded-control border border-line-300 bg-surface-0 px-2 text-body-s tabular"
                    defaultValue={value}
                    step={o.step}
                    onBlur={(ev) => c && setCondition(o.key, c.mode, Number(ev.target.value))}
                  />
                ) : null}
                <div role="radiogroup" aria-label={t(`conditions.${o.key}.wanted`, { value: value ?? '', transport: '' })} className="inline-flex overflow-hidden rounded-control border border-line-300">
                  {(['off', 'wish', 'must'] as const).map((m) => {
                    const active = (c?.mode ?? 'off') === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setCondition(o.key, m === 'off' ? null : m)}
                        className="h-8 border-l border-line-300 px-2.5 text-micro first:border-l-0 aria-checked:bg-accent-50 aria-checked:text-accent-700 pointer-coarse:h-touch"
                      >
                        {m === 'off' ? t('search.off') : t(`states.${m}`)}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
        {!showAll ? (
          <button type="button" onClick={() => setShowAll(true)} className="self-start text-body-s text-accent-600 hover:text-accent-700">
            {t('actions.showMore')}
          </button>
        ) : null}
      </Section>
      <Section title={t('search.commute')}>
        <div className="flex gap-2">
          <input
            value={place}
            onChange={(ev) => setPlace(ev.target.value)}
            placeholder={filter.origin ? t('search.originSet') : t('search.placePlaceholder')}
            aria-label={t('search.place')}
            className="h-control-m flex-1 rounded-control border border-line-300 bg-surface-0 px-3 text-body-s"
          />
          <Button onClick={() => void locate()}>{t('search.setPlace')}</Button>
        </div>
        {placeError ? <p className="text-micro text-critical-600">{placeError}</p> : null}
        {filter.origin ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={5}
              max={180}
              step={5}
              defaultValue={commute?.value ?? 30}
              aria-label={t('search.minutes')}
              className="h-8 w-20 rounded-control border border-line-300 bg-surface-0 px-2 text-body-s tabular"
              onBlur={(ev) => go(withCondition(filter, { key: 'maxCommute', mode: commute?.mode ?? 'wish', value: Number(ev.target.value), transport: commute?.transport ?? 'PT' }))}
            />
            <span className="text-body-s">min</span>
            <select
              aria-label={t('search.transport')}
              value={commute?.transport ?? 'PT'}
              onChange={(ev) => go(withCondition(filter, { key: 'maxCommute', mode: commute?.mode ?? 'wish', value: commute?.value ?? 30, transport: ev.target.value as 'PT' | 'CAR' }))}
              className="h-8 rounded-control border border-line-300 bg-surface-0 px-2 text-body-s"
            >
              <option value="PT">{t('conditions.transport.PT')}</option>
              <option value="CAR">{t('conditions.transport.CAR')}</option>
            </select>
            <select
              aria-label={t('search.mode')}
              value={commute?.mode ?? 'off'}
              onChange={(ev) =>
                ev.target.value === 'off'
                  ? go(withoutCondition(filter, 'maxCommute'))
                  : go(withCondition(filter, { key: 'maxCommute', mode: ev.target.value as ConditionMode, value: commute?.value ?? 30, transport: commute?.transport ?? 'PT' }))
              }
              className="h-8 rounded-control border border-line-300 bg-surface-0 px-2 text-body-s"
            >
              <option value="off">{t('search.off')}</option>
              <option value="wish">{t('states.wish')}</option>
              <option value="must">{t('states.must')}</option>
            </select>
          </div>
        ) : null}
      </Section>
    </div>
  );

  return (
    <>
      <div className="lg:hidden">
        <Sheet
          open={open}
          onOpenChange={setOpen}
          title={t('search.filters')}
          trigger={
            <Button>
              <Icon icon={SlidersHorizontal} size={16} />
              {t('search.filters')} · {t('pagination.results', { count: total })}
            </Button>
          }
        >
          {body}
        </Sheet>
      </div>
      <aside aria-label={t('search.filters')} className="hidden w-80 shrink-0 lg:block">
        {body}
      </aside>
    </>
  );
}
