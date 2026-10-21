import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button, EmptyState } from '@kardia/ui';

import { PageHeader } from '@/components/app/PageHeader';
import { JobPicker } from '@/components/employer/JobPicker';
import { PipelineBoard } from '@/components/employer/PipelineBoard';
import { pipelineForJob } from '@/server/services/applications';
import { listOrgJobs } from '@/server/services/jobs';
import { requireOrgPage } from '@/server/session';

/** Pipeline pro Stelle; ohne Auswahl die Stelle mit den meisten neuen Bewerbungen. */
export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const ctx = await requireOrgPage('applications.read');
  const { job: jobParam } = await searchParams;
  const t = await getTranslations('employer.pipeline');
  const te = await getTranslations('enums');
  const jobs = (await listOrgJobs(ctx.org.id)).filter((j) => j.status !== 'DRAFT');
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow={ctx.org.name} title={t('title')} description={t('lead')} />
        <EmptyState
          action={
            <Button asChild variant="primary">
              <Link href="/employer/jobs/new">{t('newJob')}</Link>
            </Button>
          }
        >
          {t('noJobs')}
        </EmptyState>
      </div>
    );
  }
  const jobId =
    jobParam && jobs.some((j) => j.id === jobParam)
      ? jobParam
      : ([...jobs].sort((a, b) => b._count.applications - a._count.applications)[0]?.id ?? '');
  const { job, applications } = await pipelineForJob(ctx, jobId);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={ctx.org.name}
        title={t('title')}
        description={`${job.title} · ${job.ward.name}`}
        actions={
          <JobPicker
            label={t('job')}
            current={jobId}
            jobs={jobs.map((j) => ({ id: j.id, label: `${j.title} (${j._count.applications})` }))}
          />
        }
        stats={[
          { label: te('ApplicationStatus.NEW'), value: applications.filter((a) => a.status === 'NEW').length },
          { label: t('stats.inProgress'), value: applications.filter((a) => ['SCREENED', 'INTERVIEW'].includes(a.status)).length },
          { label: te('ApplicationStatus.OFFER'), value: applications.filter((a) => a.status === 'OFFER').length },
          { label: te('ApplicationStatus.HIRED'), value: applications.filter((a) => a.status === 'HIRED').length },
        ]}
      />
      {applications.length === 0 ? (
        <EmptyState
          action={
            <Button asChild>
              <Link href="/employer/marketplace">{t('toMarketplace')}</Link>
            </Button>
          }
        >
          {t('noApplications')}
        </EmptyState>
      ) : null}
      <PipelineBoard
        cards={applications.map((a) => ({
          id: a.id,
          name: a.name,
          status: a.status,
          createdAt: a.createdAt.toISOString(),
          match: a.match,
          verifiedCount: a.verifiedCount,
          pendingCount: a.pendingCount,
          documentsShared: a.documentsShared,
        }))}
      />
    </div>
  );
}
