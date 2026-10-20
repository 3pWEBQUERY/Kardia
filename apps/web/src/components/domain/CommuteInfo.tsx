'use client';

import { Bus, Car } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Icon, Skeleton } from '@kardia/ui';

/** Pendelzeit ab Wohnort (Geohash-Zelle) – lädt nach, ohne Spinner (PRD 7.4). */
export function CommuteInfo({ origin, wardId }: { origin: string; wardId: string }) {
  const t = useTranslations('common.search');
  const [m, setM] = useState<{ PT?: number; CAR?: number } | null>(null);
  useEffect(() => {
    let tries = 0;
    let stop = false;
    const load = async () => {
      tries += 1;
      const res = await fetch(`/api/commute?origin=${origin}&wards=${wardId}`);
      if (!res.ok || stop) return;
      const json = (await res.json()) as { minutes: Record<string, { PT?: number; CAR?: number }>; pending: string[] };
      setM(json.minutes[wardId] ?? {});
      if (json.pending.length && tries < 6) setTimeout(() => void load(), 2000 * tries);
    };
    void load();
    return () => {
      stop = true;
    };
  }, [origin, wardId]);
  if (!m) return <Skeleton className="h-5 w-48" />;
  return (
    <p className="flex flex-wrap gap-4 text-body-s text-ink-900 tabular">
      <span className="inline-flex items-center gap-1.5">
        <Icon icon={Bus} size={16} label={t('ptLabel')} />
        {m.PT != null ? t('commutePt', { minutes: m.PT }) : t('commutePending')}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Icon icon={Car} size={16} label={t('carLabel')} />
        {m.CAR != null ? t('commuteCar', { minutes: m.CAR }) : t('commutePending')}
      </span>
    </p>
  );
}
