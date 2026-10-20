import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { formatDateTime } from '@kardia/core';
import { Button, Card, CardBody, CardHeader, EmptyState, Stat, StatusChip } from '@kardia/ui';

import { db } from '@/server/db';
import { listMyApplications } from '@/server/services/applications';
import { myShifts } from '@/server/services/pool';
import { requireUser } from '@/server/session';

/** Übersicht der Fachperson: Bewerbungen, Angebote, nächste Schichten, Pass-Status. */
export default async function MeOverview() {
  const s = await requireUser('/me');
  const t = await getTranslations('candidate.overview');
  const e = await getTranslations('enums');
  const candidate = await db.candidateProfile.findUnique({ where: { userId: s.user.id }, include: { credentials: { select: { status: true } } } });
  if (!candidate) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h1">{t('welcome')}</h1>
        <EmptyState action={<Button asChild variant="primary"><Link href="/me/pass?setup=1">{t('createPass')}</Link></Button>}>{t('noPass')}</EmptyState>
      </div>
    );
  }
  const [apps, offers, shifts] = await Promise.all([
    listMyApplications(s.user.id),
    db.offer.count({ where: { candidateId: candidate.id, status: 'SENT', expiresAt: { gt: new Date() } } }),
    myShifts(s.user.id),
  ]);
  const active = apps.filter((a) => !['REJECTED', 'WITHDRAWN', 'HIRED'].includes(a.status));
  const verified = candidate.credentials.filter((c) => c.status === 'VERIFIED').length;
  const next = shifts.booked.filter((x) => x.status === 'BOOKED' && x.startsAt > new Date()).slice(0, 3);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">{t('hello', { name: candidate.firstName })}</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t('activeApplications')} value={active.length} />
        <Stat label={t('openOffers')} value={offers} />
        <Stat label={t('verifiedCredentials')} value={`${verified}/${candidate.credentials.length}`} />
      </div>
      <Card>
        <CardHeader title={t('applications')} actions={<Button asChild size="s"><Link href="/me/applications">{t('all')}</Link></Button>} />
        <CardBody className="flex flex-col gap-2">
          {active.length === 0 ? <EmptyState action={<Button asChild><Link href="/search">{t('toSearch')}</Link></Button>}>{t('noApplications')}</EmptyState> : null}
          {active.slice(0, 5).map((a) => (
            <Link key={a.id} href={`/me/applications/${a.id}`} className="flex items-center justify-between gap-3 border-b border-line-200 py-2 last:border-0">
              <span className="min-w-0 truncate text-body-s">{a.job.title} · {a.job.ward.location.organization.name}</span>
              <StatusChip tone={a.status === 'OFFER' ? 'accent' : 'neutral'}>{e(`ApplicationStatus.${a.status}`)}</StatusChip>
            </Link>
          ))}
        </CardBody>
      </Card>
      {next.length ? (
        <Card>
          <CardHeader title={t('nextShifts')} />
          <CardBody className="flex flex-col gap-1">
            {next.map((x) => (
              <p key={x.id} className="text-body-s tabular">{formatDateTime(x.startsAt)} · {x.code} · {x.ward.name}</p>
            ))}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
