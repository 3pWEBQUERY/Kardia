import { ArrowRight, BadgeCheck, CircleCheck, Circle, Handshake, Heart, Inbox, Search } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { formatDateTime } from '@kardia/core';
import { Button, Card, CardBody, CardHeader, EmptyState, Icon, Stat, StatusChip } from '@kardia/ui';

import { PulseLine } from '@/components/brand/Artwork';
import { db } from '@/server/db';
import { featureEnabled } from '@/server/features';
import { listMyApplications } from '@/server/services/applications';
import { myShifts } from '@/server/services/pool';
import { requireUser } from '@/server/session';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Übersicht der Fachperson: Begrüssung, Pass-Fortschritt, nächste Schritte, Bewerbungen, Schichten. */
export default async function MeOverview() {
  const s = await requireUser('/me');
  const t = await getTranslations('candidate.overview');
  const e = await getTranslations('enums');
  const candidate = await db.candidateProfile.findUnique({
    where: { userId: s.user.id },
    include: {
      credentials: { select: { status: true } },
      _count: { select: { languages: true, savedSearches: true, savedJobs: true } },
    },
  });
  if (!candidate) {
    return (
      <div className="flex flex-col gap-6">
        <WelcomeBand eyebrow={t('eyebrow')} title={t('welcome')} lead={t('noPass')}>
          <Link
            href="/me/pass?setup=1"
            className="inline-flex h-control-l w-fit items-center gap-2 rounded-control bg-pulse-500 px-6 text-body font-semibold text-brand-950 transition-colors hover:bg-brand-100"
          >
            {t('createPass')}
            <Icon icon={ArrowRight} size={18} />
          </Link>
        </WelcomeBand>
      </div>
    );
  }
  const marketplace = featureEnabled('marketplace');
  const [apps, offers, shifts] = await Promise.all([
    listMyApplications(s.user.id),
    marketplace ? db.offer.count({ where: { candidateId: candidate.id, status: 'SENT', expiresAt: { gt: new Date() } } }) : 0,
    featureEnabled('flexPool') ? myShifts(s.user.id) : { booked: [] },
  ]);
  const active = apps.filter((a) => !['REJECTED', 'WITHDRAWN', 'HIRED'].includes(a.status));
  const verified = candidate.credentials.filter((c) => c.status === 'VERIFIED').length;
  const next = shifts.booked.filter((x) => x.status === 'BOOKED' && x.startsAt > new Date()).slice(0, 3);

  // Pass-Fortschritt: einfache, nachvollziehbare Schritte statt eines Scores.
  const steps: { key: 'credential' | 'verified' | 'home' | 'languages' | 'alert'; done: boolean; href: string }[] = [
    { key: 'credential', done: candidate.credentials.length > 0, href: '/me/pass' },
    { key: 'verified', done: verified > 0, href: '/me/pass' },
    { key: 'languages', done: candidate._count.languages > 0, href: '/me/pass' },
    { key: 'home', done: candidate.homeLat != null, href: '/me/pass' },
    { key: 'alert', done: candidate._count.savedSearches > 0, href: '/search' },
  ];
  const done = steps.filter((x) => x.done).length;
  const open = steps.filter((x) => !x.done);

  const tiles: { href: string; label: string; meta: string; icon: LucideIcon }[] = [
    { href: '/search', label: t('tiles.search'), meta: '', icon: Search },
    { href: '/me/applications', label: t('tiles.applications'), meta: String(active.length), icon: Inbox },
    { href: '/me/saved', label: t('tiles.saved'), meta: t('savedCount', { count: candidate._count.savedJobs }), icon: Heart },
    { href: '/me/pass', label: t('tiles.pass'), meta: `${verified}/${candidate.credentials.length}`, icon: BadgeCheck },
  ];

  return (
    <div className="flex flex-col gap-6">
      <WelcomeBand eyebrow={t('eyebrow')} title={t('hello', { name: candidate.firstName })} lead={t('lead')}>
        <div className="flex max-w-md flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-body-s text-brand-100">
            <span className="font-semibold">{t('passTitle')}</span>
            <span className="text-brand-300 tabular">{t('passDone', { done, total: steps.length })}</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-valuenow={done}
            aria-label={t('passTitle')}
            className="grid h-2.5 grid-cols-5 gap-1"
          >
            {steps.map((x) => (
              <span key={x.key} className={x.done ? 'rounded-chip bg-pulse-500' : 'rounded-chip bg-brand-800'} />
            ))}
          </div>
        </div>
      </WelcomeBand>

      <div className={`grid grid-cols-2 gap-3 ${marketplace ? 'sm:grid-cols-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1' : ''}`}>
        <Stat label={t('activeApplications')} value={active.length} icon={<Icon icon={Inbox} size={16} />} />
        {marketplace ? <Stat label={t('openOffers')} value={offers} icon={<Icon icon={Handshake} size={16} />} /> : null}
        <Stat label={t('verifiedCredentials')} value={`${verified}/${candidate.credentials.length}`} icon={<Icon icon={BadgeCheck} size={16} />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t('applications')} actions={<Button asChild size="s"><Link href="/me/applications">{t('all')}</Link></Button>} />
          <CardBody className="flex flex-col gap-2">
            {active.length === 0 ? <EmptyState action={<Button asChild><Link href="/search">{t('toSearch')}</Link></Button>}>{t('noApplications')}</EmptyState> : null}
            {active.slice(0, 5).map((a) => (
              <Link key={a.id} href={`/me/applications/${a.id}`} className="flex items-center justify-between gap-3 rounded-control border border-line-200 px-3 py-2.5 transition-colors hover:border-accent-600">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-body-s font-medium text-ink-900">{a.job.title}</span>
                  <span className="truncate text-micro text-ink-500">{a.job.ward.location.organization.name}</span>
                </span>
                <StatusChip tone={a.status === 'OFFER' ? 'accent' : 'neutral'}>{e(`ApplicationStatus.${a.status}`)}</StatusChip>
              </Link>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t('nextSteps')} />
          <CardBody className="flex flex-col gap-1">
            {open.length === 0 ? (
              <p className="flex items-start gap-3 rounded-control bg-accent-50 p-3 text-body-s text-accent-700">
                <Icon icon={CircleCheck} size={18} className="mt-0.5 shrink-0" />
                {t('allDone')}
              </p>
            ) : null}
            <ul className={open.length === 0 ? 'hidden' : 'flex flex-col'}>
              {steps.map((x) => (
                <li key={x.key}>
                  <Link href={x.href} className="flex items-center gap-3 rounded-control px-2 py-2 text-body-s hover:bg-surface-100">
                    <Icon icon={x.done ? CircleCheck : Circle} size={18} className={x.done ? 'text-ok-600' : 'text-ink-500'} />
                    <span className={x.done ? 'flex-1 text-ink-500 line-through' : 'flex-1 font-medium text-ink-900'}>{t(`steps.${x.key}`)}</span>
                    {!x.done ? <Icon icon={ArrowRight} size={16} className="text-accent-600" /> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <section aria-labelledby="quick" className="flex flex-col gap-3">
        <h2 id="quick" className="text-h3">{t('quick')}</h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((tile) => (
            <li key={tile.href}>
              <Link href={tile.href} className="group flex h-full flex-col gap-4 rounded-card border border-line-200 bg-surface-0 p-4 transition-colors hover:border-accent-600">
                <span className="inline-flex size-10 items-center justify-center rounded-control bg-accent-50 text-accent-700">
                  <Icon icon={tile.icon} size={20} />
                </span>
                <span className="flex flex-col">
                  <span className="text-body-s font-semibold text-ink-900">{tile.label}</span>
                  {tile.meta ? <span className="text-micro text-ink-500 tabular">{tile.meta}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

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

/** Begrüssungsband auf Markenfläche mit Pulslinie. */
function WelcomeBand({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead: string; children?: ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden rounded-card bg-brand-950 px-6 py-8 md:px-10 md:py-10">
      <PulseLine className="absolute inset-x-0 bottom-6 -z-10 h-16 w-full text-brand-800" peakAt={0.82} />
      <div className="flex flex-col gap-5">
        <span className="inline-flex w-fit items-center gap-2 text-caption font-semibold tracking-wider text-brand-300 uppercase">
          <span className="size-2 rounded-full bg-pulse-500" aria-hidden />
          {eyebrow}
        </span>
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-display text-brand-100">{title}</h1>
          <p className="text-body text-brand-300">{lead}</p>
        </div>
        {children}
      </div>
    </section>
  );
}
