import { ArrowLeft, Info, Landmark } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import { formatPlainDate, guideNeedsReview, recognitionStepSchema } from '@kardia/core';
import { Callout, Icon } from '@kardia/ui';

import { RecognitionChecklist } from '@/components/domain/RecognitionChecklist';
import { TitleBand } from '@/components/marketing/Marketing';
import { db } from '@/server/db';
import { getSession } from '@/server/session';

import type { Metadata } from 'next';

async function load(id: string) {
  return db.recognitionGuide.findUnique({ where: { id } });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const guide = await load((await params).id);
  if (!guide) return {};
  const t = await getTranslations('public.guide');
  const e = await getTranslations('enums');
  return { title: t('route', { origin: guide.originCountry, profession: e(`Profession.${guide.targetProfession}`) }) };
}

/** Anleitung als Zeitachse mit Unterlagen; Fortschritt für angemeldete Fachpersonen. */
export default async function GuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guide = await load(id);
  if (!guide) notFound();
  const t = await getTranslations('public.guide');
  const e = await getTranslations('enums');
  const steps = z.array(recognitionStepSchema).catch([]).parse(guide.steps);
  const session = await getSession();
  const candidate = session ? await db.candidateProfile.findUnique({ where: { userId: session.user.id }, include: { recognition: { where: { guideId: id } } } }) : null;
  const done = candidate?.recognition[0]?.completedSteps ?? [];
  const pct = steps.length ? Math.round((done.length / steps.length) * 100) : 0;
  return (
    <>
      <TitleBand
        eyebrow={t('eyebrow')}
        title={t('route', { origin: guide.originCountry, profession: e(`Profession.${guide.targetProfession}`) })}
        lead={t('stepsCount', { count: steps.length })}
      >
        <Link href="/guide/recognition" className="inline-flex w-fit items-center gap-1 text-body-s font-medium text-accent-600 hover:underline">
          <Icon icon={ArrowLeft} size={16} />
          {t('back')}
        </Link>
      </TitleBand>

      <div className="mx-auto grid max-w-content gap-10 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="steps" className="flex flex-col gap-6">
          <h2 id="steps" className="text-h2 text-ink-900">
            {t('steps')}
          </h2>
          {guideNeedsReview(guide.reviewedAt) ? <Callout tone="warn">{t('outdated')}</Callout> : null}
          <RecognitionChecklist guideId={id} steps={steps} done={done} canTrack={!!candidate} />
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-5 rounded-card bg-brand-950 p-6 text-brand-100">
            <div className="flex flex-col gap-1">
              <span className="text-micro text-brand-300">{t('authorityLabel')}</span>
              <span className="flex items-center gap-2 text-h3">
                <Icon icon={Landmark} size={18} className="text-pulse-500" />
                {guide.authority}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-micro text-brand-300">{t('reviewedLabel')}</span>
              <span className="text-body font-medium tabular">{formatPlainDate(guide.reviewedAt)}</span>
            </div>
            <div className="flex flex-col gap-2 border-t border-brand-800 pt-4">
              {candidate ? (
                <>
                  <span className="text-body-s text-brand-100">{t('progress', { done: done.length, total: steps.length })}</span>
                  <span className="h-2 overflow-hidden rounded-chip bg-brand-800" aria-hidden>
                    <span className="block h-full bg-pulse-500" style={{ width: `${pct}%` }} />
                  </span>
                </>
              ) : (
                <Link href={`/sign-in?next=/guide/recognition/${id}`} className="text-body-s text-brand-100 underline underline-offset-4 hover:text-pulse-500">
                  {t('signInForProgress')}
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-card border border-sand-200 bg-sand-100 p-6">
            <span className="flex items-center gap-2 text-body-s font-semibold text-ink-900">
              <Icon icon={Info} size={16} className="text-accent-600" />
              {t('infoTitle')}
            </span>
            <p className="text-body-s text-ink-700">{t('disclaimer')}</p>
            <p className="text-body-s text-ink-700">{t('who')}</p>
          </div>
        </aside>
      </div>
    </>
  );
}
