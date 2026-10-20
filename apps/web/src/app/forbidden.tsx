import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button, EmptyState } from '@kardia/ui';

/** 403-Seite: ein Satz plus eine Aktion. */
export default async function Forbidden() {
  const t = await getTranslations('errors');
  const c = await getTranslations('common');
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-content items-center justify-center px-4 py-16">
      <EmptyState
        action={
          <Button asChild variant="primary">
            <Link href="/">{c('brand')}</Link>
          </Button>
        }
      >
        {t('forbidden')}
      </EmptyState>
    </main>
  );
}
