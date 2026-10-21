import { ArrowUp, ArrowUpRight, Building2, Lock, Percent } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button, Icon } from '@kardia/ui';

import { ContourField, PulseLine } from '@/components/brand/Artwork';
import { KardiaLogo } from '@/components/brand/KardiaLogo';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';
import { getSession } from '@/server/session';

import { InstallPrompt } from './InstallPrompt.tsx';
import { Preferences } from './Preferences.tsx';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Öffentliche Seiten mit oberer Leiste (PRD 7.2) und Marken-Footer. */
export async function PublicShell({ children }: { children: ReactNode }) {
  const t = await getTranslations('common');
  const tl = await getTranslations('public.legal');
  const session = await getSession();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const nav: [string, string][] = [
    ['/search', t('nav.search')],
    ['/employers', t('nav.employers')],
    ['/pricing', t('nav.pricing')],
    ['/guide/recognition', t('nav.guide')],
  ];
  const columns: { title: string; links: [string, string][] }[] = [
    {
      title: t('footer.columns.talent'),
      links: [
        ['/search', t('footer.links.search')],
        ['/me/pass', t('footer.links.pass')],
        ['/me/marketplace', t('footer.links.marketplace')],
        ['/me/shifts', t('footer.links.shifts')],
        ['/compare', t('footer.links.compare')],
      ],
    },
    {
      title: t('footer.columns.employers'),
      links: [
        ['/employers', t('nav.employers')],
        ['/employer/onboarding', t('footer.links.register')],
        ['/pricing', t('footer.links.pricing')],
        ['/employer', t('footer.links.cockpit')],
      ],
    },
    {
      title: t('footer.columns.knowledge'),
      links: [
        ['/guide/recognition', t('footer.links.recognition')],
        ['/api/v1/openapi.json', t('footer.links.api')],
      ],
    },
    {
      title: t('footer.columns.legal'),
      links: [
        ['/legal/terms', t('footer.terms')],
        ['/legal/terms-employers', tl('terms-employers.title')],
        ['/legal/privacy', t('footer.privacy')],
        ['/legal/imprint', t('footer.imprint')],
      ],
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line-200 bg-surface-0 print:static">
        <div className="mx-auto flex h-16 max-w-content items-center gap-6 px-4 md:px-8">
          <Link href="/" aria-label={t('brand')} className="rounded-control">
            <KardiaLogo />
          </Link>
          <nav aria-label={t('nav.menu')} className="hidden flex-1 items-center gap-1 md:flex">
            {nav.map(([href, label]) => (
              <Link key={href} href={href} className="rounded-control px-3 py-2 text-body-s font-medium text-ink-700 hover:bg-surface-100 hover:text-ink-900">
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/search" className="rounded-control px-3 py-2 text-body-s text-ink-700 hover:bg-surface-100 md:hidden">
              {t('nav.search')}
            </Link>
            <Link href="/employers" className="hidden items-center gap-1 rounded-control px-3 py-2 text-body-s font-medium text-accent-600 hover:bg-accent-50 lg:inline-flex">
              {t('nav.postJobs')}
              <Icon icon={ArrowUpRight} size={16} />
            </Link>
            {session ? (
              <Button asChild size="s" variant="secondary">
                <Link href="/me">{session.user.name || session.user.email}</Link>
              </Button>
            ) : (
              <Button asChild size="s" variant="primary">
                <Link href="/sign-in">{t('nav.signIn')}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <InstallPrompt />
      <footer className="relative overflow-hidden bg-brand-950 text-brand-100 print:hidden">
        <ContourField className="absolute inset-0 size-full opacity-70" />
        <div className="relative mx-auto flex max-w-content flex-col gap-12 px-4 pt-16 md:px-8 md:pt-24">
          <div className="grid gap-8 md:grid-cols-[1.5fr_1fr] md:items-end">
            <h2 className="text-display-l text-brand-100">{t('footer.ctaTitle')}</h2>
            <div className="flex flex-col gap-5">
              <p className="text-body text-brand-300">{t('footer.ctaBody')}</p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/search"
                  className="inline-flex h-control-l items-center gap-2 rounded-control bg-pulse-500 px-6 text-body font-semibold text-brand-950 transition-colors hover:bg-brand-100"
                >
                  {t('footer.ctaButton')}
                  <Icon icon={ArrowUpRight} size={18} />
                </Link>
                <Link
                  href="/employers"
                  className="inline-flex h-control-l items-center rounded-control border border-brand-700 px-6 text-body font-medium text-brand-100 transition-colors hover:bg-brand-900"
                >
                  {t('footer.ctaEmployer')}
                </Link>
              </div>
            </div>
          </div>

          <PulseLine className="h-10 w-full text-pulse-500" peakAt={0.78} />

          <ul className="grid gap-4 text-body-s text-brand-300 sm:grid-cols-3">
            {(
              [
                [Building2, t('footer.facts.direct')],
                [Lock, t('footer.facts.eu')],
                [Percent, t('footer.facts.fees')],
              ] satisfies [LucideIcon, string][]
            ).map(([icon, label]) => (
              <li key={label} className="flex items-center gap-3 border-t border-brand-800 pt-4">
                <span className="inline-flex size-9 items-center justify-center rounded-control bg-brand-900 text-pulse-500">
                  <Icon icon={icon} size={18} />
                </span>
                {label}
              </li>
            ))}
          </ul>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <h3 className="text-caption font-semibold tracking-wider text-brand-300 uppercase">{col.title}</h3>
                <ul className="flex flex-col gap-2">
                  {col.links.map(([href, label]) => (
                    <li key={href}>
                      {href.startsWith('/api/') ? (
                        <a href={href} className="text-body-s text-brand-100 underline-offset-4 hover:text-pulse-500 hover:underline">
                          {label}
                        </a>
                      ) : (
                        <Link href={href} className="text-body-s text-brand-100 underline-offset-4 hover:text-pulse-500 hover:underline">
                          {label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="flex flex-col gap-4 border-t border-brand-800 pt-6 md:flex-row md:items-center md:justify-between">
            <p className="max-w-prose text-micro text-brand-300">{t('footer.claim')}</p>
            <Preferences theme={theme} inverse />
          </div>
        </div>

        <div aria-hidden className="relative mt-10 overflow-hidden px-2 md:px-6">
          <p className="k-wordmark text-brand-900 select-none">
            Kardia<span className="text-pulse-500">.</span>
          </p>
        </div>

        <div className="relative border-t border-brand-800">
          <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-3 px-4 py-5 text-micro text-brand-300 md:px-8">
            <span>
              {t('footer.rights', { year: new Date().getFullYear() })} · {t('footer.made')}
            </span>
            <a href="#main" className="inline-flex items-center gap-1 text-brand-100 hover:text-pulse-500">
              {t('footer.top')}
              <Icon icon={ArrowUp} size={14} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
