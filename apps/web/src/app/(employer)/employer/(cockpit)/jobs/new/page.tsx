import { getTranslations } from 'next-intl/server';

import { ImportFlow } from '@/components/employer/ImportFlow';
import { wardDefaultsFor } from '@/components/employer/wardDefaultsServer';
import { listLocations, listWardsForOrg } from '@/server/services/wards';
import { requireOrg } from '@/server/session';

/** Neue Stelle: Inserat importieren (KI-1) oder von Hand erfassen. */
export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ ward?: string }> }) {
  const ctx = await requireOrg('jobs.edit');
  const { ward } = await searchParams;
  const t = await getTranslations('employer.import');
  const [wards, locations] = await Promise.all([listWardsForOrg(ctx.org.id), listLocations(ctx.org.id)]);
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-s text-ink-700">{t('lead')}</p>
      </header>
      <ImportFlow
        wards={wards.map((w) => ({ id: w.id, label: `${w.name} · ${w.location.name}` }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name, city: l.city }))}
        wardDefaults={await wardDefaultsFor(wards as unknown as Record<string, unknown>[])}
        {...(ward && wards.some((w) => w.id === ward) ? { presetWardId: ward } : {})}
      />
    </div>
  );
}
