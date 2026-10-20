'use client';

import { useTranslations } from 'next-intl';

import { Dialog } from '@kardia/ui';

/** iOS: Web Push nur für zum Home-Bildschirm hinzugefügte Web-Apps – Anleitung in zwei Schritten (PRD 13.3). */
export function IosInstallHint({ onClose }: { onClose: () => void }) {
  const t = useTranslations('common.install');
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('iosTitle')}>
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-body-s text-ink-900">
        <li>{t('iosStep1')}</li>
        <li>{t('iosStep2')}</li>
      </ol>
    </Dialog>
  );
}
