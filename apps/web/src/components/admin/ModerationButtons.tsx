'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, useToast } from '@kardia/ui';

import { moderateItem } from '@/app/actions/admin';
import { useActionMessage } from '@/lib/useActionError';

export function ModerationButtons({
  entity,
  id,
  approveLabel,
  rejectLabel,
}: {
  entity: 'TeamQuestion' | 'WardVideo' | 'RealityCheckComment' | 'ContentReport';
  id: string;
  approveLabel: string;
  rejectLabel: string;
}) {
  const t = useTranslations('admin.moderation');
  const toast = useToast();
  const router = useRouter();
  const message = useActionMessage();
  const [busy, setBusy] = useState(false);
  const go = async (status: 'APPROVED' | 'REJECTED') => {
    setBusy(true);
    const r = await moderateItem(entity, id, status);
    setBusy(false);
    if (!r.ok) return toast({ tone: 'critical', message: message(r) ?? '' });
    toast({ tone: 'neutral', message: t('done') });
    router.refresh();
  };
  return (
    <div className="flex gap-2">
      <Button size="s" variant="primary" disabled={busy} onClick={() => void go('APPROVED')}>{approveLabel}</Button>
      <Button size="s" variant="danger" disabled={busy} onClick={() => void go('REJECTED')}>{rejectLabel}</Button>
    </div>
  );
}
