'use client';

import { useTranslations } from 'next-intl';

import type { ActionResult } from '@/app/actions/result';

/** Fehlermeldung einer Action in einem Satz mit Ursache und Lösung. */
export function useActionMessage() {
  const t = useTranslations('errors');
  return (result: ActionResult<unknown>): string | null => {
    if (result.ok) return null;
    const { kind, message } = result.error;
    if (message && message !== 'internal' && message !== kind) return message;
    return t.has(kind) ? t(kind) : t('generic');
  };
}
