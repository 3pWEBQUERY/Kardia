import { getTranslations } from 'next-intl/server';

import { WardEditor } from '@/components/employer/WardEditor';
import { emptyWardServer } from '@/components/employer/wardDefaults';
import { listLocations } from '@/server/services/wards';
import { requireOrg } from '@/server/session';

export default async function NewWardPage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const ctx = await requireOrg('wards.edit');
  const t = await getTranslations('employer.ward');
  const { location } = await searchParams;
  const locations = await listLocations(ctx.org.id);
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">{t('newTitle')}</h1>
        <p className="text-body-s text-ink-700">{t('newLead')}</p>
      </header>
      <WardEditor
        {...(location ? { locationId: location } : {})}
        locations={locations.map((l) => ({ id: l.id, name: l.name, city: l.city }))}
        initial={emptyWardServer()}
        submitLabel={t('create')}
      />
    </div>
  );
}
