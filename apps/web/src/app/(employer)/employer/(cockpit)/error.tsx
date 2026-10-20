'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button, EmptyState } from '@kardia/ui';

/** Fehler im Cockpit, z. B. Bereich für die Rolle nicht freigegeben: Satz plus eine Aktion. */
export default function CockpitError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('employer.overview');
  return (
    <div className="flex flex-col gap-3">
      <EmptyState action={<Button asChild variant="primary"><Link href="/employer">{t('errorBack')}</Link></Button>}>{t('error')}</EmptyState>
      <div><Button variant="ghost" onClick={reset}>{t('errorRetry')}</Button></div>
    </div>
  );
}
