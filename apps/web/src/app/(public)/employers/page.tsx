import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button } from '@kardia/ui';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('public.employers');
  return { title: t('title') };
}

const POINTS = ['direct', 'import', 'pipeline', 'pool', 'marketplace', 'benchmark'] as const;

/** Für Arbeitgeber: Inserat in 10 Minuten, direkt besetzen statt Agenturaufschlag. */
export default async function EmployersPage() {
  const t = await getTranslations('public.employers');
  return (
    <div className="mx-auto flex max-w-content flex-col gap-12 px-4 py-12 md:px-8">
      <section className="flex max-w-3xl flex-col gap-4">
        <h1 className="text-h1 md:text-display">{t('title')}</h1>
        <p className="text-body text-ink-700">{t('lead')}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="primary" size="l"><Link href="/employer/onboarding">{t('cta')}</Link></Button>
          <Button asChild size="l"><Link href="/pricing">{t('pricing')}</Link></Button>
        </div>
      </section>
      <section className="grid gap-6 md:grid-cols-3">
        {POINTS.map((p) => (
          <div key={p} className="flex flex-col gap-2 border-t border-line-300 pt-4">
            <h2 className="text-h3">{t(`points.${p}.title`)}</h2>
            <p className="text-body-s text-ink-700">{t(`points.${p}.body`)}</p>
          </div>
        ))}
      </section>
      <section className="flex max-w-3xl flex-col gap-3 rounded-card border border-line-300 bg-surface-0 p-6">
        <h2 className="text-h2">{t('agencyTitle')}</h2>
        <p className="text-body-s text-ink-700">{t('agencyBody')}</p>
      </section>
      <section className="flex max-w-3xl flex-col gap-3">
        <h2 className="text-h2">{t('foundingTitle')}</h2>
        <p className="text-body-s text-ink-700">{t('foundingBody')}</p>
      </section>
    </div>
  );
}
