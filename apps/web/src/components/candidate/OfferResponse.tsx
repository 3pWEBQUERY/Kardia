'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, Callout, RadioGroup } from '@kardia/ui';

import { answerOffer } from '@/app/actions/candidate';
import { useOnline } from '@/components/domain/ApplyPanel';
import { useActionMessage } from '@/lib/useActionError';

const REASONS = ['salary', 'workload', 'location', 'conditions', 'timing', 'other'] as const;

/**
 * Interesse gibt Name und Kontakt frei; Ablehnen mit einem Tipp, Grund optional und
 * nur aggregiert für den Arbeitgeber (AK-E3). Nie optimistisch, nur online (PRD 7.4).
 */
export function OfferResponse({ offerId, open }: { offerId: string; open: boolean }) {
  const t = useTranslations('candidate.offer');
  const e = useTranslations('enums');
  const c = useTranslations('common');
  const router = useRouter();
  const message = useActionMessage();
  const online = useOnline();
  const [reason, setReason] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open) return <p className="text-body-s text-ink-700">{t('closed')}</p>;
  const run = async (response: Parameters<typeof answerOffer>[1]) => {
    setBusy(true);
    setError(null);
    const r = await answerOffer(offerId, response);
    setBusy(false);
    if (!r.ok) return setError(message(r));
    if (r.data.applicationId) router.push(`/me/applications/${r.data.applicationId}`);
    else router.refresh();
  };
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-s text-ink-700">{t('interestHint')}</p>
      <Button variant="primary" size="l" disabled={busy || !online} onClick={() => void run({ action: 'interested' })}>{t('interested')}</Button>
      <RadioGroup label={t('reason')} value={reason} onValueChange={setReason} options={REASONS.map((r) => ({ value: r, label: e(`DeclineReason.${r}`) }))} />
      <Button variant="danger" disabled={busy || !online} onClick={() => void run(reason ? { action: 'decline', reason: reason as (typeof REASONS)[number] } : { action: 'decline' })}>{t('decline')}</Button>
      {!online ? <p className="text-micro text-warn-600">{c('offline.action')}</p> : null}
      {error ? <Callout tone="critical">{error}</Callout> : null}
    </div>
  );
}
