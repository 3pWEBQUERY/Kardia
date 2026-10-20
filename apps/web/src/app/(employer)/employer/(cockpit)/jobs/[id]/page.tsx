import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import {
  formatDate,
  overriddenFields,
  resolveJobProfile,
  type OverridableField,
  type PartialWardProfile,
} from '@kardia/core';
import { Button, Callout, Card, CardBody, CardHeader, StatusChip, Tabs } from '@kardia/ui';

import { Roster } from '@/components/domain/Roster';
import { WardProfileView } from '@/components/domain/WardProfileView';
import { JobActions } from '@/components/employer/JobActions';
import { JobForm } from '@/components/employer/JobForm';
import { wardDefaultsFor } from '@/components/employer/wardDefaultsServer';
import { orNotFound } from '@/lib/orNotFound';
import { db } from '@/server/db';
import { getOrgJob } from '@/server/services/jobs';
import { realityAggregates } from '@/server/services/wards';
import { requireOrgPage } from '@/server/session';

/** Stelle: Blocker, Vorschau wie Fachpersonen sie sehen, Bearbeiten, Status. */
export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; paid?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await requireOrgPage();
  const { job, blockers } = await orNotFound(getOrgJob(ctx, id));
  const [t, te, tf, tb] = await Promise.all([
    getTranslations('employer.job'),
    getTranslations('enums'),
    getTranslations('fields'),
    getTranslations('errors.blockers'),
  ]);
  const profile = resolveJobProfile(job.ward as unknown as PartialWardProfile, job.overrides);
  const [reality, comments, applications] = await Promise.all([
    realityAggregates(job.wardId, job.ward as unknown as Record<string, unknown>),
    db.wardFieldComment.findMany({ where: { wardId: job.wardId } }),
    db.application.count({ where: { jobId: id } }),
  ]);
  const needsPayment = !ctx.org.plan && (!job.paidUntil || job.paidUntil < new Date());
  const ov = (job.overrides ?? {}) as Partial<Record<OverridableField, unknown>>;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-caption text-ink-700">
            <Link href={`/employer/wards/${job.wardId}`} className="hover:text-accent-700">
              {job.ward.name}
            </Link>{' '}
            · {job.ward.location.city}
          </p>
          <h1 className="text-h1">{job.title}</h1>
          <div className="flex flex-wrap gap-2">
            <StatusChip tone={job.status === 'PUBLISHED' ? 'ok' : 'neutral'}>
              {te(`JobStatus.${job.status}`)}
            </StatusChip>
            {job.publishedAt ? (
              <StatusChip>{t('publishedOn', { date: formatDate(job.publishedAt) })}</StatusChip>
            ) : null}
            {job.paidUntil ? (
              <StatusChip>{t('paidUntil', { date: formatDate(job.paidUntil) })}</StatusChip>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/employer/pipeline?job=${job.id}`}>
              {t('pipeline', { count: applications })}
            </Link>
          </Button>
          {job.status === 'PUBLISHED' ? (
            <Button asChild>
              <Link href={`/jobs/${job.id}`}>{t('publicView')}</Link>
            </Button>
          ) : null}
        </div>
      </header>
      {sp.created ? <Callout title={t('createdTitle')}>{t('created')}</Callout> : null}
      {sp.paid ? <Callout>{t('paid')}</Callout> : null}
      {blockers.length && job.status !== 'PUBLISHED' ? (
        <Callout tone="warn" title={t('blockersTitle')}>
          <ul className="list-disc pl-5">
            {blockers.map((b, i) => (
              <li key={i}>
                {b.kind === 'missingField'
                  ? tb('missingField', { field: tf(b.field) })
                  : tb(b.kind)}
              </li>
            ))}
          </ul>
        </Callout>
      ) : null}
      <JobActions
        jobId={job.id}
        status={job.status}
        canPublish={blockers.length === 0}
        needsPayment={needsPayment && job.status !== 'CLOSED'}
      />
      <Tabs
        label={t('tabs')}
        tabs={[
          {
            value: 'preview',
            label: t('tabPreview'),
            content: (
              <div className="flex flex-col gap-6">
                <p className="text-micro text-ink-500">{t('previewHint')}</p>
                <Card>
                  <CardHeader title={tf('rosterPattern')} />
                  <CardBody>
                    <Roster pattern={job.ward.rosterPattern} workloadPct={job.workloadMaxPct} />
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader title={t('profile')} />
                  <CardBody>
                    <WardProfileView
                      profile={profile}
                      confirmedAt={job.ward.confirmedAt}
                      reality={reality}
                      comments={comments}
                      overridden={overriddenFields(job.overrides)}
                      location={job.ward.location}
                    />
                  </CardBody>
                </Card>
              </div>
            ),
          },
          {
            value: 'edit',
            label: t('tabEdit'),
            content: (
              <div className="max-w-4xl">
                <JobForm
                  jobId={job.id}
                  wards={[{ id: job.wardId, label: job.ward.name }]}
                  wardDefaults={await wardDefaultsFor([job.ward])}
                  submitLabel={t('save')}
                  initial={{
                    wardId: job.wardId,
                    title: job.title,
                    profession: job.profession,
                    workloadMinPct: job.workloadMinPct,
                    workloadMaxPct: job.workloadMaxPct,
                    startDate: job.startDate ? job.startDate.toISOString().slice(0, 10) : null,
                    allowsPendingRecog: job.allowsPendingRecog,
                    overrides: ov,
                    specialtyTitle: job.specialtyTitle,
                    trainingCategory: job.trainingCategory,
                    maxCreditableYears: job.maxCreditableYears,
                    weeklyHours: job.weeklyHours,
                    structuredTrainingHoursWeek: job.structuredTrainingHoursWeek,
                    rotations: job.rotations,
                    assistantPositions: job.assistantPositions,
                  }}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
