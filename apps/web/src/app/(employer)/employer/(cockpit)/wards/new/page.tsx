import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/app/PageHeader';
import { emptyWardServer } from '@/components/employer/wardDefaults';
import { WardEditor } from '@/components/employer/WardEditor';
import { listLocations } from '@/server/services/wards';
import { requireOrgPage } from '@/server/session';

export default async function NewWardPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const ctx = await requireOrgPage('wards.edit');
  const t = await getTranslations('employer.ward');
  const { location } = await searchParams;
  const locations = await listLocations(ctx.org.id);
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader eyebrow={ctx.org.name} title={t('newTitle')} description={t('newLead')} />
      <WardEditor
        {...(location ? { locationId: location } : {})}
        locations={locations.map((l) => ({ id: l.id, name: l.name, city: l.city }))}
        initial={emptyWardServer()}
        submitLabel={t('create')}
      />
    </div>
  );
}
