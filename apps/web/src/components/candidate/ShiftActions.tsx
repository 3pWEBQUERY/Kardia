'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, useToast } from '@kardia/ui';

import { book, cancelBooking } from '@/app/actions/candidate';
import { useOnline } from '@/components/domain/ApplyPanel';
import { useActionMessage } from '@/lib/useActionError';

/** Buchen mit einem Tipp – nie optimistisch, nur online (PRD 7.4, 13.2). */
export function ShiftActions({ shiftId, kind, disabled, deadlineHours }: { shiftId: string; kind: 'book' | 'interest' | 'cancel'; disabled?: boolean; deadlineHours?: number }) {
  const t = useTranslations('candidate.shifts');
  const c = useTranslations('common');
  const router = useRouter();
  const toast = useToast();
  const message = useActionMessage();
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    const r = kind === 'cancel' ? await cancelBooking(shiftId) : await book(shiftId);
    setBusy(false);
    if (!r.ok) {
      toast({ tone: 'critical', message: message(r) });
      router.refresh();
      return;
    }
    toast({ tone: 'neutral', message: kind === 'cancel' ? t('cancelled') : r.data && 'status' in r.data && r.data.status === 'INTEREST' ? t('interestSent') : t('bookedToast') });
    router.refresh();
  };
  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button size="s" variant={kind === 'cancel' ? 'danger' : 'primary'} disabled={busy || disabled || !online} onClick={() => void run()}>
        {kind === 'cancel' ? t('cancel') : kind === 'interest' ? (disabled ? t('interestDone') : t('interest')) : t('book')}
      </Button>
      {!online ? <span className="text-micro text-warn-600">{c('offline.action')}</span> : null}
      {kind === 'cancel' && disabled ? <span className="text-micro text-ink-500">{t('cancelDeadline', { hours: deadlineHours ?? 0 })}</span> : null}
    </div>
  );
}
