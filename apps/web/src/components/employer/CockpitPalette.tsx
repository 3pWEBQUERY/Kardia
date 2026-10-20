'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { CommandPalette, type CommandItem } from '@kardia/ui';

export interface PaletteEntry {
  id: string;
  group: string;
  label: string;
  hint?: string;
  href: string;
}

/** Befehlspalette (Cmd/Ctrl + K) für Recruiter: Einträge kommen vom Server, Navigation im Client. */
export function CockpitPalette({ entries }: { entries: PaletteEntry[] }) {
  const t = useTranslations('common.commandPalette');
  const router = useRouter();
  const items = useMemo<CommandItem[]>(
    () => entries.map((e) => ({ id: e.id, group: e.group, label: e.label, ...(e.hint ? { hint: e.hint } : {}), onRun: () => router.push(e.href) })),
    [entries, router],
  );
  return <CommandPalette items={items} title={t('title')} placeholder={t('placeholder')} emptyLabel={t('empty')} />;
}
