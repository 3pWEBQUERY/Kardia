'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, Textarea, useToast } from '@kardia/ui';

import { answer } from '@/app/actions/candidate';
import { useActionMessage } from '@/lib/useActionError';

export function AnswerQuestion({ id, ward, body }: { id: string; ward: string; body: string }) {
  const t = useTranslations('candidate.team');
  const router = useRouter();
  const toast = useToast();
  const message = useActionMessage();
  const [text, setText] = useState('');
  return (
    <div className="flex flex-col gap-2 border-b border-line-200 pb-4 last:border-0">
      <p className="text-micro text-ink-500">{ward}</p>
      <p className="text-body-s font-medium">{body}</p>
      <Textarea label={t('answer')} hint={t('answerHint')} maxLength={1500} value={text} onChange={(e) => setText(e.target.value)} />
      <div>
        <Button size="s" variant="primary" disabled={text.trim().length < 5} onClick={() => void answer(id, text).then((r) => { if (!r.ok) return toast({ tone: 'critical', message: message(r) }); toast({ tone: 'neutral', message: t('answered') }); router.refresh(); })}>
          {t('submit')}
        </Button>
      </div>
    </div>
  );
}
