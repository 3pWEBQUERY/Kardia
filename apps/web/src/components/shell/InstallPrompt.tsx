'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@kardia/ui';

import { isIos, isStandalone } from '@/lib/push';

import { IosInstallHint } from './IosInstallHint.tsx';

const VISITS = 'kardia_visits';
const LAST = 'kardia_install_prompt_at';
const THIRTY_DAYS = 30 * 24 * 3600_000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Kein Speicher (privater Modus): Hinweis erscheint dann einfach nicht.
  }
}

/** Eigener Installationshinweis frühestens beim zweiten Besuch, max. einmal pro 30 Tage (PRD 13.3). */
export function InstallPrompt() {
  const t = useTranslations('common.install');
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const visits = Number(read(VISITS) ?? '0') + 1;
    write(VISITS, String(visits));
    const last = Number(read(LAST) ?? '0');
    const eligible = visits >= 2 && Date.now() - last > THIRTY_DAYS;
    if (!eligible) return;
    if (isIos()) {
      setIos(true);
      setShow(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!show) return null;
  const dismiss = () => {
    write(LAST, String(Date.now()));
    setShow(false);
  };
  return (
    <aside aria-label={t('title')} className="fixed inset-x-4 bottom-20 z-30 flex flex-col gap-3 rounded-card border border-line-300 bg-surface-0 p-4 md:inset-x-auto md:right-4 md:bottom-4 md:w-96">
      <p className="text-body-s font-semibold">{t('title')}</p>
      <p className="text-body-s text-ink-700">{t('body')}</p>
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="s"
          onClick={() => {
            if (ios) setIosHint(true);
            else void event?.prompt();
            dismiss();
          }}
        >
          {t('action')}
        </Button>
        <Button size="s" variant="ghost" onClick={dismiss}>{t('dismiss')}</Button>
      </div>
      {iosHint ? <IosInstallHint onClose={() => setIosHint(false)} /> : null}
    </aside>
  );
}
