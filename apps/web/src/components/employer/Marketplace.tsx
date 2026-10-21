'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  OFFER_NOTE_MAX,
  OFFER_VALIDITY_DAYS,
  formatChf,
  formatNumber,
  formatPlainDate,
  offerRuleIssues,
  type AnonymousProfile,
} from '@kardia/core';
import { Department, Profession } from '@kardia/db/enums';
import {
  Button,
  Callout,
  Card,
  CardBody,
  Dialog,
  EmptyState,
  Input,
  Select,
  SkeletonText,
  StatusChip,
  Textarea,
  useToast,
} from '@kardia/ui';

import { makeOffer, marketplaceSearch, retractOffer } from '@/app/actions/employer';
import { useActionMessage } from '@/lib/useActionError';

export interface OfferJob {
  id: string;
  title: string;
  salaryMinChf: number;
  workloadMinPct: number;
  workloadMaxPct: number;
}

/**
 * Marktplatz-Suche (Modul E): nur anonyme Profile – kein Name, kein Foto, kein
 * Geburtsjahr, keine Arbeitgeber (AK-E1). Angebote referenzieren eine konkrete Stelle
 * mit Jahreslohn ≥ Minimum des Lohnbands (AK-E2).
 */
export function MarketplaceSearch({ jobs, quotaLeft }: { jobs: OfferJob[]; quotaLeft: number }) {
  const t = useTranslations('employer.marketplace');
  const te = useTranslations('enums');
  const tc = useTranslations('common');
  const message = useActionMessage();
  const [filter, setFilter] = useState({
    profession: '',
    department: '',
    minYears: '',
    district: '',
  });
  const [profiles, setProfiles] = useState<AnonymousProfile[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerFor, setOfferFor] = useState<AnonymousProfile | null>(null);

  const search = async () => {
    setBusy(true);
    setError(null);
    const r = await marketplaceSearch({
      ...(filter.profession ? { profession: filter.profession as Profession } : {}),
      ...(filter.department ? { department: filter.department as Department } : {}),
      ...(filter.minYears ? { minYears: Number(filter.minYears) } : {}),
      ...(filter.district ? { district: filter.district } : {}),
    });
    setBusy(false);
    if (!r.ok) setError(message(r));
    else setProfiles(r.data);
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
        className="grid gap-3 rounded-card border border-line-300 bg-surface-0 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
      >
        <Select
          label={t('profession')}
          placeholder={t('any')}
          value={filter.profession}
          onChange={(e) => setFilter({ ...filter, profession: e.target.value })}
          options={Object.values(Profession).map((p) => ({
            value: p,
            label: te(`Profession.${p}`),
          }))}
        />
        <Select
          label={t('department')}
          placeholder={t('any')}
          value={filter.department}
          onChange={(e) => setFilter({ ...filter, department: e.target.value })}
          options={Object.values(Department).map((d) => ({
            value: d,
            label: te(`Department.${d}`),
          }))}
        />
        <Input
          label={t('minYears')}
          inputMode="numeric"
          value={filter.minYears}
          onChange={(e) => setFilter({ ...filter, minYears: e.target.value })}
        />
        <Input
          label={t('district')}
          placeholder={t('districtPlaceholder')}
          value={filter.district}
          onChange={(e) => setFilter({ ...filter, district: e.target.value })}
        />
        <Button type="submit" variant="primary" disabled={busy}>
          {t('search')}
        </Button>
      </form>
      {error ? <Callout tone="critical">{error}</Callout> : null}
      {busy ? <SkeletonText lines={4} /> : null}
      {profiles?.length === 0 ? (
        <EmptyState
          action={
            <Button
              onClick={() => {
                setFilter({ profession: '', department: '', minYears: '', district: '' });
                void search();
              }}
            >
              {t('reset')}
            </Button>
          }
        >
          {t('empty')}
        </EmptyState>
      ) : null}
      {profiles?.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {profiles.map((p) => (
            <li key={p.ref}>
              <Card>
                <CardBody className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-body-s font-medium">
                      {te(`Profession.${p.profession}`)}
                    </span>
                    {p.passVerified ? (
                      <StatusChip tone="ok">
                        {t('passVerified', { count: p.verifiedCredentialCount })}
                      </StatusChip>
                    ) : (
                      <StatusChip>{t('passOpen')}</StatusChip>
                    )}
                  </div>
                  <p className="text-body-s text-ink-700">
                    {t('experience', { years: p.yearsExperience })}
                    {p.departments.length
                      ? ` · ${p.departments.map((d) => `${te(`Department.${d.department}`)} ${d.years} J.`).join(', ')}`
                      : ''}
                  </p>
                  <p className="text-micro text-ink-500">
                    {[
                      p.district,
                      p.desiredWorkloadPct ? `${p.desiredWorkloadPct} %` : null,
                      p.earliestStart
                        ? t('from', { date: formatPlainDate(p.earliestStart) })
                        : null,
                      p.languages.map((l) => `${l.language.toUpperCase()} ${l.level}`).join(' '),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {p.mustConditions.length ? (
                    <div className="flex flex-wrap gap-1">
                      {p.mustConditions.map((c) => (
                        <StatusChip key={c.key}>
                          {tc(`conditions.${c.key}.wanted`, {
                            value: 'value' in c ? c.value : '',
                            transport:
                              c.key === 'maxCommute'
                                ? tc(`conditions.transport.${c.transport}`)
                                : '',
                          })}
                        </StatusChip>
                      ))}
                    </div>
                  ) : null}
                  <div>
                    <Button
                      size="s"
                      variant="primary"
                      disabled={quotaLeft <= 0 || jobs.length === 0}
                      onClick={() => setOfferFor(p)}
                    >
                      {t('offer')}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
      {offerFor ? (
        <OfferDialog profile={offerFor} jobs={jobs} onClose={() => setOfferFor(null)} />
      ) : null}
    </div>
  );
}

function OfferDialog({
  profile,
  jobs,
  onClose,
}: {
  profile: AnonymousProfile;
  jobs: OfferJob[];
  onClose: () => void;
}) {
  const t = useTranslations('employer.marketplace');
  const tf = useTranslations('errors.fields');
  const router = useRouter();
  const message = useActionMessage();
  const [jobId, setJobId] = useState(jobs[0]?.id ?? '');
  const job = jobs.find((j) => j.id === jobId);
  const [salary, setSalary] = useState(job ? String(job.salaryMinChf) : '');
  const [workload, setWorkload] = useState(
    String(profile.desiredWorkloadPct ?? job?.workloadMaxPct ?? 100),
  );
  const [start, setStart] = useState(
    () => profile.earliestStart ?? new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
  );
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const salaryNum = Number(salary.replace(/['’\s]/g, ''));
  const issues = job
    ? offerRuleIssues(
        { salaryChf: salaryNum, workloadPct: Number(workload), startDate: start },
        job,
      )
    : [];

  const submit = async () => {
    setBusy(true);
    setError(null);
    const r = await makeOffer({
      candidateRef: profile.ref,
      jobId,
      salaryChf: salaryNum,
      workloadPct: Number(workload),
      startDate: start,
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setBusy(false);
    if (!r.ok) {
      setError(message(r));
      return;
    }
    onClose();
    router.refresh();
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('offerTitle')}
      description={t('offerHint', { days: OFFER_VALIDITY_DAYS })}
      footer={
        <>
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button
            variant="primary"
            disabled={busy || issues.length > 0 || !jobId}
            onClick={() => void submit()}
          >
            {t('send')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          label={t('job')}
          value={jobId}
          onChange={(e) => {
            setJobId(e.target.value);
            const j = jobs.find((x) => x.id === e.target.value);
            if (j) setSalary(String(j.salaryMinChf));
          }}
          options={jobs.map((j) => ({ value: j.id, label: j.title }))}
        />
        <Input
          label={t('salary')}
          prefix="CHF"
          inputMode="numeric"
          hint={job ? t('salaryHint', { min: formatChf(job.salaryMinChf) }) : undefined}
          error={issues.includes('belowSalaryBand') ? tf('belowSalaryBand') : undefined}
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
        />
        <Select
          label={t('workload')}
          value={workload}
          error={issues.includes('workloadOutsideJob') ? tf('workloadOutsideJob') : undefined}
          onChange={(e) => setWorkload(e.target.value)}
          options={[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((w) => ({
            value: String(w),
            label: `${w} %`,
          }))}
        />
        <Input
          label={t('start')}
          type="date"
          value={start}
          error={issues.includes('startInPast') ? tf('startInPast') : undefined}
          onChange={(e) => setStart(e.target.value)}
        />
        <Textarea
          label={t('note')}
          hint={t('noteHint', {
            max: formatNumber(OFFER_NOTE_MAX),
            left: OFFER_NOTE_MAX - note.length,
          })}
          maxLength={OFFER_NOTE_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error ? <Callout tone="critical">{error}</Callout> : null}
      </div>
    </Dialog>
  );
}

/** Offenes Angebot zurückziehen (mit Bestätigung); die Fachperson wird benachrichtigt. */
export function WithdrawOfferButton({ offerId }: { offerId: string }) {
  const t = useTranslations('employer.marketplace');
  const router = useRouter();
  const toast = useToast();
  const message = useActionMessage();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!confirming) {
    return (
      <Button size="s" variant="ghost" onClick={() => setConfirming(true)}>
        {t('withdraw')}
      </Button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        size="s"
        variant="danger"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void retractOffer(offerId).then((r) => {
            setBusy(false);
            setConfirming(false);
            if (!r.ok) return toast({ tone: 'critical', message: message(r) ?? '' });
            toast({ tone: 'neutral', message: t('withdrawn') });
            router.refresh();
          });
        }}
      >
        {t('withdrawConfirm')}
      </Button>
      <Button size="s" variant="ghost" onClick={() => setConfirming(false)}>
        {t('withdrawCancel')}
      </Button>
    </span>
  );
}
