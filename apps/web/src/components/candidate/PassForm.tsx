'use client';

import { Languages, MapPin, Plus, Stethoscope, Trash2, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { LANGUAGE_LEVELS, type PassInput } from '@kardia/core';
import { Department, Profession } from '@kardia/db/enums';
import { Button, Callout, Checkbox, Icon, Input, RadioGroup, Select, useToast } from '@kardia/ui';

import { savePass } from '@/app/actions/candidate';
import { FormSaveBar, FormSection } from '@/components/app/Form';
import { useActionMessage } from '@/lib/useActionError';

import { HomeLocationField } from './HomeLocationField.tsx';

const LANGS = ['de', 'fr', 'it', 'en', 'rm', 'es', 'pt', 'sq', 'sr', 'hr', 'tr', 'pl'];

export function PassForm({ initial, defaultName, next, needsTerms }: { initial: PassInput | null; defaultName: string; next: string | null; needsTerms: boolean }) {
  const t = useTranslations('candidate.pass');
  const c = useTranslations('common');
  const e = useTranslations('enums');
  const router = useRouter();
  const toast = useToast();
  const message = useActionMessage();
  const [first, ...rest] = defaultName.split(' ');
  const [v, setV] = useState<PassInput>(
    initial ?? { firstName: first ?? '', lastName: rest.join(' '), phone: null, profession: 'NURSE_HF_FH', yearsExperience: 0, workAuthorizedCh: null, experiences: [], languages: [{ language: 'de', level: 'C1' }] },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terms, setTerms] = useState(false);
  const set = <K extends keyof PassInput>(k: K, value: PassInput[K]) => setV((p) => ({ ...p, [k]: value }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    if (needsTerms && !terms) {
      setBusy(false);
      return setError(t('termsRequired'));
    }
    const r = await savePass({ ...v, ...(needsTerms ? { acceptTerms: terms } : {}) });
    setBusy(false);
    if (!r.ok) return setError(message(r));
    toast({ tone: 'neutral', message: t('saved') });
    if (next) router.push(next);
    else router.refresh();
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={(ev) => { ev.preventDefault(); void submit(); }}>
      <FormSection title={t('sections.person')} description={t('sections.personHint')} icon={UserRound}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label={t('firstName')} required value={v.firstName} onChange={(ev) => set('firstName', ev.target.value)} autoComplete="given-name" />
        <Input label={t('lastName')} required value={v.lastName} onChange={(ev) => set('lastName', ev.target.value)} autoComplete="family-name" />
        <Input label={t('phone')} hint={t('phoneHint')} value={v.phone ?? ''} onChange={(ev) => set('phone', ev.target.value || null)} autoComplete="tel" type="tel" />
        <Select label={t('profession')} required value={v.profession} onChange={(ev) => set('profession', ev.target.value as PassInput['profession'])} options={Object.values(Profession).map((p) => ({ value: p, label: e(`Profession.${p}`) }))} />
        <Input label={t('years')} type="number" min={0} max={60} unit={t('yearsUnit')} value={v.yearsExperience} onChange={(ev) => set('yearsExperience', Number(ev.target.value))} />
        <RadioGroup
          label={t('workAuthorized')}
          orientation="horizontal"
          value={v.workAuthorizedCh == null ? 'unknown' : v.workAuthorizedCh ? 'yes' : 'no'}
          onValueChange={(x) => set('workAuthorizedCh', x === 'unknown' ? null : x === 'yes')}
          options={[{ value: 'yes', label: c('states.yes') }, { value: 'no', label: c('states.no') }, { value: 'unknown', label: t('noAnswer') }]}
        />
      </div>
      </FormSection>
      <FormSection title={t('experience')} description={t('sections.experienceHint')} icon={Stethoscope}>
      <div className="flex flex-col gap-3">
        {v.experiences.map((x, i) => (
          <div key={i} className="flex items-end gap-2">
            <Select className="flex-1" label={t('department')} value={x.department} onChange={(ev) => set('experiences', v.experiences.map((y, j) => (j === i ? { ...y, department: ev.target.value as typeof y.department } : y)))} options={Object.values(Department).map((d) => ({ value: d, label: e(`Department.${d}`) }))} />
            <Input className="w-32" label={t('years')} type="number" min={0} max={60} step={0.5} value={x.years} onChange={(ev) => set('experiences', v.experiences.map((y, j) => (j === i ? { ...y, years: Number(ev.target.value) } : y)))} />
            <Button variant="ghost" aria-label={c('actions.remove')} onClick={() => set('experiences', v.experiences.filter((_, j) => j !== i))}><Icon icon={Trash2} /></Button>
          </div>
        ))}
        <div><Button size="s" onClick={() => set('experiences', [...v.experiences, { department: 'ICU', years: 1 }])}><Icon icon={Plus} size={16} />{t('addExperience')}</Button></div>
      </div>
      </FormSection>
      <FormSection title={t('languages')} description={t('sections.languagesHint')} icon={Languages}>
      <div className="flex flex-col gap-3">
        {v.languages.map((l, i) => (
          <div key={i} className="flex items-end gap-2">
            <Select className="flex-1" label={t('language')} value={l.language} onChange={(ev) => set('languages', v.languages.map((y, j) => (j === i ? { ...y, language: ev.target.value } : y)))} options={LANGS.map((x) => ({ value: x, label: t(`lang.${x}`) }))} />
            <Select className="w-32" label={t('level')} value={l.level} onChange={(ev) => set('languages', v.languages.map((y, j) => (j === i ? { ...y, level: ev.target.value as typeof y.level } : y)))} options={LANGUAGE_LEVELS.map((x) => ({ value: x, label: x }))} />
            <Button variant="ghost" aria-label={c('actions.remove')} onClick={() => set('languages', v.languages.filter((_, j) => j !== i))}><Icon icon={Trash2} /></Button>
          </div>
        ))}
        <div><Button size="s" onClick={() => set('languages', [...v.languages, { language: 'en', level: 'B1' }])}><Icon icon={Plus} size={16} />{t('addLanguage')}</Button></div>
      </div>
      </FormSection>
      <FormSection title={t('home.legend')} description={t('home.hint')} icon={MapPin}>
        <HomeLocationField value={v.home} onChange={(home) => set('home', home)} hideLegend />
      </FormSection>
      {needsTerms ? (
        <Checkbox
          checked={terms}
          onCheckedChange={setTerms}
          label={t.rich('terms', {
            terms: (chunks) => <Link href="/legal/terms" target="_blank" className="text-accent-700 underline">{chunks}</Link>,
            privacy: (chunks) => <Link href="/legal/privacy" target="_blank" className="text-accent-700 underline">{chunks}</Link>,
          })}
        />
      ) : null}
      {error ? <Callout tone="critical">{error}</Callout> : null}
      <FormSaveBar>
        <Button type="submit" variant="primary" disabled={busy}>{busy ? c('actions.saving') : c('actions.save')}</Button>
        <span className="text-micro text-ink-500">{t('sections.saveHint')}</span>
      </FormSaveBar>
    </form>
  );
}
