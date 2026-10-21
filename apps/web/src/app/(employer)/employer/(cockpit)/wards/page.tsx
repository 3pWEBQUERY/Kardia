import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { formatDate, isStale, locationQuotaExceeded, wardQuotaExceeded } from '@kardia/core';
import { Button, Callout, Card, CardBody, CardHeader, EmptyState, StatusChip } from '@kardia/ui';

import { LocationSheet } from '@/components/employer/WardEditor';
import { listLocations } from '@/server/services/wards';
import { requireOrgPage } from '@/server/session';

/** Standorte → Stationen. Die Station trägt die Arbeitsbedingungen (Modul A). */
export default async function WardsPage() {
  const ctx = await requireOrgPage();
  const t = await getTranslations('employer.wards');
  const te = await getTranslations('enums');
  const locations = await listLocations(ctx.org.id);
  const plan = ctx.org.plan as Parameters<typeof wardQuotaExceeded>[0];
  const wardFull = wardQuotaExceeded(plan, locations.reduce((n, l) => n + l.wards.length, 0));
  const locationFull = locationQuotaExceeded(plan, locations.length);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1">{t('title')}</h1>
        <div className="flex gap-2">
          {!locationFull ? <LocationSheet label={t('newLocation')} /> : null}
          {!wardFull ? (
            <Button asChild variant="primary">
              <Link href="/employer/wards/new">{t('newWard')}</Link>
            </Button>
          ) : null}
        </div>
      </div>
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
      {locations.length === 0 ? (
        <EmptyState action={<LocationSheet label={t('newLocation')} />}>
          {t('emptyLocations')}
        </EmptyState>
      ) : null}
      {locations.map((loc) => (
        <Card key={loc.id}>
          <CardHeader
            title={loc.name}
            meta={`${loc.street}, ${loc.postalCode} ${loc.city} · ${loc.canton}`}
            actions={
              <LocationSheet
                label={t('editLocation')}
                initial={{ ...loc, canton: loc.canton as never }}
              />
            }
          />
          <CardBody>
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
              <ul className="flex flex-col divide-y divide-line-200">
                {loc.wards.map((w) => (
                  <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="flex flex-col gap-0.5">
                      <Link
                        href={`/employer/wards/${w.id}`}
                        className="text-body-s font-medium hover:text-accent-700"
                      >
                        {w.name}
                      </Link>
                      <span className="text-micro text-ink-500">
                        {te(`Department.${w.department}`)} ·{' '}
                        {t('confirmed', { date: formatDate(w.confirmedAt) })}
                      </span>
                    </div>
                    {isStale(w.confirmedAt) ? (
                      <StatusChip tone="warn">{t('stale')}</StatusChip>
                    ) : (
                      <StatusChip tone="ok">{t('current')}</StatusChip>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
