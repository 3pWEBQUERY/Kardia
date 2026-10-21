'use client';

import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState, type ReactNode } from 'react';

import {
  ACUTE_OR_LONG_TERM,
  WARD_FIELDS,
  defaultRosterPattern,
  formatNumber,
  missingRequiredFields,
  wardProfileSchema,
  type PartialWardProfile,
  type WardFieldMeta,
  type WardProfileKey,
} from '@kardia/core';
import { ChildcareType, Department, ShiftType } from '@kardia/db/enums';
import {
  Button,
  Callout,
  Checkbox,
  Icon,
  Input,
  Select,
  StatusChip,
  Textarea,
  cx,
} from '@kardia/ui';

import { FIELD_GROUP_ICONS, FormSaveBar, FormSection } from '@/components/app/Form';

import { RosterEditor } from './RosterEditor.tsx';

export interface Evidence {
  evidence: string;
  confidence: number;
}

export interface Refresher {
  provider: string;
  durationDays: number;
  costCoveredChf: number;
}

export type WardDraft = PartialWardProfile;

const GROUPS = [
  'pay',
  'shifts',
  'workload',
  'care',
  'development',
  'family',
  'contract',
  'reentry',
] as const;

const UNIT_PREFIX = new Set(['chf']);
const DEPARTMENT_FIELD = WARD_FIELDS.find((f) => f.key === 'department');

/** Anzeigewert für Text-, Zahl- und Auswahlfelder. */
function asText(v: unknown): string {
  return typeof v === 'string' || typeof v === 'number' ? String(v) : '';
}

/** Formularwert → Profilwert: leere Felder werden null, Zahlen werden Zahlen. */
function toNumber(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v.replace(/['’\s]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Zod-/Regel-Fehler → Meldung mit Ursache und Lösung (errors.fields.*). */
export function useFieldErrorText() {
  const te = useTranslations('errors.fields');
  const tf = useTranslations('employer.form');
  return (code: string | undefined): string | undefined => {
    if (!code) return undefined;
    if (te.has(code)) return te(code);
    if (code.includes('10er')) return te('step10');
    if (code.includes('28')) return te('roster');
    return tf('invalid');
  };
}

export function validateWard(draft: WardDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of missingRequiredFields(draft)) errors[key] = 'required';
  const parsed = wardProfileSchema.safeParse(draft);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = String(issue.path[0] ?? '');
      if (!path || errors[path]) continue;
      const v = (draft as Record<string, unknown>)[path];
      errors[path] = v == null || v === '' ? 'required' : issue.message;
    }
  }
  return errors;
}

export function emptyWard(): WardDraft {
  return {
    name: '',
    shiftTypes: [],
    thirteenthSalary: false,
    childcare: ChildcareType.NONE,
    reentryFriendly: false,
    rosterPattern: defaultRosterPattern(),
    onCallChfDay: null,
    minShiftsPerWeek: null,
    patientsPerNurseDay: null,
    patientsPerNurseNight: null,
    skillMixHfFhPct: null,
    skillMixFagePct: null,
    skillMixAidPct: null,
    educationBudgetChf: null,
    educationDays: null,
    childcareAllowanceChf: null,
    reentryOnboardingWeeks: null,
    reentryAccompaniedShifts: null,
    reentryRefresher: null,
    description: null,
  };
}

/**
 * Stationsprofil-Formular (Modul A). Jede Angabe ist ein strukturiertes Feld mit Einheit;
 * Pflichtfelder sind markiert (AK-A1), Lohnband-Regel AK-A4 wird sofort geprüft.
 * Beim KI-Import zeigt jedes Feld "aus Text übernommen" mit Belegstelle und muss
 * einzeln bestätigt werden (PRD 7.3, 9.1).
 */
