'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, Input, Select, useToast } from '@kardia/ui';

import { saveTraining } from '@/app/actions/candidate';

export function TrainingForm({ titles, selected, rows }: { titles: { name: string; areas: { id: string; name: string; years: number }[] }[]; selected: string; rows: { specialtyTitle: string; area: string; yearsCompleted: number }[] }) {
  const t = useTranslations('candidate.training');
  const c = useTranslations('common');
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(selected);
  const current = titles.find((x) => x.name === title);
  const [years, setYears] = useState<Record<string, number>>(() => Object.fromEntries(rows.filter((r) => r.specialtyTitle === selected).map((r) => [r.area, r.yearsCompleted])));
  return (
    <div className="flex flex-col gap-4">
      <Select label={t('specialty')} value={title} onChange={(e) => { setTitle(e.target.value); setYears({}); router.push(`/me/training?title=${encodeURIComponent(e.target.value)}`); }} options={titles.map((x) => ({ value: x.name, label: x.name }))} />
      <div className="grid gap-3 sm:grid-cols-2">
        {current?.areas.map((a) => (
          <Input key={a.id} label={`${a.name} (${t('required', { years: a.years })})`} type="number" min={0} max={10} step={0.5} unit={t('yearsUnit')} value={years[a.id] ?? 0} onChange={(e) => setYears({ ...years, [a.id]: Number(e.target.value) })} />
        ))}
      </div>
      <div>
        <Button
          variant="primary"
          onClick={() =>
            void saveTraining([
              ...rows.filter((r) => r.specialtyTitle !== title),
              ...Object.entries(years).filter(([, y]) => y > 0).map(([area, y]) => ({ specialtyTitle: title, area, yearsCompleted: y })),
            ]).then(() => {
              toast({ tone: 'neutral', message: t('saved') });
              router.refresh();
            })
          }
        >
          {c('actions.save')}
        </Button>
      </div>
    </div>
  );
}
