'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DEALBREAKERS, type Condition } from '@kardia/core';
import { Button, Callout, Checkbox, Input, Select, Switch, useToast } from '@kardia/ui';

import { saveMarketplace } from '@/app/actions/candidate';
import { useActionMessage } from '@/lib/useActionError';

interface State {
  marketplaceActive: boolean;
  desiredWorkloadPct: number | null;
  earliestStart: string | null;
  homeDistrict: string | null;
  mustConditions: Condition[];
}

/** Anonymes Verfügbarkeitsprofil: Region nur als Bezirk, Muss-Bedingungen wie in der Suche. */
export function MarketplaceForm({ initial }: { initial: State }) {
  const t = useTranslations('candidate.marketplace');
  const c = useTranslations('common');
  const router = useRouter();
  const toast = useToast();
  const message = useActionMessage();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const has = (key: string) => v.mustConditions.some((x) => x.key === key);
  const toggle = (cond: Condition, on: boolean) =>
    setV((p) => ({ ...p, mustConditions: on ? [...p.mustConditions.filter((x) => x.key !== cond.key), cond] : p.mustConditions.filter((x) => x.key !== cond.key) }));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void saveMarketplace(v).then((r) => {
          if (!r.ok) return setError(message(r));
          setError(null);
          toast({ tone: 'neutral', message: t('saved') });
          router.refresh();
        });
      }}
    >
      <Switch label={t('active')} checked={v.marketplaceActive} onCheckedChange={(on) => setV({ ...v, marketplaceActive: on })} />
      <div className="grid gap-4 md:grid-cols-3">
        <Select label={t('workload')} placeholder={c('search.any')} value={v.desiredWorkloadPct ? String(v.desiredWorkloadPct) : ''} onChange={(e) => setV({ ...v, desiredWorkloadPct: e.target.value ? Number(e.target.value) : null })} options={[100, 90, 80, 70, 60, 50, 40, 30, 20].map((x) => ({ value: String(x), label: `${x} %` }))} />
        <Input label={t('earliestStart')} type="date" value={v.earliestStart ?? ''} onChange={(e) => setV({ ...v, earliestStart: e.target.value || null })} />
        <Input label={t('district')} hint={t('districtHint')} value={v.homeDistrict ?? ''} onChange={(e) => setV({ ...v, homeDistrict: e.target.value || null })} placeholder="Bezirk Uster" />
      </div>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-caption text-ink-700">{t('must')}</legend>
        {(Object.values(DEALBREAKERS) as Condition[]).map((d) => (
          <Checkbox key={d.key} label={c(`conditions.${d.key}.wanted`, { value: 'value' in d ? d.value : '', transport: '' })} checked={has(d.key)} onCheckedChange={(on) => toggle(d, on)} />
        ))}
        <Checkbox label={c('conditions.pendingRecognition.wanted')} checked={has('pendingRecognition')} onCheckedChange={(on) => toggle({ key: 'pendingRecognition', mode: 'must' }, on)} />
        <Checkbox label={c('conditions.childcare.wanted')} checked={has('childcare')} onCheckedChange={(on) => toggle({ key: 'childcare', mode: 'must' }, on)} />
      </fieldset>
      {error ? <Callout tone="critical">{error}</Callout> : null}
      <div><Button type="submit" variant="primary">{c('actions.save')}</Button></div>
    </form>
  );
}
