'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { APPLICATION_MESSAGE_MAX } from '@kardia/core';
import { Button, Callout, Checkbox, Textarea } from '@kardia/ui';

import { applyToJob } from '@/app/actions/candidate';
import { IosInstallHint } from '@/components/shell/IosInstallHint';
import { requestPush } from '@/lib/push';
import { useActionMessage } from '@/lib/useActionError';

function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/**
 * Ein-Klick-Bewerbung: Pass + optional 500 Zeichen. Nur online, nie optimistisch
 * (PRD 7.4, 13.2). Originaldokumente nur mit ausdrücklicher Freigabe (AK-D1).
 */
export function ApplyPanel({
  jobId,
  state,
}: {
  jobId: string;
  state: 'anonymous' | 'noPass' | 'ready' | 'applied';
}) {
  const t = useTranslations('common.apply');
  const c = useTranslations('common');
  const router = useRouter();
  const message = useActionMessage();
  const online = useOnline();
  const [text, setText] = useState('');
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(state === 'applied');
  const [iosHint, setIosHint] = useState(false);

  if (done) return <Callout title={t('doneTitle')}>{t('done')}</Callout>;
  if (state === 'anonymous') {
    return (
      <div className="flex flex-col gap-2">
        <Button asChild variant="primary" size="l">
          <a href={`/sign-in?next=${encodeURIComponent(`/jobs/${jobId}`)}`}>{c('actions.apply')}</a>
        </Button>
        <p className="text-micro text-ink-500">{t('signInHint')}</p>
      </div>
    );
  }
  if (state === 'noPass') {
    return (
      <div className="flex flex-col gap-2">
        <Button asChild variant="primary" size="l">
          <a href={`/me/pass?setup=1&next=${encodeURIComponent(`/jobs/${jobId}`)}`}>{t('createPass')}</a>
        </Button>
        <p className="text-micro text-ink-500">{t('passHint')}</p>
      </div>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = await applyToJob({ jobId, message: text.trim() || undefined, shareDocuments: share } as { jobId: string; message?: string; shareDocuments: boolean });
    setBusy(false);
    if (!result.ok) {
      setError(message(result));
      return;
    }
    setDone(true);
    router.refresh();
    const push = await requestPush().catch(() => 'unsupported' as const);
    if (push === 'ios-install') setIosHint(true);
  };

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        label={t('message')}
        hint={t('messageHint', { max: APPLICATION_MESSAGE_MAX, left: APPLICATION_MESSAGE_MAX - text.length })}
        maxLength={APPLICATION_MESSAGE_MAX}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Checkbox label={t('share')} description={t('shareHint')} checked={share} onCheckedChange={setShare} />
      {error ? <Callout tone="critical">{error}</Callout> : null}
      <Button variant="primary" size="l" onClick={() => void submit()} disabled={busy || !online} aria-disabled={!online}>
        {busy ? c('actions.saving') : c('actions.apply')}
      </Button>
      {!online ? <p className="text-micro text-warn-600">{c('offline.action')}</p> : null}
      {iosHint ? <IosInstallHint onClose={() => setIosHint(false)} /> : null}
    </div>
  );
}

export { useOnline };
