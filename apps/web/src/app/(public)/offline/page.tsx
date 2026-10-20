import { getTranslations } from 'next-intl/server';

import { OfflineList } from '@/components/shell/OfflineList';

/** Navigation ohne Netz und ohne Cache: Liste der lokal verfügbaren Inhalte (PRD 13.2). */
export default async function OfflinePage() {
  const t = await getTranslations('common.offline');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-12">
      <h1 className="text-h1">{t('title')}</h1>
      <p className="text-body-s text-ink-700">{t('body')}</p>
      <OfflineList />
    </div>
  );
}
