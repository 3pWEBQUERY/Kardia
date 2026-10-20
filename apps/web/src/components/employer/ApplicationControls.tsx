'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { PIPELINE_COLUMNS, canTransition } from '@kardia/core';
import { RejectionReason, type ApplicationStatus } from '@kardia/db/enums';
import { Button, Callout, Select, Textarea, useToast } from '@kardia/ui';

import { sendEmployerMessage, setApplicationStatus } from '@/app/actions/employer';
import { useActionMessage } from '@/lib/useActionError';

/** Status setzen; Absage nur mit Grund aus der festen Liste. Fachperson erhält den Status sofort. */
export function StatusControl({
  applicationId,
  status,
}: {
  applicationId: string;
  status: ApplicationStatus;
}) {
  const t = useTranslations('employer.pipeline');
  const te = useTranslations('enums');
  const router = useRouter();
  const toast = useToast();
  const message = useActionMessage();
  const [to, setTo] = useState<string>(status);
  const [reason, setReason] = useState<string>(RejectionReason.QUALIFICATION_MISSING);
  const [busy, setBusy] = useState(false);
  const options = PIPELINE_COLUMNS.filter((s) => s === status || canTransition(status, s));
  return (
    <div className="flex flex-col gap-3">
      <Select
        label={t('status')}
        value={to}
        onChange={(e) => setTo(e.target.value)}
        options={options.map((s) => ({ value: s, label: te(`ApplicationStatus.${s}`) }))}
      />
      {to === 'REJECTED' ? (
        <Select
          label={t('reason')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          options={Object.values(RejectionReason).map((r) => ({
            value: r,
            label: te(`RejectionReason.${r}`),
          }))}
        />
      ) : null}
      <div>
        <Button
          variant="primary"
          disabled={busy || to === status}
          onClick={() => {
            setBusy(true);
            void setApplicationStatus(applicationId, {
              status: to as never,
              ...(to === 'REJECTED' ? { rejectionReason: reason as never } : {}),
            }).then((r) => {
              setBusy(false);
              if (!r.ok) return toast({ tone: 'critical', message: message(r) });
              toast({ tone: 'neutral', message: t('statusSaved') });
              router.refresh();
            });
          }}
        >
          {t('saveStatus')}
        </Button>
      </div>
    </div>
  );
}

/** Nachricht im Bewerbungs-Thread (verschlüsselt gespeichert). */
export function MessageComposer({ applicationId }: { applicationId: string }) {
  const t = useTranslations('employer.pipeline');
  const router = useRouter();
  const message = useActionMessage();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void sendEmployerMessage(applicationId, body).then((r) => {
          setBusy(false);
          if (!r.ok) return setError(message(r));
          setBody('');
          setError(null);
          router.refresh();
        });
      }}
    >
      <Textarea
        label={t('message')}
        maxLength={4000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {error ? <Callout tone="critical">{error}</Callout> : null}
      <div>
        <Button type="submit" disabled={busy || !body.trim()}>
          {t('send')}
        </Button>
      </div>
    </form>
  );
}
