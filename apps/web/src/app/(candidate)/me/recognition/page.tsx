import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import { recognitionStepSchema } from '@kardia/core';
import { Card, CardBody, EmptyState } from '@kardia/ui';

import { PageHeader } from '@/components/app/PageHeader';
import { db } from '@/server/db';
import { requireUser } from '@/server/session';

/** Eigener Fortschritt im Anerkennungs-Tracker (Modul H). */
export default async function MyRecognitionPage() {
  const s = await requireUser('/me/recognition');
  const [t, e, tm] = await Promise.all([getTranslations('candidate.recognition'), getTranslations('enums'), getTranslations('candidate.overview')]);
  const candidate = await db.candidateProfile.findUnique({ where: { userId: s.user.id }, include: { recognition: true } });
  const guides = await db.recognitionGuide.findMany({ orderBy: { targetProfession: 'asc' } });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={tm('eyebrow')} title={t('title')} description={t('lead')} />
      {guides.length === 0 ? <EmptyState>{t('empty')}</EmptyState> : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {guides.map((g) => {
          const steps = z.array(recognitionStepSchema).catch([]).parse(g.steps);
          const done = candidate?.recognition.find((r) => r.guideId === g.id)?.completedSteps.length ?? 0;
          return (
            <li key={g.id}>
              <Card>
                <CardBody>
                  <Link href={`/guide/recognition/${g.id}`} className="flex flex-col gap-1">
                    <span className="text-h3">{g.originCountry} → {e(`Profession.${g.targetProfession}`)}</span>
                    <span className="text-micro text-ink-500">{t('progress', { done, total: steps.length })}</span>
                  </Link>
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
