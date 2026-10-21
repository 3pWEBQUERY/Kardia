import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Icon } from '@kardia/ui';

import { AlpineBand, ContourField } from './Artwork.tsx';
import { KardiaLogo } from './KardiaLogo.tsx';

/** Vollflächige Status-Seite (404/403) in der Markengestaltung: Code, ein Satz, zwei Wege. */
export async function StatusPage({ code, title, body }: { code: string; title: string; body: string }) {
  const t = await getTranslations('errors.pages');
  return (
    <main id="main" className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-brand-950 text-brand-100">
      <ContourField className="absolute inset-0 -z-10 size-full" />
      <AlpineBand className="absolute inset-x-0 bottom-0 -z-10 h-[clamp(200px,32vw,420px)] w-full" />
      <div className="mx-auto flex w-full max-w-content flex-1 flex-col px-4 py-8 md:px-8">
        <Link href="/" className="w-fit rounded-control">
          <KardiaLogo inverse />
        </Link>
        <div className="flex max-w-2xl flex-1 flex-col justify-center gap-6 pb-[clamp(160px,24vw,320px)] pt-16">
          <p className="text-micro font-semibold tracking-widest text-pulse-500 tabular">{code}</p>
          <h1 className="text-display-l">{title}</h1>
          <p className="text-body text-brand-300">{body}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/search"
              className="inline-flex h-control-l items-center gap-2 rounded-control bg-pulse-500 px-6 text-body font-semibold text-brand-950 transition-colors hover:bg-brand-100"
            >
              {t('search')}
              <Icon icon={ArrowRight} size={18} />
            </Link>
            <Link
              href="/"
              className="inline-flex h-control-l items-center rounded-control border border-brand-700 px-6 text-body font-medium text-brand-100 transition-colors hover:bg-brand-900"
            >
              {t('home')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
