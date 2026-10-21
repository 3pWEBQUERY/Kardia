import { MapPin, Plus } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { countShifts, formatDate, isStale, locationQuotaExceeded, wardQuotaExceeded } from '@kardia/core';
import { Button, Callout, EmptyState, Icon, StatusChip, type RosterCode } from '@kardia/ui';

import { PageHeader, RowLink } from '@/components/app/PageHeader';
import { RosterMini } from '@/components/app/RosterMini';
import { DEPARTMENT_ICONS } from '@/components/brand/departmentIcons';
import { LocationSheet } from '@/components/employer/WardEditor';
import { listLocations } from '@/server/services/wards';
import { requireOrgPage } from '@/server/session';

/** Standorte → Stationen. Die Station trägt die Arbeitsbedingungen (Modul A). */
export default async function WardsPage() {
  const ctx = await requireOrgPage();
  const t = await getTranslations('employer.wards');
  const te = await getTranslations('enums');
  const tc = await getTranslations('common');
  const locations = await listLocations(ctx.org.id);
  const wards = locations.flatMap((l) => l.wards);
  const plan = ctx.org.plan as Parameters<typeof wardQuotaExceeded>[0];
  const wardFull = wardQuotaExceeded(plan, wards.length);
  const locationFull = locationQuotaExceeded(plan, locations.length);
  const openJobs = wards.reduce((n, w) => n + w._count.jobs, 0);
  const current = wards.filter((w) => !isStale(w.confirmedAt)).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={ctx.org.name}
        title={t('title')}
        description={t('lead')}
        actions={
          <>
            {!locationFull ? <LocationSheet label={t('newLocation')} /> : null}
            {!wardFull ? (
              <Button asChild variant="primary">
                <Link href="/employer/wards/new">
                  <Icon icon={Plus} size={18} />
                  {t('newWard')}
                </Link>
              </Button>
            ) : null}
          </>
        }
        stats={[
          { label: t('stats.wards'), value: wards.length },
          { label: t('stats.locations'), value: locations.length },
          { label: t('stats.openJobs'), value: openJobs },
          { label: t('stats.current'), value: `${current}/${wards.length}` },
        ]}
      />
      {wardFull || locationFull ? (
        <Callout
          title={t('quotaTitle')}
          action={
            <Button asChild size="s">
              <Link href="/employer/billing">{t('quotaAction')}</Link>
            </Button>
          }
        >
          {wardFull ? t('wardQuota') : t('locationQuota')}
        </Callout>
      ) : null}
      {locations.length === 0 ? <EmptyState action={<LocationSheet label={t('newLocation')} />}>{t('emptyLocations')}</EmptyState> : null}
      {locations.map((loc) => (
        <section key={loc.id} aria-labelledby={`loc-${loc.id}`} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-control bg-brand-950 text-pulse-500">
                <Icon icon={MapPin} size={18} />
              </span>
              <div className="flex flex-col">
                <h2 id={`loc-${loc.id}`} className="text-h3 text-ink-900">
                  {loc.name}
                </h2>
                <p className="text-micro text-ink-500">
                  {loc.street}, {loc.postalCode} {loc.city} · {loc.canton}
                </p>
              </div>
            </div>
            <LocationSheet label={t('editLocation')} initial={{ ...loc, canton: loc.canton as never }} />
          </div>
          {loc.wards.length === 0 ? (
            <EmptyState
              action={
                <Button asChild size="s">
                  <Link href={`/employer/wards/new?location=${loc.id}`}>{t('newWard')}</Link>
                </Button>
              }
            >
              {t('emptyWards')}
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {loc.wards.map((w) => {
                const pattern = w.rosterPattern as RosterCode[];
                const shifts = pattern.length === 28 ? 28 - countShifts(pattern).X : 0;
                return (
                  <li key={w.id}>
                    <RowLink
                      href={`/employer/wards/${w.id}`}
                      icon={DEPARTMENT_ICONS[w.department]}
                      title={w.name}
                      meta={
                        <>
                          <span>{te(`Department.${w.department}`)}</span>
                          <span aria-hidden>·</span>
                          <span>{t('confirmed', { date: formatDate(w.confirmedAt) })}</span>
                          <span aria-hidden>·</span>
                          <span className="tabular">{t('openJobs', { count: w._count.jobs })}</span>
                        </>
                      }
                      aside={
                        <>
                          <RosterMini pattern={pattern} label={tc('roster.shifts', { count: shifts })} className="hidden lg:inline-grid" />
                          {isStale(w.confirmedAt) ? <StatusChip tone="warn">{t('stale')}</StatusChip> : <StatusChip tone="ok">{t('current')}</StatusChip>}
                        </>
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
