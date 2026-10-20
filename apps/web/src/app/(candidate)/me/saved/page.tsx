import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { decodeFilter, encodeFilter, formatChfRange, searchFilterSchema } from '@kardia/core';
import { Button, Card, CardBody, CardHeader, EmptyState } from '@kardia/ui';

import { SavedSearchRow } from '@/components/candidate/SavedSearchRow';
import { db } from '@/server/db';
import { requireUser } from '@/server/session';

/** Merkliste & Vergleich, gespeicherte Suchen – Merkliste offline lesbar (PRD 13.2). */
export default async function SavedPage() {
  const s = await requireUser('/me/saved');
  const [t, e] = await Promise.all([getTranslations('candidate.saved'), getTranslations('enums')]);
  const candidate = await db.candidateProfile.findUnique({
    where: { userId: s.user.id },
    include: {
      savedJobs: { include: { job: { include: { ward: { include: { location: { include: { organization: { select: { name: true } } } } } } } } }, orderBy: { createdAt: 'desc' } },
      savedSearches: true,
    },
  });
  const saved = candidate?.savedJobs ?? [];
  const compareIds = saved.filter((x) => x.job.status === 'PUBLISHED').slice(0, 4).map((x) => x.jobId);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">{t('title')}</h1>
      <Card>
        <CardHeader
          title={t('jobs')}
          actions={compareIds.length >= 2 ? <Button asChild size="s" variant="primary"><Link href={`/compare?ids=${compareIds.join(',')}`}>{t('compare', { count: compareIds.length })}</Link></Button> : null}
        />
        <CardBody className="flex flex-col gap-2">
          {saved.length === 0 ? <EmptyState action={<Button asChild><Link href="/search">{t('toSearch')}</Link></Button>}>{t('emptyJobs')}</EmptyState> : null}
          {saved.map(({ job }) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="flex flex-col gap-0.5 border-b border-line-200 py-2 last:border-0">
              <span className="text-body-s font-medium">{job.title}{job.status !== 'PUBLISHED' ? ` · ${e(`JobStatus.${job.status}`)}` : ''}</span>
              <span className="text-micro text-ink-500 tabular">
                {job.ward.location.organization.name} · {job.ward.name} · {job.ward.location.city} · {formatChfRange(job.ward.salaryMinChf, job.ward.salaryMaxChf)}
              </span>
            </Link>
          ))}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t('searches')} meta={t('searchesHint')} />
        <CardBody className="flex flex-col gap-2">
          {(candidate?.savedSearches.length ?? 0) === 0 ? <EmptyState action={<Button asChild><Link href="/search">{t('toSearch')}</Link></Button>}>{t('emptySearches')}</EmptyState> : null}
          {candidate?.savedSearches.map((ss) => {
            const parsed = searchFilterSchema.safeParse(ss.filters);
            const href = `/search?f=${encodeFilter(parsed.success ? parsed.data : decodeFilter(null))}`;
            return <SavedSearchRow key={ss.id} id={ss.id} name={ss.name} href={href} frequency={e(`AlertFrequency.${ss.frequency}`)} />;
          })}
        </CardBody>
      </Card>
    </div>
  );
}
