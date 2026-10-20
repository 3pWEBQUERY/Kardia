import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { limitsFor } from '@kardia/core';
import { Button, Callout, Card, CardBody, CardHeader, EmptyState, StatusChip } from '@kardia/ui';

import { PoolCreateForm, PoolInviteForm, ShiftForm, ShiftTable } from '@/components/employer/Pool';
import { db } from '@/server/db';
import { listPools } from '@/server/services/pool';
import { requireOrg } from '@/server/session';

/** Flex-Pool-Verwaltung (Modul C): Pools, Mitglieder, Schichten, Export. Kardia ist nie Arbeitgeber (AK-C3). */
export default async function PoolPage() {
  const ctx = await requireOrg('pool.manage');
  const [t, te] = await Promise.all([getTranslations('employer.pool'), getTranslations('enums')]);
  const limits = limitsFor(ctx.org.plan as Parameters<typeof limitsFor>[0]);
  if (!limits?.flexPool) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h1">{t('title')}</h1>
        <EmptyState action={<Button asChild variant="primary"><Link href="/employer/billing">{t('upgrade')}</Link></Button>}>{t('notInPlan')}</EmptyState>
      </div>
    );
  }
  const [pools, wards] = await Promise.all([
    listPools(ctx),
    db.ward.findMany({ where: { location: { organizationId: ctx.org.id } }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);
  const candidateIds = [...new Set(pools.flatMap((p) => p.shifts.flatMap((s) => [s.bookedByCandidateId, ...s.interests.map((i) => i.candidateId)])).filter((x): x is string => !!x))];
  const people = await db.candidateProfile.findMany({ where: { id: { in: candidateIds } }, select: { id: true, firstName: true, lastName: true } });
  const nameOf = (id: string | null) => {
    const p = people.find((x) => x.id === id);
    return p ? `${p.firstName} ${p.lastName}` : null;
  };
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-s text-ink-700">{t('lead')}</p>
      </header>
      <Callout>{t('legal')}</Callout>
      <Card>
        <CardHeader title={t('newPool')} />
        <CardBody><PoolCreateForm /></CardBody>
      </Card>
      {pools.length === 0 ? <p className="text-body-s text-ink-700">{t('noPools')}</p> : null}
      {pools.map((p) => (
        <Card key={p.id}>
          <CardHeader
            title={p.name}
            meta={`${te(`PoolBookingMode.${p.bookingMode}`)} · ${t('deadline', { hours: p.cancelDeadlineHours })} · ${t('members', { count: p._count.members })}${limits.poolMembers != null ? ` / ${limits.poolMembers}` : ''}`}
            actions={<Button asChild size="s"><a href={`/employer/pool/${p.id}/export`}>{t('export')}</a></Button>}
          />
          <CardBody className="flex flex-col gap-6">
            <PoolInviteForm poolId={p.id} />
            <details className="rounded-card border border-line-300 p-4">
              <summary className="cursor-pointer text-body-s font-medium">{t('newShift')}</summary>
              <div className="mt-4"><ShiftForm poolId={p.id} wards={wards} /></div>
            </details>
            <div className="flex items-center gap-2">
              <StatusChip tone="accent">{t('open', { count: p.shifts.filter((s) => s.status === 'OPEN').length })}</StatusChip>
              <StatusChip tone="ok">{t('booked', { count: p.shifts.filter((s) => s.status === 'BOOKED').length })}</StatusChip>
            </div>
            <ShiftTable
              selectMode={p.bookingMode === 'EMPLOYER_SELECTS'}
              rows={p.shifts.map((s) => ({
                id: s.id,
                startsAt: s.startsAt.toISOString(),
                endsAt: s.endsAt.toISOString(),
                ward: s.ward.name,
                code: s.code,
                rate: s.hourlyRateChf,
                status: s.status,
                bookedBy: nameOf(s.bookedByCandidateId),
                interests: s.interests.map((i) => ({ candidateId: i.candidateId, name: nameOf(i.candidateId) ?? '–' })),
              }))}
            />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
