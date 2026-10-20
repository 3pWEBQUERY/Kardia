'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@kardia/ui';

import { deleteSavedSearch } from '@/app/actions/candidate';

export function SavedSearchRow({ id, name, href, frequency }: { id: string; name: string; href: string; frequency: string }) {
  const c = useTranslations('common');
  const router = useRouter();
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-200 py-2 last:border-0">
      <Link href={href} className="flex flex-col">
        <span className="text-body-s font-medium">{name}</span>
        <span className="text-micro text-ink-500">{frequency}</span>
      </Link>
      <Button size="s" variant="ghost" onClick={() => void deleteSavedSearch(id).then(() => router.refresh())}>{c('actions.delete')}</Button>
    </div>
  );
}
