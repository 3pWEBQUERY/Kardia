'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, Dialog, Switch, useToast } from '@kardia/ui';

import { shareDocuments, withdraw } from '@/app/actions/candidate';
import { useActionMessage } from '@/lib/useActionError';

export function ApplicationActions({ applicationId, documentsShared, canWithdraw }: { applicationId: string; documentsShared: boolean; canWithdraw: boolean }) {
  const t = useTranslations('candidate.applications');
  const c = useTranslations('common');
  const router = useRouter();
  const toast = useToast();
  const message = useActionMessage();
  const [shared, setShared] = useState(documentsShared);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Switch
          label={t('shareDocs')}
          checked={shared}
          onCheckedChange={(on) => {
            setShared(on);
            void shareDocuments(applicationId, on).then((r) => {
              if (!r.ok) {
                setShared(!on);
                toast({ tone: 'critical', message: message(r) });
              }
            });
          }}
        />
        <p className="text-micro text-ink-500">{t('shareDocsHint')}</p>
      </div>
      {canWithdraw ? (
        <Dialog
          open={confirm}
          onOpenChange={setConfirm}
          title={t('withdrawTitle')}
          description={t('withdrawBody')}
          trigger={<Button variant="danger">{t('withdraw')}</Button>}
          footer={
            <>
              <Button onClick={() => setConfirm(false)}>{c('actions.cancel')}</Button>
              <Button
                variant="danger"
                onClick={() =>
                  void withdraw(applicationId).then((r) => {
                    setConfirm(false);
                    if (!r.ok) toast({ tone: 'critical', message: message(r) });
                    router.refresh();
                  })
                }
              >
                {t('withdraw')}
              </Button>
            </>
          }
        />
      ) : null}
    </div>
  );
}
