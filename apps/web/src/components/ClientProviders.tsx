'use client';

import { SerwistProvider } from '@serwist/turbopack/react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { ToastProvider } from '@kardia/ui';

export function ClientProviders({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  return (
    <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV !== 'production'}>
      <ToastProvider closeLabel={t('actions.close')}>{children}</ToastProvider>
    </SerwistProvider>
  );
}
