'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { LANGUAGE_LEVELS, type PassInput } from '@kardia/core';
import { Department, Profession } from '@kardia/db/enums';
import { Button, Callout, Icon, Input, RadioGroup, Select, useToast } from '@kardia/ui';

import { savePass } from '@/app/actions/candidate';
import { useActionMessage } from '@/lib/useActionError';

const LANGS = ['de', 'fr', 'it', 'en', 'rm', 'es', 'pt', 'sq', 'sr', 'hr', 'tr', 'pl'];

export function PassForm({ initial, defaultName, next }: { initial: PassInput | null; defaultName: string; next: string | null }) {
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
  const set = <K extends keyof PassInput>(k: K, value: PassInput[K]) => setV((p) => ({ ...p, [k]: value }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    const r = await savePass(v);
    setBusy(false);
    if (!r.ok) return setError(message(r));
    toast({ tone: 'neutral', message: t('saved') });
    if (next) router.push(next);
    else router.refresh();
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={(ev) => { ev.preventDefault(); void submit(); }}>
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
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-caption text-ink-700">{t('experience')}</legend>
        {v.experiences.map((x, i) => (
          <div key={i} className="flex items-end gap-2">
            <Select className="flex-1" label={t('department')} value={x.department} onChange={(ev) => set('experiences', v.experiences.map((y, j) => (j === i ? { ...y, department: ev.target.value as typeof y.department } : y)))} options={Object.values(Department).map((d) => ({ value: d, label: e(`Department.${d}`) }))} />
            <Input className="w-32" label={t('years')} type="number" min={0} max={60} step={0.5} value={x.years} onChange={(ev) => set('experiences', v.experiences.map((y, j) => (j === i ? { ...y, years: Number(ev.target.value) } : y)))} />
            <Button variant="ghost" aria-label={c('actions.remove')} onClick={() => set('experiences', v.experiences.filter((_, j) => j !== i))}><Icon icon={Trash2} /></Button>
          </div>
        ))}
        <div><Button size="s" onClick={() => set('experiences', [...v.experiences, { department: 'ICU', years: 1 }])}><Icon icon={Plus} size={16} />{t('addExperience')}</Button></div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-caption text-ink-700">{t('languages')}</legend>
        {v.languages.map((l, i) => (
          <div key={i} className="flex items-end gap-2">
            <Select className="flex-1" label={t('language')} value={l.language} onChange={(ev) => set('languages', v.languages.map((y, j) => (j === i ? { ...y, language: ev.target.value } : y)))} options={LANGS.map((x) => ({ value: x, label: t(`lang.${x}`) }))} />
            <Select className="w-32" label={t('level')} value={l.level} onChange={(ev) => set('languages', v.languages.map((y, j) => (j === i ? { ...y, level: ev.target.value as typeof y.level } : y)))} options={LANGUAGE_LEVELS.map((x) => ({ value: x, label: x }))} />
            <Button variant="ghost" aria-label={c('actions.remove')} onClick={() => set('languages', v.languages.filter((_, j) => j !== i))}><Icon icon={Trash2} /></Button>
          </div>
        ))}
        <div><Button size="s" onClick={() => set('languages', [...v.languages, { language: 'en', level: 'B1' }])}><Icon icon={Plus} size={16} />{t('addLanguage')}</Button></div>
      </fieldset>
      {error ? <Callout tone="critical">{error}</Callout> : null}
      <div><Button type="submit" variant="primary" disabled={busy}>{busy ? c('actions.saving') : c('actions.save')}</Button></div>
    </form>
  );
}
