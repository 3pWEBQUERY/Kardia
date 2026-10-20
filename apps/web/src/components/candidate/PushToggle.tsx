'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button, Callout } from '@kardia/ui';

import { unsubscribePush } from '@/app/actions/candidate';
import { IosInstallHint } from '@/components/shell/IosInstallHint';
import { requestPush } from '@/lib/push';

export function PushToggle() {
  const t = useTranslations('candidate.settings');
  const [state, setState] = useState<'unknown' | 'on' | 'off' | 'unsupported'>('unknown');
  const [ios, setIos] = useState(false);
  useEffect(() => {
    void (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return setState('unsupported');
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? 'on' : 'off');
    })();
  }, []);
  if (state === 'unsupported') return <Callout>{t('pushUnsupported')}</Callout>;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-s text-ink-700">{state === 'on' ? t('pushOn') : t('pushOff')}</p>
      <div>
        {state === 'on' ? (
          <Button
            onClick={() =>
              void (async () => {
                const reg = await navigator.serviceWorker.getRegistration();
                const sub = await reg?.pushManager.getSubscription();
                if (sub) {
                  await unsubscribePush(sub.endpoint);
                  await sub.unsubscribe();
                }
                setState('off');
              })()
            }
          >
            {t('pushDisable')}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => void requestPush().then((r) => (r === 'granted' ? setState('on') : r === 'ios-install' ? setIos(true) : undefined))}>
            {t('pushEnable')}
          </Button>
        )}
      </div>
      {ios ? <IosInstallHint onClose={() => setIos(false)} /> : null}
    </div>
  );
}
