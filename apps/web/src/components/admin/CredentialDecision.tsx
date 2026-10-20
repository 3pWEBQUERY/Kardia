'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, Callout, Card, CardBody, Textarea, useToast } from '@kardia/ui';

import { claim, decide } from '@/app/actions/admin';
import { useActionMessage } from '@/lib/useActionError';

/** Entscheid immer durch einen Menschen; Ablehnung nur mit Grund (PRD 9.4). */
export function CredentialDecision({ id, status }: { id: string; status: string }) {
  const t = useTranslations('admin.credentials');
  const router = useRouter();
  const toast = useToast();
  const message = useActionMessage();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const open = status === 'SUBMITTED' || status === 'IN_REVIEW';

  const run = async (fn: () => Promise<Parameters<typeof message>[0]>, ok: string) => {
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) return setError(message(r));
    toast({ tone: 'neutral', message: ok });
    router.refresh();
  };

  if (!open) return null;
  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        {status === 'SUBMITTED' ? (
          <Button onClick={() => void run(() => claim(id), t('claim'))} disabled={busy}>
            {t('claim')}
          </Button>
        ) : null}
        <Textarea label={t('reason')} hint={t('reasonHint')} maxLength={400} value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={busy} onClick={() => void run(() => decide(id, true), t('decided'))}>
            {t('verify')}
          </Button>
          <Button variant="danger" disabled={busy || !reason.trim()} onClick={() => void run(() => decide(id, false, reason.trim()), t('decided'))}>
            {t('reject')}
          </Button>
        </div>
        {error ? <Callout tone="critical">{error}</Callout> : null}
      </CardBody>
    </Card>
  );
}