export function WardForm({
  initial,
  evidence = {},
  serverErrors = {},
  busy,
  submitLabel,
  onSubmit,
  extra,
}: {
  initial: WardDraft;
  evidence?: Partial<Record<string, Evidence>>;
  serverErrors?: Record<string, string>;
  busy: boolean;
  submitLabel: string;
  onSubmit: (draft: WardDraft) => void;
  extra?: ReactNode;
}) {
  const t = useTranslations('employer');
  const tf = useTranslations('fields');
  const te = useTranslations('enums');
  const errorText = useFieldErrorText();
  const [draft, setDraft] = useState<WardDraft>(initial);
  const [raw, setRaw] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(initial).flatMap(([k, v]) => (typeof v === 'number' ? [[k, String(v)]] : [])),
    ),
  );
  const [confirmed, setConfirmed] = useState<Set<string>>(() => new Set());
  const [touched, setTouched] = useState(false);
  const errors = useMemo(
    () => ({ ...validateWard(draft), ...serverErrors }),
    [draft, serverErrors],
  );
  const unconfirmed = Object.keys(evidence).filter((k) => !confirmed.has(k));

  const set = <K extends WardProfileKey>(key: K, value: WardDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const required = (f: WardFieldMeta) =>
    f.required === true ||
    (f.required === 'acuteOrLongTerm' &&
      draft.department != null &&
      ACUTE_OR_LONG_TERM.includes(draft.department));
  const showError = (key: string) => (touched ? errorText(errors[key]) : undefined);

  const unit = (f: WardFieldMeta) =>
    f.unit && f.unit !== 'count' ? tf(`units.${f.unit}`) : undefined;

  const evidenceNote = (key: string) => {
    const ev = evidence[key];
    if (!ev) return null;
    return (
      <div
        className={cx(
          'mt-1 flex flex-col gap-1 rounded-control border px-3 py-2',
          confirmed.has(key) ? 'border-line-200' : 'border-accent-600 bg-accent-50',
        )}
      >
        <span className="inline-flex items-center gap-1.5 text-micro text-accent-700">
          <Icon icon={FileText} size={14} />
          {t('import.fromText', { confidence: formatNumber(Math.round(ev.confidence * 100)) })}
        </span>
        <q className="text-micro text-ink-700">{ev.evidence}</q>
        <Checkbox
          label={t('import.confirmField')}
          checked={confirmed.has(key)}
          onCheckedChange={(on) =>
            setConfirmed((prev) => {
              const next = new Set(prev);
              if (on) next.add(key);
              else next.delete(key);
              return next;
            })
          }
        />
      </div>
    );
  };

  const numberField = (f: WardFieldMeta) => (
    <div key={f.key}>
      <Input
        type="text"
        inputMode={f.kind === 'float' ? 'decimal' : 'numeric'}
        label={tf(f.key)}
        required={required(f)}
        requiredLabel={t('form.required')}
        {...(f.unit && UNIT_PREFIX.has(f.unit)
          ? { prefix: 'CHF' }
          : unit(f)
            ? { unit: unit(f) ?? '' }
            : {})}
        value={raw[f.key] ?? ''}
        error={showError(f.key)}
        onChange={(e) => {
          setRaw((r) => ({ ...r, [f.key]: e.target.value }));
          set(f.key, toNumber(e.target.value) as never);
        }}
      />
      {evidenceNote(f.key)}
    </div>
  );

  const field = (f: WardFieldMeta) => {
    switch (f.kind) {
      case 'int':
      case 'float':
        return numberField(f);
      case 'bool':
        return (
          <div key={f.key}>
            <Checkbox
              label={tf(f.key)}
              checked={!!draft[f.key]}
              onCheckedChange={(on) => set(f.key, on as never)}
            />
            {evidenceNote(f.key)}
          </div>
        );
      case 'text':
        return (
          <div key={f.key}>
            <Input
              label={tf(f.key)}
              required={required(f)}
              requiredLabel={t('form.required')}
              hint={f.key === 'collectiveAgreement' ? t('ward.gavHint') : undefined}
              value={asText(draft[f.key])}
              error={showError(f.key)}
              onChange={(e) => set(f.key, e.target.value as never)}
            />
            {evidenceNote(f.key)}
          </div>
        );
      case 'enum':
        return (
          <div key={f.key}>
            <Select
              label={tf(f.key)}
              required={required(f)}
              requiredLabel={t('form.required')}
              placeholder={t('form.choose')}
              value={asText(draft[f.key])}
              error={showError(f.key)}
              onChange={(e) => set(f.key, (e.target.value || null) as never)}
              options={(f.key === 'department'
                ? Object.values(Department)
                : Object.values(ChildcareType)
              ).map((v) => ({
                value: v,
                label: te(`${f.key === 'department' ? 'Department' : 'ChildcareType'}.${v}`),
              }))}
            />
            {evidenceNote(f.key)}
          </div>
        );
      case 'enumList':
        return (
          <fieldset key={f.key} className="flex flex-col gap-1 sm:col-span-2">
            <legend className="mb-1 text-caption text-ink-700">
              {tf(f.key)} <span className="text-ink-500">· {t('form.required')}</span>
            </legend>
            <div className="grid gap-1 sm:grid-cols-3">
              {Object.values(ShiftType).map((s) => (
                <Checkbox
                  key={s}
                  label={te(`ShiftType.${s}`)}
                  checked={draft.shiftTypes?.includes(s) ?? false}
                  onCheckedChange={(on) => {
                    const list = new Set(draft.shiftTypes ?? []);
                    if (on) list.add(s);
                    else list.delete(s);
                    set('shiftTypes', [...list]);
                  }}
                />
              ))}
            </div>
            {showError(f.key) ? (
              <p className="text-micro text-critical-600">{showError(f.key)}</p>
            ) : null}
            {evidenceNote(f.key)}
          </fieldset>
        );
      case 'roster':
        return (
          <div key={f.key} className="sm:col-span-2">
            <RosterEditor
              value={draft.rosterPattern ?? []}
              onChange={(next) => set('rosterPattern', next)}
              error={showError('rosterPattern')}
            />
          </div>
        );
    }
  };

  const refreshers = (draft.reentryRefresher ?? []) as Refresher[];
  const setRefreshers = (list: Refresher[]) => set('reentryRefresher', list.length ? list : null);

  const submit = () => {
    setTouched(true);
    if (Object.keys(validateWard(draft)).length || unconfirmed.length) return;
    onSubmit(draft);
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <FormSection title={t('ward.basics')} icon={FIELD_GROUP_ICONS.location}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Input
            label={tf('name')}
            required
            requiredLabel={t('form.required')}
            value={draft.name ?? ''}
            error={showError('name')}
            onChange={(e) => set('name', e.target.value)}
          />
          {evidenceNote('name')}
        </div>
        {DEPARTMENT_FIELD ? field(DEPARTMENT_FIELD) : null}
      </div>
      </FormSection>
      {GROUPS.map((g) => {
        const list = WARD_FIELDS.filter((f) => f.group === g && f.key !== 'department');
        if (g === 'reentry') {
          return (
            <FormSection key={g} title={tf(`groups.${g}`)} icon={FIELD_GROUP_ICONS[g]}>
              <Checkbox
                label={tf('reentryFriendly')}
                description={t('ward.reentryHint')}
                checked={!!draft.reentryFriendly}
                onCheckedChange={(on) => set('reentryFriendly', on)}
              />
              {draft.reentryFriendly ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {list.filter((f) => f.key !== 'reentryFriendly').map((f) => numberField(f))}
                  <fieldset className="flex flex-col gap-2 sm:col-span-2">
                    <legend className="mb-1 text-caption text-ink-700">
                      {tf('reentryRefresher')}
                    </legend>
                    {refreshers.map((r, i) => (
                      <div key={i} className="grid items-end gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                        <Input
                          label={t('ward.refresherProvider')}
                          value={r.provider}
                          onChange={(e) =>
                            setRefreshers(
                              refreshers.map((x, j) =>
                                j === i ? { ...x, provider: e.target.value } : x,
                              ),
                            )
                          }
                        />
                        <Input
                          label={t('ward.refresherDays')}
                          unit={tf('units.days')}
                          inputMode="numeric"
                          value={String(r.durationDays || '')}
                          onChange={(e) =>
                            setRefreshers(
                              refreshers.map((x, j) =>
                                j === i ? { ...x, durationDays: toNumber(e.target.value) ?? 0 } : x,
                              ),
                            )
                          }
                        />
                        <Input
                          label={t('ward.refresherCost')}
                          prefix="CHF"
                          inputMode="numeric"
                          value={String(r.costCoveredChf || '')}
                          onChange={(e) =>
                            setRefreshers(
                              refreshers.map((x, j) =>
                                j === i
                                  ? { ...x, costCoveredChf: toNumber(e.target.value) ?? 0 }
                                  : x,
                              ),
                            )
                          }
                        />
                        <Button
                          variant="ghost"
                          onClick={() => setRefreshers(refreshers.filter((_, j) => j !== i))}
                        >
                          {t('form.remove')}
                        </Button>
                      </div>
                    ))}
                    <div>
                      <Button
                        size="s"
                        onClick={() =>
                          setRefreshers([
                            ...refreshers,
                            { provider: '', durationDays: 0, costCoveredChf: 0 },
                          ])
                        }
                      >
                        {t('ward.addRefresher')}
                      </Button>
                    </div>
                    {showError('reentryRefresher') ? (
                      <p className="text-micro text-critical-600">
                        {showError('reentryRefresher')}
                      </p>
                    ) : null}
                  </fieldset>
                </div>
              ) : null}
            </FormSection>
          );
        }
        return (
          <FormSection key={g} title={tf(`groups.${g}`)} icon={FIELD_GROUP_ICONS[g]}>
            <div className="grid gap-4 sm:grid-cols-2">{list.map(field)}</div>
          </FormSection>
        );
      })}
      <FormSection>
        <Textarea
          label={tf('description')}
          hint={t('ward.descriptionHint')}
          maxLength={4000}
          value={draft.description ?? ''}
          onChange={(e) => set('description', e.target.value || null)}
        />
      </FormSection>
      {extra}
      {touched && (Object.keys(errors).length || unconfirmed.length) ? (
        <Callout tone="critical" title={t('form.fixTitle')}>
          <ul className="list-disc pl-5">
            {Object.keys(errors).map((k) => (
              <li key={k}>
                {k === 'name' ? tf('name') : tf.has(k) ? tf(k) : k}: {errorText(errors[k])}
              </li>
            ))}
            {unconfirmed.length ? (
              <li>{t('import.unconfirmed', { count: unconfirmed.length })}</li>
            ) : null}
          </ul>
        </Callout>
      ) : null}
      <FormSaveBar>
        <Button type="submit" variant="primary" size="l" disabled={busy}>
          {submitLabel}
        </Button>
        {Object.keys(evidence).length ? (
          <StatusChip tone={unconfirmed.length ? 'warn' : 'ok'}>
            {t('import.confirmedCount', {
              done: Object.keys(evidence).length - unconfirmed.length,
              total: Object.keys(evidence).length,
            })}
          </StatusChip>
        ) : null}
      </FormSaveBar>
    </form>
  );
}
