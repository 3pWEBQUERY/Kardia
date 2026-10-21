import { getTranslations } from 'next-intl/server';

import { PageSkeleton } from '@/components/app/PageSkeleton';

export default async function Loading() {
  const t = await getTranslations('admin');
  return <PageSkeleton label={t('loading')} stats={4} />;
}
