import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { formatDate } from '@kardia/core';
import { Button, EmptyState, StatusChip, type Tone } from '@kardia/ui';

import { listOrgJobs } from '@/server/services/jobs';
import { requireOrg } from '@/server/session';

const TONE: Record<string, Tone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'ok',
  PAUSED: 'warn',
  CLOSED: 'neutral',
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const ctx = await requireOrg();
  const { status } = await searchParams;
  const t = await getTranslations('employer.jobs');
  const te = await getTranslations('enums');
  const jobs = await listOrgJobs(
    ctx.org.id,
    status && ['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED'].includes(status) ? status : undefined,
  );
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1">{t('title')}</h1>
        <Button asChild variant="primary">
          <Link href="/employer/jobs/new">{t('new')}</Link>
        </Button>
      </div>
      <nav aria-label={t('filter')} className="flex flex-wrap gap-1.5">
        {['', 'PUBLISHED', 'DRAFT', 'PAUSED', 'CLOSED'].map((s) => (
          <Link
            key={s || 'all'}
            href={s ? `/employer/jobs?status=${s}` : '/employer/jobs'}
            aria-current={(status ?? '') === s ? 'page' : undefined}
            className="inline-flex h-8 items-center rounded-chip border border-line-300 px-3 text-caption text-ink-700 aria-[current=page]:border-accent-600 aria-[current=page]:bg-accent-50 aria-[current=page]:text-accent-700 pointer-coarse:h-touch"
          >
            {s ? te(`JobStatus.${s}`) : t('all')}
          </Link>
        ))}
      </nav>
      {jobs.length === 0 ? (
        <EmptyState
          action={
            <Button asChild variant="primary">
              <Link href="/employer/jobs/new">{t('new')}</Link>
            </Button>
          }
        >
          {t('empty')}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto border border-line-300 bg-surface-0">
          <table className="w-full border-collapse text-body-s">
            <caption className="sr-only">{t('title')}</caption>
            <thead>
              <tr className="bg-surface-100 text-left text-caption text-ink-700">
                <th scope="col" className="h-row px-3">
                  {t('colTitle')}
                </th>
                <th scope="col" className="px-3">
                  {t('colWard')}
                </th>
                <th scope="col" className="px-3">
                  {t('colStatus')}
                </th>
                <th scope="col" className="px-3 text-right">
                  {t('colApplications')}
                </th>
                <th scope="col" className="px-3">
                  {t('colUpdated')}
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="h-row border-t border-line-200 hover:bg-surface-50">
                  <td className="px-3">
                    <Link
                      href={`/employer/jobs/${j.id}`}
                      className="font-medium hover:text-accent-700"
                    >
                      {j.title}
                    </Link>
                  </td>
                  <td className="px-3 text-ink-700">{j.ward.name}</td>
                  <td className="px-3">
                    <StatusChip tone={TONE[j.status] ?? 'neutral'}>
                      {te(`JobStatus.${j.status}`)}
                    </StatusChip>
                  </td>
                  <td className="px-3 text-right tabular">
                    <Link href={`/employer/pipeline?job=${j.id}`} className="hover:text-accent-700">
                      {j._count.applications}
                    </Link>
                  </td>
                  <td className="px-3 text-ink-700 tabular">{formatDate(j.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
