import { ArrowRight, Globe2, Landmark, Scale } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import { formatPlainDate, recognitionStepSchema } from '@kardia/core';
import { EmptyState, Icon } from '@kardia/ui';

import { BrandHero, SectionTitle } from '@/components/marketing/Marketing';
import { db } from '@/server/db';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('public.guide');
  return { title: t('title'), description: t('lead') };
}

/** Ratgeber Anerkennung (Modul H): redaktionell gepflegt, mit Prüfdatum, keine Rechtsberatung. */
export default async function GuideIndexPage() {
  const t = await getTranslations('public.guide');
  const e = await getTranslations('enums');
  const guides = await db.recognitionGuide.findMany({ orderBy: [{ targetProfession: 'asc' }, { originCountry: 'asc' }] });
  return (
    <>
      <BrandHero art="contour" size="m" eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />

      <section aria-labelledby="principles" className="border-b border-sand-200 bg-sand-100">
        <div className="mx-auto grid max-w-content gap-6 px-4 py-12 md:grid-cols-[1fr_2fr] md:px-8">
          <h2 id="principles" className="text-h2 text-ink-900">
            {t('principles')}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <p className="flex gap-3 border-t-2 border-ink-900 pt-4 text-body-s text-ink-700">
              <Icon icon={Scale} size={20} className="shrink-0 text-accent-600" />
              {t('disclaimer')}
            </p>
            <p className="flex gap-3 border-t-2 border-ink-900 pt-4 text-body-s text-ink-700">
              <Icon icon={Globe2} size={20} className="shrink-0 text-accent-600" />
              {t('who')}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="guides" className="mx-auto flex max-w-content flex-col gap-10 px-4 py-16 md:px-8 md:py-24">
        <SectionTitle id="guides" title={t('browseTitle')} />
        {guides.length === 0 ? <EmptyState>{t('empty')}</EmptyState> : null}
        <ul className="grid gap-6 md:grid-cols-2">
          {guides.map((g) => {
            const steps = z.array(recognitionStepSchema).catch([]).parse(g.steps);
            return (
              <li key={g.id}>
                <Link
                  href={`/guide/recognition/${g.id}`}
                  className="group flex h-full flex-col gap-6 rounded-card border border-line-200 bg-surface-0 p-7 transition-colors hover:border-accent-600"
                >
                  <div className="flex items-center gap-4">
                    <span className="inline-flex h-14 min-w-14 items-center justify-center rounded-control bg-brand-950 px-3 text-h2 font-semibold tracking-wide text-pulse-500">
                      {g.originCountry}
                    </span>
                    <Icon icon={ArrowRight} size={22} className="text-ink-500" />
                    <span className="text-h3 text-ink-900">{e(`Profession.${g.targetProfession}`)}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-4 border-t border-line-200 pt-5 text-body-s">
                    <div className="flex flex-col gap-1">
                      <dt className="text-micro text-ink-500">{t('authorityLabel')}</dt>
                      <dd className="flex items-center gap-1.5 font-medium text-ink-900">
                        <Icon icon={Landmark} size={14} className="text-accent-600" />
                        {g.authority}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-micro text-ink-500">{t('reviewedLabel')}</dt>
                      <dd className="font-medium text-ink-900 tabular">{formatPlainDate(g.reviewedAt)}</dd>
                    </div>
                  </dl>
                  <div className="mt-auto flex items-center justify-between text-body-s">
                    <span className="text-ink-700">{t('stepsCount', { count: steps.length })}</span>
                    <span className="inline-flex items-center gap-1 font-medium text-accent-600 group-hover:underline">
                      {t('open')}
                      <Icon icon={ArrowRight} size={16} />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
