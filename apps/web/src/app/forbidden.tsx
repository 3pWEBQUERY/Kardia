import { getTranslations } from 'next-intl/server';

import { StatusPage } from '@/components/brand/StatusPage';

/** 403-Seite: fehlende Berechtigung, mit Hinweis auf die passende Rolle. */
export default async function Forbidden() {
  const t = await getTranslations('errors');
  return <StatusPage code="403" title={t('pages.forbiddenTitle')} body={t('forbidden')} />;
}
