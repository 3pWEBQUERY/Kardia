import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/app/PageHeader';
import { ImportFlow } from '@/components/employer/ImportFlow';
import { wardDefaultsFor } from '@/components/employer/wardDefaultsServer';
import { listLocations, listWardsForOrg } from '@/server/services/wards';
import { requireOrgPage } from '@/server/session';

/** Neue Stelle: Inserat importieren (KI-1) oder von Hand erfassen. */
export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ ward?: string }>;
}) {
  const ctx = await requireOrgPage('jobs.edit');
  const { ward } = await searchParams;
  const t = await getTranslations('employer.import');
  const [wards, locations] = await Promise.all([
    listWardsForOrg(ctx.org.id),
    listLocations(ctx.org.id),
  ]);
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader eyebrow={ctx.org.name} title={t('title')} description={t('lead')} />
      <ImportFlow
        wards={wards.map((w) => ({ id: w.id, label: `${w.name} · ${w.location.name}` }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name, city: l.city }))}
        wardDefaults={await wardDefaultsFor(wards)}
        {...(ward && wards.some((w) => w.id === ward) ? { presetWardId: ward } : {})}
      />
    </div>
  );
}
