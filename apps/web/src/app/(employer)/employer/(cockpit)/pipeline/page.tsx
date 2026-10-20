import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button, EmptyState } from '@kardia/ui';

import { JobPicker } from '@/components/employer/JobPicker';
import { PipelineBoard } from '@/components/employer/PipelineBoard';
import { pipelineForJob } from '@/server/services/applications';
import { listOrgJobs } from '@/server/services/jobs';
import { requireOrg } from '@/server/session';

/** Pipeline pro Stelle; ohne Auswahl die Stelle mit den meisten neuen Bewerbungen. */
export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const ctx = await requireOrg('applications.read');
  const { job: jobParam } = await searchParams;
  const t = await getTranslations('employer.pipeline');
  const jobs = (await listOrgJobs(ctx.org.id)).filter((j) => j.status !== 'DRAFT');
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h1">{t('title')}</h1>
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body-s text-ink-700">
            {job.title} · {job.ward.name}
          </p>
        </div>
        <JobPicker
          label={t('job')}
          current={jobId}
          jobs={jobs.map((j) => ({ id: j.id, label: `${j.title} (${j._count.applications})` }))}
        />
      </div>
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
