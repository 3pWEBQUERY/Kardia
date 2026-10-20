import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { SPECIALTY_TITLES, trainingGap, yearsClosedByJob } from '@kardia/core';
import { Card, CardBody, CardHeader, EmptyState } from '@kardia/ui';

import { TrainingForm } from '@/components/candidate/TrainingForm';
import { db } from '@/server/db';
import { requireCandidate } from '@/server/session';

/** "Was fehlt mir noch?" (Modul F): absolvierte Jahre je Bereich → Stellen, die die Lücke schliessen. */
export default async function TrainingPage({ searchParams }: { searchParams: Promise<{ title?: string }> }) {
  const sp = await searchParams;
  const { candidate } = await requireCandidate('/me/training');
  const t = await getTranslations('candidate.training');
  const progress = await db.trainingProgress.findMany({ where: { candidateId: candidate.id } });
  const titleName = sp.title ?? progress[0]?.specialtyTitle ?? SPECIALTY_TITLES[0]?.name ?? '';
  const gap = trainingGap(titleName, progress);
  const jobs = gap
    ? await db.job.findMany({
        where: { status: 'PUBLISHED', profession: 'PHYSICIAN', specialtyTitle: gap.title.name, trainingCategory: { not: null } },
        include: { ward: { include: { location: { include: { organization: { select: { name: true } } } } } } },
      })
    : [];
  const ranked = gap ? jobs.map((j) => ({ j, years: yearsClosedByJob(gap, j) })).filter((x) => x.years > 0).sort((a, b) => b.years - a.years) : [];
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-s text-ink-700">{t('lead')}</p>
      </header>
      <Card>
        <CardHeader title={t('progress')} />
        <CardBody>
          <TrainingForm titles={SPECIALTY_TITLES.map((x) => ({ name: x.name, areas: x.areas }))} selected={titleName} rows={progress.map((p) => ({ specialtyTitle: p.specialtyTitle, area: p.area, yearsCompleted: p.yearsCompleted }))} />
        </CardBody>
      </Card>
      {gap ? (
        <Card>
          <CardHeader title={t('gap', { years: gap.remainingYears })} meta={gap.remainingByArea.filter((a) => a.years > 0).map((a) => `${a.name}: ${a.years}`).join(' · ')} />
          <CardBody className="flex flex-col gap-2">
            {ranked.length === 0 ? <EmptyState>{t('noJobs')}</EmptyState> : null}
            {ranked.map(({ j, years }) => (
              <Link key={j.id} href={`/jobs/${j.id}`} className="flex flex-col border-b border-line-200 py-2 last:border-0">
                <span className="text-body-s font-medium">{j.title}</span>
                <span className="text-micro text-ink-500">{j.ward.location.organization.name} · {t('category', { category: j.trainingCategory ?? '' })} · {t('closes', { years })}</span>
              </Link>
            ))}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
