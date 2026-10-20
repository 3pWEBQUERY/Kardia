'use client';

import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, Icon, useToast } from '@kardia/ui';

import { toggleSavedJob } from '@/app/actions/candidate';
import { useActionMessage } from '@/lib/useActionError';

/** Merken – optimistisch, weil umkehrbar; mit Rückgängig (PRD 7.4). */
export function SaveButton({ jobId, initial, signedIn }: { jobId: string; initial: boolean; signedIn: boolean }) {
  const t = useTranslations('common');
  const toast = useToast();
  const message = useActionMessage();
  const [saved, setSaved] = useState(initial);
  const toggle = async () => {
    if (!signedIn) {
      window.location.href = `/sign-in?next=${encodeURIComponent(`/jobs/${jobId}`)}`;
      return;
    }
    const before = saved;
    setSaved(!before);
    const r = await toggleSavedJob(jobId);
    if (!r.ok) {
      setSaved(before);
      toast({ tone: 'critical', message: message(r) });
      return;
    }
    setSaved(r.data.saved);
    toast({ tone: 'neutral', message: r.data.saved ? t('search.savedToast') : t('search.unsavedToast'), undo: { label: t('actions.undo'), onUndo: () => void toggleSavedJob(jobId).then((x) => x.ok && setSaved(x.data.saved)) } });
  };
  return (
    <Button onClick={() => void toggle()} aria-pressed={saved}>
      <Icon icon={Heart} size={16} fill={saved ? 'currentColor' : 'none'} />
      {saved ? t('actions.remembered') : t('actions.remember')}
    </Button>
  );
}
