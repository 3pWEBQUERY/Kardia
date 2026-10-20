'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Profession } from '@kardia/db/enums';
import { Button, Callout, Card, CardBody, CardHeader, Input, Select, Textarea, useToast } from '@kardia/ui';

import { saveRecognitionGuide } from '@/app/actions/admin';
import { useActionMessage } from '@/lib/useActionError';

import type { RecognitionStep } from '@kardia/core';

export interface GuideDraft {
  id: string;
  originCountry: string;
  targetProfession: string;
  authority: string;
  reviewedAt: string;
  steps: RecognitionStep[];
}

interface StepForm {
  id: string;
  title: string;
  description: string;
  documents: string;
  links: string;
  durationWeeks: string;
}

const toForm = (s: RecognitionStep): StepForm => ({
  id: s.id,
  title: s.title,
  description: s.description,
  documents: s.documents.join('\n'),
  links: s.links.map((l) => `${l.label} | ${l.url}`).join('\n'),
  durationWeeks: s.durationWeeks == null ? '' : String(s.durationWeeks),
});

const emptyStep = (): StepForm => ({ id: '', title: '', description: '', documents: '', links: '', durationWeeks: '' });

/** Strukturiertes Formular für eine Anleitung; Validierung serverseitig mit recognitionGuideSchema. */
export function GuideEditor({ initial }: { initial: GuideDraft | null }) {
  const t = useTranslations('admin.editorial');
  const c = useTranslations('common');
  const e = useTranslations('enums');
  const router = useRouter();
  const toast = useToast();
  const message = useActionMessage();
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState(initial?.originCountry ?? '');
  const [profession, setProfession] = useState(initial?.targetProfession ?? 'NURSE_HF_FH');
  const [authority, setAuthority] = useState(initial?.authority ?? '');
  const [reviewedAt, setReviewedAt] = useState(initial?.reviewedAt ?? new Date().toISOString().slice(0, 10));
  const [steps, setSteps] = useState<StepForm[]>(initial?.steps.map(toForm) ?? [emptyStep()]);
  const [error, setError] = useState<string | null>(null);

  const update = (i: number, patch: Partial<StepForm>) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const save = async () => {
    setError(null);
    const payload = {
      originCountry: origin.trim(),
      targetProfession: profession,
      authority: authority.trim(),
      reviewedAt,
      steps: steps.map((s) => ({
        id: s.id.trim(),
        title: s.title.trim(),
        description: s.description.trim(),
        documents: s.documents.split('\n').map((d) => d.trim()).filter(Boolean),
        links: s.links
          .split('\n')
          .map((l) => l.split('|').map((p) => p.trim()))
          .filter((p) => p.length === 2 && p[0] && p[1])
          .map(([label, url]) => ({ label, url })),
        durationWeeks: s.durationWeeks ? Number(s.durationWeeks) : null,
      })),
    };
    const r = await saveRecognitionGuide(payload, initial?.id);
    if (!r.ok) {
      setError(message(r));
      return;
    }
    toast({ tone: 'neutral', message: t('saved') });
    if (!initial) setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-card border border-line-300 bg-surface-0 px-4 py-3">
        <span className="text-body-s">
          {initial ? `${initial.originCountry} → ${e(`Profession.${initial.targetProfession}`)} · ${initial.authority}` : t('newGuide')}
        </span>
        <Button size="s" onClick={() => setOpen(true)}>{initial ? t('edit') : t('newGuide')}</Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader title={initial ? `${initial.originCountry} → ${e(`Profession.${initial.targetProfession}`)}` : t('newGuide')} />
      <CardBody className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Input label={t('originCountry')} value={origin} maxLength={2} onChange={(ev) => setOrigin(ev.target.value.toUpperCase())} required />
          <Select label={t('targetProfession')} value={profession} onChange={(ev) => setProfession(ev.target.value)} options={Object.values(Profession).map((p) => ({ value: p, label: e(`Profession.${p}`) }))} />
          <Input label={t('authority')} value={authority} onChange={(ev) => setAuthority(ev.target.value)} required />
          <Input label={t('reviewedAt')} type="date" value={reviewedAt} onChange={(ev) => setReviewedAt(ev.target.value)} required />
        </div>
        <h3 className="text-h3">{t('steps')}</h3>
        <ol className="flex flex-col gap-4">
          {steps.map((s, i) => (
            <li key={i} className="flex flex-col gap-3 border-t border-line-200 pt-3">
              <div className="grid gap-3 md:grid-cols-3">
                <Input label={t('stepId')} value={s.id} onChange={(ev) => update(i, { id: ev.target.value })} />
                <Input label={t('stepTitle')} value={s.title} onChange={(ev) => update(i, { title: ev.target.value })} />
                <Input label={t('stepDuration')} unit="Wo" type="number" min={0} value={s.durationWeeks} onChange={(ev) => update(i, { durationWeeks: ev.target.value })} />
              </div>
              <Textarea label={t('stepDescription')} value={s.description} maxLength={1200} onChange={(ev) => update(i, { description: ev.target.value })} />
              <div className="grid gap-3 md:grid-cols-2">
                <Textarea label={t('stepDocuments')} value={s.documents} onChange={(ev) => update(i, { documents: ev.target.value })} />
                <Textarea label={t('stepLinks')} value={s.links} onChange={(ev) => update(i, { links: ev.target.value })} />
              </div>
              <div>
                <Button size="s" variant="ghost" onClick={() => setSteps((x) => x.filter((_, j) => j !== i))}>{t('removeStep')}</Button>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setSteps((x) => [...x, emptyStep()])}>{t('addStep')}</Button>
          <Button variant="primary" onClick={() => void save()}>{c('actions.save')}</Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>{c('actions.cancel')}</Button>
        </div>
        {error ? <Callout tone="critical">{error}</Callout> : null}
      </CardBody>
    </Card>
  );
}
