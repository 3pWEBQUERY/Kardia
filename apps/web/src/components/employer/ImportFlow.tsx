'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { missingRequiredFields } from '@kardia/core';
import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Input,
  RadioGroup,
  Select,
  SkeletonText,
  Tabs,
  Textarea,
} from '@kardia/ui';

import { beginImport, pollImport } from '@/app/actions/employer';
import { UploadFailure, uploadFile } from '@/lib/upload';
import { useActionMessage } from '@/lib/useActionError';

import { JobForm, type JobDraft } from './JobForm.tsx';
import { emptyWardServer } from './wardDefaults.ts';
import { WardEditor } from './WardEditor.tsx';

import type { Evidence, WardDraft } from './WardForm.tsx';

interface ImportedField {
  value: unknown;
  evidence: string;
  confidence: number;
}

interface ImportOutput {
  orgId: string;
  result: { fields: Record<string, ImportedField>; dropped: { field: string; reason: string }[] };
}

const POLL_MS = 1500;
const GIVE_UP_MS = 90_000;
const JOB_KEYS = new Set([
  'title',
  'profession',
  'hasParking',
  'street',
  'postalCode',
  'city',
  'wardName',
]);

type Step = 'input' | 'waiting' | 'ward' | 'job';

/**
 * Inserat in 10 Minuten (PRD 7.3): Text, URL oder PDF einfügen → KI füllt das
 * Stationsprofil vor (im Worker, nie im Browser) → jedes übernommene Feld mit
 * Belegstelle prüfen → fehlende Pflichtfelder ergänzen → Stelle anlegen → Vorschau.
 */
