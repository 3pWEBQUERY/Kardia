import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { formatDate } from '@kardia/core';
import { Card, CardBody, CardHeader, EmptyState } from '@kardia/ui';

import { PageHeader } from '@/components/app/PageHeader';
import { AnswerQuestion } from '@/components/candidate/AnswerQuestion';
import { db } from '@/server/db';
import { openQuestionsForAmbassador } from '@/server/services/team';
import { requireUser } from '@/server/session';

/** Meine Station: Realitäts-Check und offene Fragen für Stations-Botschafter:innen. */
export default async function MyTeamPage() {
  const s = await requireUser('/me/team');
  const t = await getTranslations('candidate.team');
  const tm = await getTranslations('candidate.overview');
  const [wards, questions] = await Promise.all([
    db.verifiedEmployee.findMany({ where: { userId: s.user.id }, include: { ward: { include: { location: { include: { organization: { select: { name: true } } } } } } } }),
    openQuestionsForAmbassador(s.user.id),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={tm('eyebrow')}
        title={t('title')}
        description={t('lead')}
        stats={[
          { label: t('wards'), value: wards.length },
          { label: t('stats.openQuestions'), value: questions.length },
        ]}
      />
      <Card>
        <CardHeader title={t('wards')} />
        <CardBody className="flex flex-col gap-2">
          {wards.length === 0 ? <EmptyState>{t('noWards')}</EmptyState> : null}
          {wards.map((w) => (
            <Link key={w.id} href={`/wards/${w.wardId}/team`} className="flex flex-col border-b border-line-200 py-2 last:border-0">
              <span className="text-body-s font-medium">{w.ward.name}</span>
              <span className="text-micro text-ink-500">{w.ward.location.organization.name} · {t('verifiedSince', { date: formatDate(w.verifiedAt) })}</span>
            </Link>
          ))}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t('questions')} meta={t('questionsHint')} />
        <CardBody className="flex flex-col gap-4">
          {questions.length === 0 ? <EmptyState>{t('noQuestions')}</EmptyState> : null}
          {questions.map((q) => (
            <AnswerQuestion key={q.id} id={q.id} ward={q.ward.name} body={q.body} />
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
