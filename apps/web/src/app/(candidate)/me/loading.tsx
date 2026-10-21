import { getTranslations } from 'next-intl/server';

import { PageSkeleton } from '@/components/app/PageSkeleton';

export default async function Loading() {
  const t = await getTranslations('candidate');
  return <PageSkeleton label={t('loading')} />;
}
