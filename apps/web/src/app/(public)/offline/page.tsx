import { WifiOff } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Icon } from '@kardia/ui';

import { PulseLine } from '@/components/brand/Artwork';
import { OfflineList } from '@/components/shell/OfflineList';

/** Navigation ohne Netz und ohne Cache: Liste der lokal verfügbaren Inhalte (PRD 13.2). */
export default async function OfflinePage() {
  const t = await getTranslations('common.offline');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-16">
      <span className="inline-flex size-14 items-center justify-center rounded-card bg-brand-950 text-pulse-500">
        <Icon icon={WifiOff} size={26} />
      </span>
      <h1 className="text-display text-ink-900">{t('title')}</h1>
      <p className="text-body text-ink-700">{t('body')}</p>
      <PulseLine className="h-8 w-full text-line-300" peakAt={0.5} />
      <OfflineList />
    </div>
  );
}
