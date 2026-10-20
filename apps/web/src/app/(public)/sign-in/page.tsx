import { getTranslations } from 'next-intl/server';

import { SignInForm } from '@/components/auth/SignInForm';

import type { Metadata } from 'next';

export const metadata: Metadata = { robots: { index: false } };

function safeNext(next: string | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/me';
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; admin?: string }> }) {
  const sp = await searchParams;
  const t = await getTranslations('auth');
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-s text-ink-700">{t('lead')}</p>
      </header>
      <SignInForm next={safeNext(sp.next)} adminOnly={sp.admin === '1'} />
      <p className="text-micro text-ink-500">{t('privacy')}</p>
    </div>
  );
}