export function ImportFlow({
  wards,
  locations,
  wardDefaults,
  presetWardId,
}: {
  wards: { id: string; label: string }[];
  locations: { id: string; name: string; city: string }[];
  wardDefaults: Record<string, Partial<Record<string, string>>>;
  presetWardId?: string;
}) {
  const t = useTranslations('employer.import');
  const tu = useTranslations('errors.upload');
  const router = useRouter();
  const message = useActionMessage();
  const [step, setStep] = useState<Step>(presetWardId ? 'job' : 'input');
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, ImportedField>>({});
  const [wardChoice, setWardChoice] = useState<'new' | 'existing'>(
    wards.length ? 'existing' : 'new',
  );
  const [wardId, setWardId] = useState(presetWardId ?? wards[0]?.id ?? '');

  const start = async () => {
    setError(null);
    let fileId: string | undefined;
    if (mode === 'pdf') {
      if (!file) return setError(t('needFile'));
      try {
        fileId = (await uploadFile(file, 'import')).fileId;
      } catch (e) {
        return setError(
          e instanceof UploadFailure && e.reason !== 'rejected'
            ? tu(e.reason === 'tooLarge' ? 'tooLarge' : e.reason === 'type' ? 'type' : 'failed')
            : e instanceof Error
              ? e.message
              : tu('failed'),
        );
      }
    }
    const r = await beginImport(
      mode === 'text' ? { text } : mode === 'url' ? { url } : { fileId: fileId ?? '' },
    );
    if (!r.ok) return setError(message(r));
    setStep('waiting');
    poll(r.data.id);
  };

  const poll = (id: string) => {
    let tries = 0;
    const tick = async () => {
      tries += 1;
      const r = await pollImport(id);
      if (!r.ok) {
        setError(message(r));
        setStep('input');
        return;
      }
      const { state, output } = r.data;
      if (state === 'completed' && output) {
        const out = output as ImportOutput;
        setFields(out.result.fields);
        setWardChoice('new');
        setStep('ward');
        return;
      }
      if (state === 'failed' || state === 'cancelled' || tries * POLL_MS > GIVE_UP_MS) {
        setError(t('failed'));
        setStep('input');
        return;
      }
      setTimeout(() => void tick(), POLL_MS);
    };
    void tick();
  };

  // Felder aufteilen: Stationsprofil vs. Stelle/Standort.
  const wardInitial: WardDraft = { ...emptyWardServer() };
  const evidence: Partial<Record<string, Evidence>> = {};
  for (const [k, f] of Object.entries(fields)) {
    if (JOB_KEYS.has(k)) continue;
    (wardInitial as Record<string, unknown>)[k] = f.value;
    evidence[k] = { evidence: f.evidence, confidence: f.confidence };
  }
  if (fields.wardName) {
    wardInitial.name = String(fields.wardName.value);
    evidence.name = { evidence: fields.wardName.evidence, confidence: fields.wardName.confidence };
  }
  const missing = missingRequiredFields(wardInitial);

  const jobInitial: JobDraft = {
    wardId,
    title: typeof fields.title?.value === 'string' ? fields.title.value : '',
    profession:
      typeof fields.profession?.value === 'string' ? fields.profession.value : 'NURSE_HF_FH',
    workloadMinPct:
      typeof fields.minWorkloadPct?.value === 'number' ? fields.minWorkloadPct.value : 80,
    workloadMaxPct:
      typeof fields.maxWorkloadPct?.value === 'number' ? fields.maxWorkloadPct.value : 100,
    startDate: null,
    allowsPendingRecog: false,
    overrides: {},
    specialtyTitle: null,
    trainingCategory: null,
    maxCreditableYears: null,
    weeklyHours: null,
    structuredTrainingHoursWeek: null,
    rotations: [],
    assistantPositions: null,
  };

  useEffect(() => {
    if (step === 'job') window.scrollTo({ top: 0 });
  }, [step]);

  if (step === 'input') {
    return (
      <div className="flex flex-col gap-4">
        <Tabs
          label={t('source')}
          value={mode}
          onValueChange={setMode}
          tabs={[
            {
              value: 'text',
              label: t('text'),
              content: (
                <Textarea
                  label={t('textLabel')}
                  hint={t('textHint')}
                  maxLength={20000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="[&_textarea]:min-h-64"
                />
              ),
            },
            {
              value: 'url',
              label: t('url'),
              content: (
                <Input
                  label={t('urlLabel')}
                  hint={t('urlHint')}
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              ),
            },
            {
              value: 'pdf',
              label: t('pdf'),
              content: (
                <label className="flex flex-col gap-1.5 text-caption text-ink-700">
                  {t('pdfLabel')}
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="text-body-s"
                  />
                  <span className="text-micro text-ink-500">{t('pdfHint')}</span>
                </label>
              ),
            },
          ]}
        />
        {error ? <Callout tone="critical">{error}</Callout> : null}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="l"
            onClick={() => void start()}
            disabled={(mode === 'text' && text.trim().length < 50) || (mode === 'url' && !url)}
          >
            {t('start')}
          </Button>
          <Button size="l" onClick={() => setStep('ward')}>
            {t('manual')}
          </Button>
        </div>
        <p className="text-micro text-ink-500">{t('aiNote')}</p>
      </div>
    );
  }

  if (step === 'waiting') {
    return (
      <Card>
        <CardHeader title={t('waiting')} meta={t('waitingHint')} />
        <CardBody>
          <SkeletonText lines={6} />
        </CardBody>
      </Card>
    );
  }

  if (step === 'ward') {
    return (
      <div className="flex flex-col gap-6">
        {Object.keys(fields).length ? (
          <Callout title={t('reviewTitle', { count: Object.keys(fields).length })}>
            {t('reviewHint')}
          </Callout>
        ) : null}
        {missing.length && Object.keys(fields).length ? (
          <Callout tone="warn">{t('missing', { count: missing.length })}</Callout>
        ) : null}
        {wards.length ? (
          <RadioGroup
            label={t('wardChoice')}
            value={wardChoice}
            onValueChange={(v) => setWardChoice(v as 'new' | 'existing')}
            orientation="horizontal"
            options={[
              { value: 'new', label: t('newWard') },
              { value: 'existing', label: t('existingWard') },
            ]}
          />
        ) : null}
        {wardChoice === 'existing' ? (
          <div className="flex flex-col gap-3">
            <Select
              label={t('ward')}
              value={wardId}
              onChange={(e) => setWardId(e.target.value)}
              options={wards.map((w) => ({ value: w.id, label: w.label }))}
            />
            <div>
              <Button variant="primary" onClick={() => setStep('job')} disabled={!wardId}>
                {t('continue')}
              </Button>
            </div>
          </div>
        ) : (
          <WardEditor
            locations={locations}
            initial={wardInitial}
            evidence={evidence}
            submitLabel={t('saveWard')}
            onSaved={(id) => {
              setWardId(id);
              setStep('job');
              router.refresh();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-h2">{t('jobStep')}</h2>
      <JobForm
        key={wardId}
        initial={{ ...jobInitial, wardId }}
        wards={
          wards.some((w) => w.id === wardId)
            ? wards
            : [...wards, { id: wardId, label: t('newWardLabel') }]
        }
        wardDefaults={wardDefaults}
        submitLabel={t('createJob')}
        onCreated={(id) => router.push(`/employer/jobs/${id}?created=1`)}
      />
    </div>
  );
}
