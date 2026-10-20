'use client';

import { BellPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, Dialog, Icon, Input, RadioGroup, useToast } from '@kardia/ui';

import { saveSearch } from '@/app/actions/candidate';
import { IosInstallHint } from '@/components/shell/IosInstallHint';
import { requestPush } from '@/lib/push';
import { useActionMessage } from '@/lib/useActionError';

import type { SearchFilter } from '@kardia/core';

/** Gespeicherte Suche mit Benachrichtigung per E-Mail oder Web Push (sofort, täglich, wöchentlich). */
export function SaveSearch({ filter, signedIn }: { filter: SearchFilter; signedIn: boolean }) {
  const t = useTranslations('common.search');
  const c = useTranslations('common');
  const e = useTranslations('enums');
  const toast = useToast();
  const message = useActionMessage();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('DAILY');
  const [busy, setBusy] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  if (!signedIn) {
    return (
      <Button asChild size="s">
        <a href={`/sign-in?next=${encodeURIComponent('/search')}`}>
          <Icon icon={BellPlus} size={16} />
          {t('save')}
        </a>
      </Button>
    );
  }

  const submit = async () => {
    setBusy(true);
    const result = await saveSearch({ name: name || t('defaultName'), filters: filter, frequency });
    setBusy(false);
    if (!result.ok) {
      toast({ tone: 'critical', message: message(result) });
      return;
    }
    setOpen(false);
    toast({ tone: 'neutral', message: t('savedSearch') });
    const push = await requestPush().catch(() => 'unsupported' as const);
    if (push === 'ios-install') setIosHint(true);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t('save')}
        description={t('saveHint')}
        closeLabel={c('actions.close')}
        trigger={
          <Button size="s">
            <Icon icon={BellPlus} size={16} />
            {t('save')}
          </Button>
        }
        footer={
          <>
            <Button onClick={() => setOpen(false)}>{c('actions.cancel')}</Button>
            <Button variant="primary" onClick={() => void submit()} disabled={busy}>
              {busy ? c('actions.saving') : c('actions.save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label={t('name')} value={name} onChange={(ev) => setName(ev.target.value)} maxLength={80} placeholder={t('defaultName')} />
          <RadioGroup
            label={t('frequency')}
            value={frequency}
            onValueChange={setFrequency}
            options={(['INSTANT', 'DAILY', 'WEEKLY'] as const).map((f) => ({ value: f, label: e(`AlertFrequency.${f}`) }))}
          />
        </div>
      </Dialog>
      {iosHint ? <IosInstallHint onClose={() => setIosHint(false)} /> : null}
    </>
  );
}
