import { Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { formatDate } from '@kardia/core';
import { Button, EmptyState, Icon, StatusChip, type Tone } from '@kardia/ui';

import { PageHeader, RowLink } from '@/components/app/PageHeader';
import { DEPARTMENT_ICONS } from '@/components/brand/departmentIcons';
import { listOrgJobs } from '@/server/services/jobs';
import { requireOrgPage } from '@/server/session';

const STATUSES = ['PUBLISHED', 'DRAFT', 'PAUSED', 'CLOSED'] as const;
type JobStatus = (typeof STATUSES)[number];

/** Entwurf in Arbeit (accent), veröffentlicht (ok), pausiert (warn), geschlossen (neutral). */
const TONE: Record<JobStatus, Tone> = {
  DRAFT: 'accent',
  PUBLISHED: 'ok',
  PAUSED: 'warn',
  CLOSED: 'neutral',
};

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = await requireOrgPage();
  const { status } = await searchParams;
  const t = await getTranslations('employer.jobs');
  const te = await getTranslations('enums');
  const all = await listOrgJobs(ctx.org.id);
  const active = (STATUSES as readonly string[]).includes(status ?? '') ? (status as JobStatus) : undefined;
  const jobs = active ? all.filter((j) => j.status === active) : all;
  const count = (s: JobStatus) => all.filter((j) => j.status === s).length;
  const applications = all.reduce((n, j) => n + j._count.applications, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={ctx.org.name}
        title={t('title')}
        description={t('lead')}
        actions={
          <Button asChild variant="primary">
            <Link href="/employer/jobs/new">
              <Icon icon={Plus} size={18} />
              {t('new')}
            </Link>
          </Button>
        }
        stats={[
          { label: te('JobStatus.PUBLISHED'), value: count('PUBLISHED') },
          { label: te('JobStatus.DRAFT'), value: count('DRAFT') },
          { label: te('JobStatus.PAUSED'), value: count('PAUSED') },
          { label: t('colApplications'), value: applications },
        ]}
      />
      <nav aria-label={t('filter')} className="flex flex-wrap gap-1.5">
        {(['', ...STATUSES] as const).map((s) => (
          <Link
            key={s || 'all'}
            href={s ? `/employer/jobs?status=${s}` : '/employer/jobs'}
            aria-current={(active ?? '') === s ? 'page' : undefined}
            className="inline-flex h-9 items-center gap-2 rounded-chip border border-line-300 bg-surface-0 px-3.5 text-caption text-ink-700 transition-colors hover:border-accent-600 aria-[current=page]:border-accent-600 aria-[current=page]:bg-accent-50 aria-[current=page]:text-accent-700 pointer-coarse:h-touch"
          >
            {s ? te(`JobStatus.${s}`) : t('all')}
            <span className="rounded-chip bg-surface-100 px-1.5 text-micro text-ink-700 tabular">{s ? count(s) : all.length}</span>
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
        <ul className="flex flex-col gap-2" aria-label={t('title')}>
          {jobs.map((j) => (
            <li key={j.id}>
              <RowLink
                href={`/employer/jobs/${j.id}`}
                icon={DEPARTMENT_ICONS[j.ward.department]}
                title={j.title}
                meta={
                  <>
                    <span>{j.ward.name}</span>
                    <span aria-hidden>·</span>
                    <span className="tabular">{t('updated', { date: formatDate(j.updatedAt) })}</span>
                  </>
                }
                aside={
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-chip bg-surface-100 px-2.5 py-1 text-caption text-ink-900 tabular" title={t('colApplications')}>
                      <Icon icon={Users} size={14} />
                      {j._count.applications}
                    </span>
                    <StatusChip tone={TONE[j.status]}>{te(`JobStatus.${j.status}`)}</StatusChip>
                  </>
                }
              >
                <span className="flex items-center gap-2 sm:hidden">
                  <StatusChip tone={TONE[j.status]}>{te(`JobStatus.${j.status}`)}</StatusChip>
                  <span className="text-micro text-ink-500 tabular">{t('applicants', { count: j._count.applications })}</span>
                </span>
              </RowLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
