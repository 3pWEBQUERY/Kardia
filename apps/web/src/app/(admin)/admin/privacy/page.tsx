import { getTranslations } from 'next-intl/server';

import { DataSubjectRequest } from '@/components/admin/DataSubjectRequest';

/** Betroffenenanfragen (revDSG): Auskunft innert 30 Tagen und Löschung, alles im Audit-Log. */
export default async function PrivacyRequestsPage() {
  const t = await getTranslations('admin.privacy');
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="prose-k text-body-s text-ink-700">{t('lead')}</p>
      </header>
      <DataSubjectRequest />
    </div>
  );
}
