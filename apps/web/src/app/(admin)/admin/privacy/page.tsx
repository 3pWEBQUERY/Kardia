import { getTranslations } from 'next-intl/server';

import { DataSubjectRequest } from '@/components/admin/DataSubjectRequest';
import { PageHeader } from '@/components/app/PageHeader';

/** Betroffenenanfragen (revDSG): Auskunft innert 30 Tagen und Löschung, alles im Audit-Log. */
export default async function PrivacyRequestsPage() {
  const t = await getTranslations('admin.privacy');
  const ta = await getTranslations('admin');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={ta('eyebrow')} title={t('title')} description={t('lead')} />
      <DataSubjectRequest />
    </div>
  );
}
