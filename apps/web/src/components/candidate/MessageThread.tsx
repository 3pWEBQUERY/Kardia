'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, EmptyState, Textarea, cx, useToast } from '@kardia/ui';

import { sendCandidateMessage } from '@/app/actions/candidate';
import { useActionMessage } from '@/lib/useActionError';

/** Chat im Bewerbungs-Thread (verschlüsselt gespeichert). */
export function MessageThread({ applicationId, messages, disabled }: { applicationId: string; messages: { id: string; body: string; mine: boolean; at: string; read?: boolean }[]; disabled: boolean }) {
  const t = useTranslations('candidate.applications');
  const router = useRouter();
  const toast = useToast();
  const message = useActionMessage();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 ? <EmptyState>{t('noMessages')}</EmptyState> : null}
      <ol className="flex flex-col gap-2">
        {messages.map((m) => (
          <li key={m.id} className={cx('max-w-[85%] rounded-card border px-3 py-2', m.mine ? 'self-end border-accent-600 bg-accent-50' : 'self-start border-line-300 bg-surface-0')}>
            <p className="text-body-s whitespace-pre-wrap text-ink-900">{m.body}</p>
            <p className="text-micro text-ink-500 tabular">
              {m.at}
              {m.mine && m.read ? ` · ${t('read')}` : ''}
            </p>
          </li>
        ))}
      </ol>
      {!disabled ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            void sendCandidateMessage(applicationId, body).then((r) => {
              setBusy(false);
              if (!r.ok) return toast({ tone: 'critical', message: message(r) });
              setBody('');
              router.refresh();
            });
          }}
        >
          <Textarea label={t('newMessage')} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} />
          <div><Button type="submit" variant="primary" disabled={busy || !body.trim()}>{t('send')}</Button></div>
        </form>
      ) : null}
    </div>
  );
}
