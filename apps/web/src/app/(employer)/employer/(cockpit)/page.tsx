import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { EVENTS, businessDaysBetween, daysUntilStale, formatNumber, formatPct } from '@kardia/core';
import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Stat,
  StatusChip,
} from '@kardia/ui';

import { ConfirmWardButton } from '@/components/employer/ConfirmWardButton';
import { db } from '@/server/db';
import { blockersFor } from '@/server/services/jobs';
import { requireOrgPage } from '@/server/session';

/** Übersicht: Kennzahlen der Organisation, veraltete Profile (AK-A3), Blocker, Prüfstatus (AK-C1). */
export default async function EmployerOverview() {
  const ctx = await requireOrgPage();
  const t = await getTranslations('employer.overview');
  const now = new Date();
  const orgWhere = { ward: { location: { organizationId: ctx.org.id } } };

  const [openJobs, newApps, apps, wards, drafts, hired] = await Promise.all([
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">{t('title')}</h1>
      {ctx.org.verification === 'PENDING' ? <Callout>{t('pending')}</Callout> : null}
      {ctx.org.verification === 'AGENCY_REVIEW' ? (
        <Callout tone="warn">{t('agencyReview')}</Callout>
      ) : null}
      {ctx.org.verification === 'REJECTED' ? (
        <Callout tone="critical">{t('rejected')}</Callout>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('openJobs')} value={formatNumber(openJobs)} />
        <Stat label={t('newApplications')} value={formatNumber(newApps)} />
        <Stat
          label={t('responseRate')}
          value={responseRate == null ? t('none') : formatPct(Math.round(responseRate * 100))}
          hint={t('responseRateHint')}
        />
        <Stat
          label={t('timeToHire')}
          value={
            avgTth == null ? t('none') : t('days', { value: formatNumber(Math.round(avgTth)) })
          }
          hint={t('timeToHireHint')}
        />
      </div>

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
              <p className="text-body-s text-ink-700">{t('staleNone')}</p>
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
              <p className="text-body-s text-ink-700">{t('blockedNone')}</p>
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

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="primary">
          <Link href="/employer/jobs/new">{t('newJob')}</Link>
        </Button>
        <Button asChild>
          <Link href="/employer/wards/new">{t('newWard')}</Link>
        </Button>
        <Button asChild>
          <Link href="/employer/pipeline">{t('pipeline')}</Link>
        </Button>
      </div>
    </div>
  );
}
