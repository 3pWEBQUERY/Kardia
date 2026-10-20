'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, Textarea, useToast } from '@kardia/ui';

import { ask } from '@/app/actions/candidate';
import { useActionMessage } from '@/lib/useActionError';

/** "Frag das Team": asynchrone Frage an Stations-Botschafter:innen, öffentlich nach Moderation. */
export function AskTeam({ wardId, signedIn }: { wardId: string; signedIn: boolean }) {
  const t = useTranslations('common.team');
  const toast = useToast();
  const message = useActionMessage();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  if (!signedIn) {
    return (
      <Button asChild size="s">
        <a href={`/sign-in?next=/wards/${wardId}`}>{t('askSignIn')}</a>
      </Button>
    );
  }
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void ask(wardId, body).then((r) => {
          setBusy(false);
          if (!r.ok) return toast({ tone: 'critical', message: message(r) });
          setBody('');
          toast({ tone: 'neutral', message: t('asked') });
        });
      }}
    >
      <Textarea label={t('ask')} hint={t('askHint')} maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} />
      <Button type="submit" size="s" disabled={busy || body.trim().length < 10}>
        {t('askSubmit')}
      </Button>
    </form>
  );
}
