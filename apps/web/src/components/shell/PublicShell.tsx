import { cookies } from 'next/headers';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';


import { Button } from '@kardia/ui';

import { parseTheme, THEME_COOKIE } from '@/lib/theme';
import { getSession } from '@/server/session';

import { Preferences } from './Preferences.tsx';

import type { ReactNode } from 'react';

/** Öffentliche Seiten mit oberer Leiste (PRD 7.2). */
export async function PublicShell({ children }: { children: ReactNode }) {
  const t = await getTranslations('common');
  const session = await getSession();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line-200 bg-surface-0">
        <div className="mx-auto flex h-14 max-w-content items-center gap-6 px-4 md:px-8">
          <Link href="/" className="text-h3 font-semibold text-ink-900">
            {t('brand')}
          </Link>
          <nav aria-label={t('nav.menu')} className="hidden flex-1 items-center gap-1 md:flex">
            {[
              ['/search', t('nav.search')],
              ['/employers', t('nav.employers')],
              ['/pricing', t('nav.pricing')],
              ['/guide/recognition', t('nav.guide')],
            ].map(([href, label]) => (
              <Link key={href} href={href ?? '/'} className="rounded-control px-3 py-2 text-body-s text-ink-700 hover:bg-surface-100 hover:text-ink-900">
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/search" className="rounded-control px-3 py-2 text-body-s text-ink-700 hover:bg-surface-100 md:hidden">
              {t('nav.search')}
            </Link>
            {session ? (
              <Button asChild size="s" variant="secondary">
                <Link href="/me">{session.user.name || session.user.email}</Link>
              </Button>
            ) : (
              <Button asChild size="s" variant="secondary">
                <Link href="/sign-in">{t('nav.signIn')}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-line-200 bg-surface-0">
        <div className="mx-auto flex max-w-content flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="max-w-prose text-micro text-ink-500">{t('footer.claim')}</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-4 text-micro text-ink-700">
            <Link href="/employers">{t('nav.employers')}</Link>
            <Link href="/pricing">{t('nav.pricing')}</Link>
            <Link href="/legal/terms">{t('footer.terms')}</Link>
            <Link href="/legal/privacy">{t('footer.privacy')}</Link>
            <Link href="/legal/imprint">{t('footer.imprint')}</Link>
            <a href="/api/v1/openapi.json">{t('footer.api')}</a>
          </nav>
          <Preferences theme={theme} />
        </div>
      </footer>
    </div>
  );
}
