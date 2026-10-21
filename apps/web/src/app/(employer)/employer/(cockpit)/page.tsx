import { ArrowRight, BriefcaseBusiness, CircleCheck, Clock, Inbox, MessageSquareReply, Plus } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { EVENTS, businessDaysBetween, daysUntilStale, formatNumber, formatPct } from '@kardia/core';
import { Button, Callout, Card, CardBody, CardHeader, EmptyState, Icon, StatusChip, cx } from '@kardia/ui';

import { ContourField } from '@/components/brand/Artwork';
import { ConfirmWardButton } from '@/components/employer/ConfirmWardButton';
import { db } from '@/server/db';
import { blockersFor } from '@/server/services/jobs';
import { requireOrgPage } from '@/server/session';

/** Übersicht: Kennzahlen der Organisation, veraltete Profile (AK-A3), Blocker, Prüfstatus (AK-C1). */
export default async function EmployerOverview() {
  const ctx = await requireOrgPage();
  const t = await getTranslations('employer.overview');
  const e = await getTranslations('enums');
  const now = new Date();
  const orgWhere = { ward: { location: { organizationId: ctx.org.id } } };

  const [openJobs, newApps, apps, wards, drafts, hired, byStatus] = await Promise.all([
    db.job.count({ where: { ...orgWhere, status: 'PUBLISHED' } }),
    db.application.count({ where: { status: 'NEW', job: orgWhere } }),
    db.application.findMany({ where: { job: orgWhere }, select: { id: true, createdAt: true } }),
    db.ward.findMany({
      where: { location: { organizationId: ctx.org.id } },
      select: { id: true, name: true, confirmedAt: true },
      orderBy: { confirmedAt: 'asc' },
    }),
    db.job.findMany({
      where: { ...orgWhere, status: 'DRAFT' },
      select: { id: true, title: true },
      take: 20,
    }),
    db.application.findMany({
      where: { status: 'HIRED', job: orgWhere },
      select: { statusChangedAt: true, job: { select: { publishedAt: true } } },
    }),
    db.application.groupBy({ by: ['status'], where: { job: orgWhere }, _count: { _all: true } }),
  ]);

  const firstChanges = apps.length
    ? await db.event.groupBy({
        by: ['entityId'],
        where: { name: EVENTS.applicationStatusChanged, orgId: ctx.org.id },
        _min: { createdAt: true },
      })
    : [];
  const due = apps.filter((a) => businessDaysBetween(a.createdAt, now) >= 5);
  const answered = due.filter((a) => {
    const first = firstChanges.find((f) => f.entityId === a.id)?._min.createdAt;
    return first ? businessDaysBetween(a.createdAt, first) <= 5 : false;
  });
  const responseRate = due.length ? answered.length / due.length : null;
  const tth = hired
    .filter((h) => h.job.publishedAt)
    .map((h) => (h.statusChangedAt.getTime() - (h.job.publishedAt?.getTime() ?? 0)) / 86400_000);
  const avgTth = tth.length ? tth.reduce((s, x) => s + x, 0) / tth.length : null;

  const attention = wards.filter((w) => daysUntilStale(w.confirmedAt, now) <= 14);
  const blocked = (
    await Promise.all(drafts.map(async (d) => ({ ...d, blockers: await blockersFor(ctx, d.id) })))
  ).filter((d) => d.blockers.length);

  const stages = (['NEW', 'SCREENED', 'INTERVIEW', 'OFFER', 'HIRED'] as const).map((status) => ({
    status,
    count: byStatus.find((b) => b.status === status)?._count._all ?? 0,
  }));
  const pipelineTotal = stages.reduce((sum, x) => sum + x.count, 0);
  const stageColor: Record<(typeof stages)[number]['status'], string> = {
    NEW: 'bg-pulse-500',
    SCREENED: 'bg-accent-600',
    INTERVIEW: 'bg-brand-700',
    OFFER: 'bg-brand-500',
    HIRED: 'bg-ok-600',
  };
  const kpis = [
    { label: t('openJobs'), value: formatNumber(openJobs), icon: BriefcaseBusiness, hint: null },
    { label: t('newApplications'), value: formatNumber(newApps), icon: Inbox, hint: null },
    { label: t('responseRate'), value: responseRate == null ? t('none') : formatPct(Math.round(responseRate * 100)), icon: MessageSquareReply, hint: t('responseRateHint') },
    { label: t('timeToHire'), value: avgTth == null ? t('none') : t('days', { value: formatNumber(Math.round(avgTth)) }), icon: Clock, hint: t('timeToHireHint') },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="relative isolate overflow-hidden rounded-card bg-brand-950 px-6 py-8 md:px-10 md:py-10">
        <ContourField className="absolute inset-y-0 right-0 -z-10 h-full w-full opacity-80 md:w-2/3" />
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 text-caption font-semibold tracking-wider text-brand-300 uppercase">
              <span className="size-2 rounded-full bg-pulse-500" aria-hidden />
              {t('eyebrow')} · {ctx.org.name}
            </span>
            <h1 className="text-display text-brand-100">{t('title')}</h1>
            <p className="text-body text-brand-300">{t('welcome', { org: ctx.org.name })}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/employer/jobs/new"
              className="inline-flex h-control-l items-center gap-2 rounded-control bg-pulse-500 px-5 text-body font-semibold text-brand-950 transition-colors hover:bg-brand-100"
            >
              <Icon icon={Plus} size={18} />
              {t('newJob')}
            </Link>
            <Link
              href="/employer/wards/new"
              className="inline-flex h-control-l items-center rounded-control border border-brand-700 px-5 text-body font-medium text-brand-100 transition-colors hover:bg-brand-900"
            >
              {t('newWard')}
            </Link>
          </div>
        </div>
      </section>

      {ctx.org.verification === 'PENDING' ? <Callout>{t('pending')}</Callout> : null}
      {ctx.org.verification === 'AGENCY_REVIEW' ? <Callout tone="warn">{t('agencyReview')}</Callout> : null}
      {ctx.org.verification === 'REJECTED' ? <Callout tone="critical">{t('rejected')}</Callout> : null}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="flex flex-col gap-3 rounded-card border border-line-200 bg-surface-0 p-5">
            <dt className="flex items-center justify-between gap-2 text-body-s font-medium text-ink-700">
              {k.label}
              <span className="inline-flex size-8 items-center justify-center rounded-control bg-accent-50 text-accent-700">
                <Icon icon={k.icon} size={16} />
              </span>
            </dt>
            <dd className="flex flex-col gap-1">
              <span className="text-display text-ink-900 tabular">{k.value}</span>
              {k.hint ? <span className="text-micro text-ink-500">{k.hint}</span> : null}
            </dd>
          </div>
        ))}
      </dl>

      <Card>
        <CardHeader
          title={t('pipelineTitle')}
          actions={
            <Button asChild size="s">
              <Link href="/employer/pipeline">
                {t('pipeline')}
                <Icon icon={ArrowRight} size={14} />
              </Link>
            </Button>
          }
        />
        <CardBody className="flex flex-col gap-4">
          {pipelineTotal === 0 ? (
            <p className="text-body-s text-ink-700">{t('pipelineEmpty')}</p>
          ) : (
            <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-chip" aria-hidden>
              {stages
                .filter((x) => x.count > 0)
                .map((x) => (
                  <span key={x.status} className={cx('h-full', stageColor[x.status])} style={{ width: `${(x.count / pipelineTotal) * 100}%` }} />
                ))}
            </div>
          )}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {stages.map((x) => (
              <li key={x.status}>
                <Link href="/employer/pipeline" className="flex flex-col gap-1 rounded-control border border-line-200 p-3 transition-colors hover:border-accent-600">
                  <span className="flex items-center gap-2 text-micro text-ink-700">
                    <span className={cx('size-2.5 rounded-full', stageColor[x.status])} aria-hidden />
                    {e(`ApplicationStatus.${x.status}`)}
                  </span>
                  <span className="text-h2 text-ink-900 tabular">{x.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <h2 className="flex items-center gap-3 text-h2">
        {t('tasksTitle')}
        <span className="rounded-chip bg-surface-100 px-3 py-0.5 text-caption text-ink-700 tabular">{t('tasksCount', { count: attention.length + blocked.length })}</span>
      </h2>

      {wards.length === 0 ? (
        <EmptyState
          action={
            <Button asChild variant="primary">
              <Link href="/employer/wards/new">{t('newWard')}</Link>
            </Button>
          }
        >
          {t('empty')}
        </EmptyState>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('staleTitle')} meta={t('staleHint')} />
          <CardBody className="flex flex-col gap-2">
            {attention.length === 0 ? (
              <p className="flex items-start gap-3 rounded-control bg-accent-50 p-3 text-body-s text-accent-700"><Icon icon={CircleCheck} size={18} className="mt-0.5 shrink-0" />{t('staleNone')}</p>
            ) : null}
            {attention.map((w) => {
              const days = daysUntilStale(w.confirmedAt, now);
              return (
                <div
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-line-200 py-2 last:border-0"
                >
                  <div className="flex flex-col">
                    <Link
                      href={`/employer/wards/${w.id}`}
                      className="text-body-s font-medium hover:text-accent-700"
                    >
                      {w.name}
                    </Link>
                    <StatusChip tone={days < 0 ? 'warn' : 'neutral'}>
                      {days < 0 ? t('staleSince', { days: -days }) : t('staleIn', { days })}
                    </StatusChip>
                  </div>
                  <ConfirmWardButton wardId={w.id} label={t('confirm')} done={t('confirmed')} />
                </div>
              );
            })}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t('blockedTitle')} />
          <CardBody className="flex flex-col gap-2">
            {blocked.length === 0 ? (
              <p className="flex items-start gap-3 rounded-control bg-accent-50 p-3 text-body-s text-accent-700"><Icon icon={CircleCheck} size={18} className="mt-0.5 shrink-0" />{t('blockedNone')}</p>
            ) : null}
            {blocked.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-2 border-b border-line-200 py-2 last:border-0"
              >
                <div className="flex flex-col">
                  <span className="text-body-s font-medium">{d.title}</span>
                  <span className="text-micro text-ink-500">
                    {t('blockers', { count: d.blockers.length })}
                  </span>
                </div>
                <Button asChild size="s">
                  <Link href={`/employer/jobs/${d.id}`}>{t('toJob')}</Link>
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

    </div>
  );
}
