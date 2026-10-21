'use client';

import { Flag } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, Dialog, Icon, Textarea, useToast } from '@kardia/ui';

import { report } from '@/app/actions/candidate';
import { useActionMessage } from '@/lib/useActionError';

export type ReportEntity = 'TeamQuestion' | 'RealityCheck' | 'WardVideo';

/**
 * Meldefunktion (PRD 14.3): Inhalte von Mitarbeitenden und Stationen melden; landet in
 * der Moderations-Queue der Admin-Konsole. Ohne Anmeldung führt der Knopf zur Anmeldung.
 */
export function ReportButton({ entity, entityId, signedIn }: { entity: ReportEntity; entityId: string; signedIn: boolean }) {
  const t = useTranslations('public.report');
  const tc = useTranslations('common');
  const pathname = usePathname();
  const toast = useToast();
  const message = useActionMessage();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (!signedIn) {
    return (
      <Button asChild size="s" variant="ghost">
        <a href={`/sign-in?next=${encodeURIComponent(pathname)}`}>
          <Icon icon={Flag} size={16} />
          {t('action')}
        </a>
      </Button>
    );
  }

  const send = async () => {
    setBusy(true);
    const r = await report(entity, entityId, reason.trim());
    setBusy(false);
    if (!r.ok) return toast({ tone: 'critical', message: message(r) });
    setOpen(false);
    setReason('');
    toast({ tone: 'neutral', message: t('sent') });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title={t('title')}
      description={t('description')}
      closeLabel={tc('actions.close')}
      trigger={
        <Button size="s" variant="ghost">
          <Icon icon={Flag} size={16} />
          {t('action')}
        </Button>
      }
      footer={
        <>
          <Button onClick={() => setOpen(false)}>{tc('actions.cancel')}</Button>
          <Button variant="primary" disabled={busy || reason.trim().length < 5} onClick={() => void send()}>
            {t('send')}
          </Button>
        </>
      }
    >
      <Textarea label={t('reason')} hint={t('reasonHint')} maxLength={400} value={reason} onChange={(e) => setReason(e.target.value)} />
    </Dialog>
  );
}
