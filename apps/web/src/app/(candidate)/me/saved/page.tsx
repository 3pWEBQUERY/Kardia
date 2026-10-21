import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { decodeFilter, encodeFilter, formatChfRange, searchFilterSchema } from '@kardia/core';
import { Button, Card, CardBody, CardHeader, EmptyState, StatusChip } from '@kardia/ui';

import { PageHeader, RowLink } from '@/components/app/PageHeader';
import { DEPARTMENT_ICONS } from '@/components/brand/departmentIcons';
import { SavedSearchRow } from '@/components/candidate/SavedSearchRow';
import { db } from '@/server/db';
import { requireUser } from '@/server/session';

/** Merkliste & Vergleich, gespeicherte Suchen – Merkliste offline lesbar (PRD 13.2). */
export default async function SavedPage() {
  const s = await requireUser('/me/saved');
  const [t, e, cs, tm] = await Promise.all([getTranslations('candidate.saved'), getTranslations('enums'), getTranslations('common.search'), getTranslations('candidate.overview')]);
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
      <PageHeader
        eyebrow={tm('eyebrow')}
        title={t('title')}
        description={t('lead')}
        actions={
          compareIds.length >= 2 ? (
            <Button asChild variant="primary">
              <Link href={`/compare?ids=${compareIds.join(',')}`}>{t('compare', { count: compareIds.length })}</Link>
            </Button>
          ) : null
        }
        stats={[
          { label: t('jobs'), value: saved.length },
          { label: t('searches'), value: candidate?.savedSearches.length ?? 0 },
        ]}
      />
      <Card>
        <CardHeader title={t('jobs')} />
        <CardBody className="flex flex-col gap-2">
          {saved.length === 0 ? <EmptyState action={<Button asChild><Link href="/search">{t('toSearch')}</Link></Button>}>{t('emptyJobs')}</EmptyState> : null}
          {saved.map(({ job }) => (
            <RowLink
              key={job.id}
              href={`/jobs/${job.id}`}
              icon={DEPARTMENT_ICONS[job.ward.department]}
              title={job.title}
              meta={
                <>
                  <span>{job.ward.location.organization.name}</span>
                  <span aria-hidden>·</span>
                  <span>{job.ward.location.city}</span>
                  <span aria-hidden>·</span>
                  <span className="tabular">{formatChfRange(job.ward.salaryMinChf, job.ward.salaryMaxChf)}</span>
                </>
              }
              aside={job.status !== 'PUBLISHED' ? <StatusChip tone="warn">{e(`JobStatus.${job.status}`)}</StatusChip> : null}
            />
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
            return <SavedSearchRow key={ss.id} id={ss.id} name={ss.name} href={href} frequency={e(`AlertFrequency.${ss.frequency}`)} channel={cs(`channels.${ss.channel}`)} />;
          })}
        </CardBody>
      </Card>
    </div>
  );
}
