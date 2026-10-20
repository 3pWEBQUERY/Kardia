import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';


import { colors } from '@kardia/ui/tokens';

import { ClientProviders } from '@/components/ClientProviders';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('public.meta');
  const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000';
  return {
    metadataBase: new URL(origin),
    title: { default: t('title'), template: `%s · Kardia` },
    description: t('description'),
    applicationName: 'Kardia',
    appleWebApp: { capable: true, title: 'Kardia', statusBarStyle: 'default' },
    formatDetection: { telephone: false },
    icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  };
}

// theme_color hell/dunkel per <meta name="theme-color" media=…> (PRD 13.1)
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: colors['surface-0'].light },
    { media: '(prefers-color-scheme: dark)', color: colors['surface-0'].dark },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const t = await getTranslations('common');
  // Nur die Namensräume, die Client-Komponenten brauchen (JS-Budget, PRD 10.4).
  const all = (await getMessages()) as Record<string, Record<string, unknown>>;
  const clientMessages = { common: all.common, enums: all.enums, fields: all.fields, errors: all.errors };
  return (
    <html
      lang={locale}
      dir="ltr"
      {...(theme !== 'system' ? { 'data-theme': theme } : {})}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-surface-50 text-ink-900 antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:border focus:border-line-300 focus:bg-surface-0 focus:px-3 focus:py-2"
        >
          {t('skipToContent')}
        </a>
        <NextIntlClientProvider messages={clientMessages}>
          <ClientProviders>{children}</ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
