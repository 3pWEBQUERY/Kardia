'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, Callout } from '@kardia/ui';

import { changeJobStatus, publish, startListingCheckout } from '@/app/actions/employer';
import { useActionMessage } from '@/lib/useActionError';

/** Veröffentlichen (AK-A1/AK-C1 serverseitig geprüft), pausieren, abschliessen, Einzelinserat bezahlen. */
export function JobActions({ jobId, status, canPublish, needsPayment }: { jobId: string; status: string; canPublish: boolean; needsPayment: boolean }) {
  const t = useTranslations('employer.job');
  const router = useRouter();
  const message = useActionMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<{ ok: boolean } & Parameters<typeof message>[0]>) => {
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) setError(message(r));
    else router.refresh();
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status !== 'PUBLISHED' ? (
          <Button variant="primary" disabled={busy || !canPublish} onClick={() => void run(() => publish(jobId))}>{t('publish')}</Button>
        ) : (
          <Button disabled={busy} onClick={() => void run(() => changeJobStatus(jobId, 'PAUSED'))}>{t('pause')}</Button>
        )}
        {status !== 'CLOSED' ? <Button variant="danger" disabled={busy} onClick={() => void run(() => changeJobStatus(jobId, 'CLOSED'))}>{t('close')}</Button> : null}
        {status === 'CLOSED' || status === 'PAUSED' ? <Button disabled={busy} onClick={() => void run(() => changeJobStatus(jobId, 'DRAFT'))}>{t('toDraft')}</Button> : null}
        {needsPayment ? (
          <Button
            disabled={busy}
            onClick={() =>
              void startListingCheckout(jobId).then((r) => {
                if (r.ok) window.location.href = r.data.url;
                else setError(message(r));
              })
            }
          >
            {t('payListing')}
          </Button>
        ) : null}
      </div>
      {error ? <Callout tone="critical">{error}</Callout> : null}
    </div>
  );
}
