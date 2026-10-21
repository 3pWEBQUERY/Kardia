import { getTranslations } from 'next-intl/server';

import { StatusPage } from '@/components/brand/StatusPage';

/** 404-Seite: ein Satz plus zwei Wege zurück. */
export default async function NotFound() {
  const t = await getTranslations('errors');
  return <StatusPage code="404" title={t('pages.notFoundTitle')} body={t('notFound')} />;
}
