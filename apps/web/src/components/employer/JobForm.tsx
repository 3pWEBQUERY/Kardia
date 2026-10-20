'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import {
  OVERRIDABLE_FIELDS,
  SPECIALTY_TITLES,
  TRAINING_CATEGORIES,
  WARD_FIELDS,
  type OverridableField,
} from '@kardia/core';
import { Profession, ShiftType } from '@kardia/db/enums';
import { Button, Callout, Checkbox, Combobox, Input, Select, useToast } from '@kardia/ui';

import { saveJob } from '@/app/actions/employer';
import { useActionMessage } from '@/lib/useActionError';

export interface JobDraft {
  wardId: string;
  title: string;
  profession: string;
  workloadMinPct: number;
  workloadMaxPct: number;
  startDate: string | null;
  allowsPendingRecog: boolean;
  overrides: Partial<Record<OverridableField, unknown>>;
  specialtyTitle: string | null;
  trainingCategory: string | null;
  maxCreditableYears: number | null;
  weeklyHours: number | null;
  structuredTrainingHoursWeek: number | null;
  rotations: string[];
  assistantPositions: number | null;
}

const WORKLOADS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function num(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v.replace(/['’\s]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Stellenformular: Titel, Beruf, Pensum (10er-Schritte), Start, Überschreibungen der
 * Station (leer = von der Station geerbt) und ärztliche Weiterbildung (Modul F).
 */
export function JobForm({
  jobId,
  initial,
  wards,
  wardDefaults,
  submitLabel,
  onCreated,
  extra,
}: {
  jobId?: string;
  initial: JobDraft;
  wards: { id: string; label: string }[];
  /** Stationswerte als Platzhalter für Überschreibungen. */
  wardDefaults: Record<string, Partial<Record<string, string>>>;
  submitLabel: string;
  onCreated?: (id: string) => void;
  extra?: ReactNode;
}) {
  const t = useTranslations('employer.job');
  const tf = useTranslations('fields');
  const te = useTranslations('enums');
  const tr = useTranslations('employer.form');
  const router = useRouter();
  const toast = useToast();
  const message = useActionMessage();
  const [d, setD] = useState<JobDraft>(initial);
  const [rawOverrides, setRawOverrides] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(initial.overrides)
        .filter(([, v]) => typeof v === 'number')
        .map(([k, v]) => [k, String(v)]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof JobDraft>(k: K, v: JobDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const setOverride = (k: OverridableField, v: unknown) =>
    setD((x) => {
      const next = Object.fromEntries(Object.entries(x.overrides).filter(([key]) => key !== k));
      return { ...x, overrides: v == null || v === '' ? next : { ...next, [k]: v } };
    });
  const defaults = wardDefaults[d.wardId] ?? {};
  const physician = d.profession === Profession.PHYSICIAN;

  const submit = async () => {
    setError(null);
    setFieldErrors({});
    if (d.workloadMaxPct < d.workloadMinPct) {
      setFieldErrors({ workloadMaxPct: t('workloadOrder') });
      return;
    }
    setBusy(true);
    const data: Record<string, unknown> = {
      title: d.title,
      profession: d.profession,
      workloadMinPct: d.workloadMinPct,
      workloadMaxPct: d.workloadMaxPct,
      startDate: d.startDate || null,
      allowsPendingRecog: d.allowsPendingRecog,
      overrides: Object.keys(d.overrides).length ? d.overrides : null,
      specialtyTitle: physician ? d.specialtyTitle : null,
      trainingCategory: physician ? d.trainingCategory : null,
      maxCreditableYears: physician ? d.maxCreditableYears : null,
      weeklyHours: physician ? d.weeklyHours : null,
      structuredTrainingHoursWeek: physician ? d.structuredTrainingHoursWeek : null,
      rotations: physician ? d.rotations : [],
      assistantPositions: physician ? d.assistantPositions : null,
      ...(jobId ? {} : { wardId: d.wardId }),
    };
    const r = await saveJob({ ...(jobId ? { id: jobId } : {}), data });
    setBusy(false);
    if (!r.ok) {
      setFieldErrors(r.error.fields ?? {});
      setError(message(r));
      return;
    }
    toast({ tone: 'neutral', message: t('saved') });
    if (onCreated) onCreated(r.data.id);
    else if (!jobId) router.push(`/employer/jobs/${r.data.id}`);
    else router.refresh();
  };

  const overrideInput = (k: OverridableField) => {
    const meta = WARD_FIELDS.find((f) => f.key === k);
    if (!meta) return null;
    if (meta.kind === 'bool') {
      const v = d.overrides[k];
      return (
        <Select
          key={k}
          label={tf(k)}
          value={v === true ? 'yes' : v === false ? 'no' : ''}
          placeholder={t('inherit', { value: defaults[k] ?? '–' })}
          onChange={(e) => setOverride(k, e.target.value === '' ? null : e.target.value === 'yes')}
          options={[
            { value: 'yes', label: t('yes') },
            { value: 'no', label: t('no') },
          ]}
        />
      );
    }
    if (meta.kind === 'enumList') {
      const list = (d.overrides[k] as string[] | undefined) ?? null;
      return (
        <fieldset key={k} className="flex flex-col gap-1 sm:col-span-2">
          <legend className="mb-1 text-caption text-ink-700">
            {tf(k)} · {list ? t('overridden') : t('inherit', { value: defaults[k] ?? '–' })}
          </legend>
          <div className="grid gap-1 sm:grid-cols-3">
            {Object.values(ShiftType).map((s) => (
              <Checkbox
                key={s}
                label={te(`ShiftType.${s}`)}
                checked={list?.includes(s) ?? false}
                onCheckedChange={(on) => {
                  const next = new Set(list ?? []);
                  if (on) next.add(s);
                  else next.delete(s);
                  setOverride(k, next.size ? [...next] : null);
                }}
              />
            ))}
          </div>
        </fieldset>
      );
    }
    const unit = meta.unit && meta.unit !== 'count' ? tf(`units.${meta.unit}`) : undefined;
    return (
      <Input
        key={k}
        label={tf(k)}
        inputMode={meta.kind === 'float' ? 'decimal' : 'numeric'}
        placeholder={t('inherit', { value: defaults[k] ?? '–' })}
        {...(meta.unit === 'chf' ? { prefix: 'CHF' } : unit ? { unit } : {})}
        value={rawOverrides[k] ?? ''}
        onChange={(e) => {
          setRawOverrides((r) => ({ ...r, [k]: e.target.value }));
          setOverride(k, num(e.target.value));
        }}
      />
    );
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <section className="grid gap-4 sm:grid-cols-2">
        {!jobId ? (
          <Select
            label={t('ward')}
            required
            requiredLabel={tr('required')}
            placeholder={tr('choose')}
            value={d.wardId}
            onChange={(e) => set('wardId', e.target.value)}
            options={wards.map((w) => ({ value: w.id, label: w.label }))}
          />
        ) : null}
        <Input
          label={tf('title')}
          required
          requiredLabel={tr('required')}
          value={d.title}
          error={fieldErrors.title}
          onChange={(e) => set('title', e.target.value)}
          maxLength={160}
        />
        <Select
          label={tf('profession')}
          required
          requiredLabel={tr('required')}
          value={d.profession}
          onChange={(e) => set('profession', e.target.value)}
          options={Object.values(Profession).map((p) => ({
            value: p,
            label: te(`Profession.${p}`),
          }))}
        />
        <Input
          label={tf('startDate')}
          type="date"
          value={d.startDate ?? ''}
          onChange={(e) => set('startDate', e.target.value || null)}
        />
        <Select
          label={tf('minWorkloadPct')}
          required
          requiredLabel={tr('required')}
          value={String(d.workloadMinPct)}
          onChange={(e) => set('workloadMinPct', Number(e.target.value))}
          options={WORKLOADS.map((w) => ({ value: String(w), label: `${w} %` }))}
        />
        <Select
          label={tf('maxWorkloadPct')}
          required
          requiredLabel={tr('required')}
          value={String(d.workloadMaxPct)}
          error={fieldErrors.workloadMaxPct}
          onChange={(e) => set('workloadMaxPct', Number(e.target.value))}
          options={WORKLOADS.map((w) => ({ value: String(w), label: `${w} %` }))}
        />
        <div className="sm:col-span-2">
          <Checkbox
            label={tf('allowsPendingRecog')}
            description={t('pendingRecogHint')}
            checked={d.allowsPendingRecog}
            onCheckedChange={(on) => set('allowsPendingRecog', on)}
          />
        </div>
      </section>

      <details className="rounded-card border border-line-300 bg-surface-0 p-4">
        <summary className="cursor-pointer text-body-s font-medium">
          {t('overrides', { count: Object.keys(d.overrides).length })}
        </summary>
        <p className="mt-2 text-micro text-ink-500">{t('overridesHint')}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {OVERRIDABLE_FIELDS.map(overrideInput)}
        </div>
      </details>

      {physician ? (
        <section className="flex flex-col gap-4 rounded-card border border-line-300 bg-surface-0 p-4">
          <h2 className="text-h3">{t('training')}</h2>
          <p className="text-micro text-ink-500">{t('trainingHint')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Combobox
              label={tf('specialtyTitle')}
              value={d.specialtyTitle}
              onChange={(v) => set('specialtyTitle', v)}
              options={SPECIALTY_TITLES.map((s) => ({ value: s.name, label: s.name }))}
              emptyLabel={t('noTitle')}
            />
            <Select
              label={tf('trainingCategory')}
              placeholder={tr('choose')}
              value={d.trainingCategory ?? ''}
              onChange={(e) => set('trainingCategory', e.target.value || null)}
              options={TRAINING_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <Input
              label={tf('maxCreditableYears')}
              inputMode="decimal"
              unit={tf('units.years')}
              value={d.maxCreditableYears?.toString() ?? ''}
              onChange={(e) => set('maxCreditableYears', num(e.target.value))}
            />
            <Input
              label={tf('weeklyHours')}
              inputMode="numeric"
              unit={tf('units.hours')}
              value={d.weeklyHours?.toString() ?? ''}
              onChange={(e) => set('weeklyHours', num(e.target.value))}
            />
            <Input
              label={tf('structuredTrainingHoursWeek')}
              inputMode="numeric"
              unit={tf('units.hours')}
              value={d.structuredTrainingHoursWeek?.toString() ?? ''}
              onChange={(e) => set('structuredTrainingHoursWeek', num(e.target.value))}
            />
            <Input
              label={tf('assistantPositions')}
              inputMode="numeric"
              value={d.assistantPositions?.toString() ?? ''}
              onChange={(e) => set('assistantPositions', num(e.target.value))}
            />
            <Input
              label={tf('rotations')}
              hint={t('rotationsHint')}
              className="sm:col-span-2"
              value={d.rotations.join(', ')}
              onChange={(e) =>
                set(
                  'rotations',
                  e.target.value
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean),
                )
              }
            />
          </div>
          {!d.specialtyTitle || !d.trainingCategory ? (
            <Callout tone="warn">{t('noTraining')}</Callout>
          ) : null}
        </section>
      ) : null}

      {extra}
      {error ? <Callout tone="critical">{error}</Callout> : null}
      <div>
        <Button
          type="submit"
          variant="primary"
          size="l"
          disabled={busy || !d.wardId || d.title.trim().length < 4}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
