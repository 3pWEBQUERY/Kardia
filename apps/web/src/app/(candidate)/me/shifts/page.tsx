import { getTranslations } from 'next-intl/server';

import { canCandidateCancel, formatDateTime, formatTime } from '@kardia/core';
import { Button, Card, CardBody, CardHeader, EmptyState } from '@kardia/ui';

import { ShiftActions } from '@/components/candidate/ShiftActions';
import { myShifts } from '@/server/services/pool';
import { requireUser } from '@/server/session';

/** Flex-Pool: offene Schichten buchen, gebuchte offline lesbar inkl. Adresse und Zeit (PRD 13.2). */
export default async function ShiftsPage() {
  const s = await requireUser('/me/shifts');
  const [t, e] = await Promise.all([getTranslations('candidate.shifts'), getTranslations('enums')]);
  const { open, booked } = await myShifts(s.user.id);
  const upcoming = booked.filter((x) => x.status === 'BOOKED');
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1">{t('title')}</h1>
          <p className="text-body-s text-ink-700">{t('lead')}</p>
        </div>
        {upcoming.length ? <Button asChild size="s"><a href="/api/v1/me/shifts.ics">{t('ics')}</a></Button> : null}
      </header>
      <Card>
        <CardHeader title={t('booked')} />
        <CardBody className="flex flex-col gap-2">
          {upcoming.length === 0 ? <EmptyState>{t('noBooked')}</EmptyState> : null}
          {upcoming.map((x) => (
            <div key={x.id} className="flex flex-col gap-2 border-b border-line-200 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col">
                <span className="text-body-s font-medium tabular">{formatDateTime(x.startsAt)}–{formatTime(x.endsAt)} · {e(`RosterCode.${x.code}`)}</span>
                <span className="text-micro text-ink-500">{x.pool.organization.name} · {x.ward.name} · {x.ward.location.street}, {x.ward.location.postalCode} {x.ward.location.city}</span>
              </div>
              <ShiftActions shiftId={x.id} kind="cancel" disabled={!canCandidateCancel(x.startsAt, x.pool.cancelDeadlineHours)} deadlineHours={x.pool.cancelDeadlineHours} />
            </div>
          ))}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t('open')} meta={t('openHint')} />
        <CardBody className="flex flex-col gap-2">
          {open.length === 0 ? <EmptyState>{t('noOpen')}</EmptyState> : null}
          {open.map((x) => (
            <div key={x.id} className="flex flex-col gap-2 border-b border-line-200 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col">
                <span className="text-body-s font-medium tabular">{formatDateTime(x.startsAt)}–{formatTime(x.endsAt)} · {e(`RosterCode.${x.code}`)} · CHF {x.hourlyRateChf}/h</span>
                <span className="text-micro text-ink-500">{x.pool.organization.name} · {x.ward.name}{x.requirements ? ` · ${x.requirements}` : ''}</span>
              </div>
              <ShiftActions shiftId={x.id} kind={x.pool.bookingMode === 'EMPLOYER_SELECTS' ? 'interest' : 'book'} disabled={x.interests.length > 0} />
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
