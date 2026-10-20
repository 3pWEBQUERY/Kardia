'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, Checkbox, Input, useToast } from '@kardia/ui';

import { decideOrg, recheckOrg, setPlan } from '@/app/actions/admin';
import { useActionMessage } from '@/lib/useActionError';

import type { ActionResult } from '@/app/actions/result';
import type { PlanTier } from '@kardia/db/enums';

function useRun() {
  const toast = useToast();
  const router = useRouter();
  const message = useActionMessage();
  return async (p: Promise<ActionResult<unknown>>, ok: string) => {
    const r = await p;
    if (!r.ok) toast({ tone: 'critical', message: message(r) ?? '' });
    else {
      toast({ tone: 'neutral', message: ok });
      router.refresh();
    }
  };
}

/** Freigabe/Ablehnung einer Organisation (AK-C1: SECO-Treffer nur manuell). */
export function OrgDecision({ id }: { id: string }) {
  const t = useTranslations('admin.organizations');
  const run = useRun();
  const [note, setNote] = useState('');
  return (
    <div className="flex flex-col gap-2">
      <Input label={t('note')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => void run(decideOrg(id, 'VERIFIED', note || undefined), t('decided'))}>{t('approve')}</Button>
        <Button variant="danger" onClick={() => void run(decideOrg(id, 'REJECTED', note || undefined), t('decided'))}>{t('reject')}</Button>
        <Button variant="ghost" onClick={() => void run(recheckOrg(id), t('rechecked'))}>{t('recheck')}</Button>
      </div>
    </div>
  );
}

/** Abo manuell setzen (Gründungspartner, bezahlte QR-Rechnung). */
export function OrgPlanForm({ id, plan, validUntil, foundingPartner }: { id: string; plan: PlanTier | null; validUntil: string | null; foundingPartner: boolean }) {
  const t = useTranslations('admin.organizations');
  const e = useTranslations('enums');
  const run = useRun();
  const [p, setP] = useState<string>(plan ?? '');
  const [until, setUntil] = useState(validUntil ?? '');
  const [fp, setFp] = useState(foundingPartner);
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(ev) => {
        ev.preventDefault();
        void run(setPlan(id, { plan: (p || null) as PlanTier | null, validUntil: until || null, foundingPartner: fp }), t('planSaved'));
      }}
    >
      <label className="flex flex-col gap-1 text-caption text-ink-700">
        {t('plan')}
        <select value={p} onChange={(ev) => setP(ev.target.value)} className="h-control-s rounded-control border border-line-300 bg-surface-0 px-2 text-body-s text-ink-900">
          <option value="">{t('noPlan')}</option>
          {(['PRAXIS', 'INSTITUTION', 'SPITALGRUPPE'] as const).map((x) => (
            <option key={x} value={x}>{e(`PlanTier.${x}`)}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-caption text-ink-700">
        {t('validUntil')}
        <input type="date" value={until} onChange={(ev) => setUntil(ev.target.value)} className="h-control-s rounded-control border border-line-300 bg-surface-0 px-2 text-body-s text-ink-900" />
      </label>
      <Checkbox label={t('foundingPartner')} checked={fp} onCheckedChange={setFp} />
      <Button type="submit" size="s">{t('savePlan')}</Button>
    </form>
  );
}
