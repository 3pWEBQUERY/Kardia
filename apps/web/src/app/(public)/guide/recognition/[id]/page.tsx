import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { formatPlainDate, guideNeedsReview, recognitionStepSchema } from '@kardia/core';
import { Callout, Card, CardBody, CardHeader } from '@kardia/ui';
import { z } from 'zod';

import { RecognitionChecklist } from '@/components/domain/RecognitionChecklist';
import { db } from '@/server/db';
import { getSession } from '@/server/session';

export default async function GuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guide = await db.recognitionGuide.findUnique({ where: { id } });
  if (!guide) notFound();
  const t = await getTranslations('public.guide');
  const e = await getTranslations('enums');
  const steps = z.array(recognitionStepSchema).catch([]).parse(guide.steps);
  const session = await getSession();
  const candidate = session ? await db.candidateProfile.findUnique({ where: { userId: session.user.id }, include: { recognition: { where: { guideId: id } } } }) : null;
  const done = candidate?.recognition[0]?.completedSteps ?? [];
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{t('route', { origin: guide.originCountry, profession: e(`Profession.${guide.targetProfession}`) })}</h1>
        <p className="text-micro text-ink-500">{t('authority', { authority: guide.authority, date: formatPlainDate(guide.reviewedAt) })}</p>
      </header>
      {guideNeedsReview(guide.reviewedAt) ? <Callout tone="warn">{t('outdated')}</Callout> : null}
      <Callout>{t('disclaimer')}</Callout>
      <Card>
        <CardHeader title={t('steps')} meta={candidate ? t('progress', { done: done.length, total: steps.length }) : t('signInForProgress')} />
        <CardBody>
          <RecognitionChecklist guideId={id} steps={steps} done={done} canTrack={!!candidate} />
        </CardBody>
      </Card>
    </div>
  );
}
