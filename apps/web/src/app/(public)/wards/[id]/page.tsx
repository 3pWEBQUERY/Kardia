import { ArrowRight, Quote, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';


import { BENCHMARK_MIN_PEERS, encodeGeohash, formatChfRange, formatDate, isStale, type PartialWardProfile } from '@kardia/core';
import { Button, Card, CardBody, CardHeader, EmptyState, Icon } from '@kardia/ui';

import { AskTeam } from '@/components/domain/AskTeam';
import { CommuteInfo } from '@/components/domain/CommuteInfo';
import { DetailHero, SectionNav, type HeroChip } from '@/components/domain/DetailHero';
import { OrgLogo } from '@/components/domain/OrgLogo';
import { ReportButton } from '@/components/domain/ReportButton';
import { Roster } from '@/components/domain/Roster';
import { WardProfileView } from '@/components/domain/WardProfileView';
import { formatFieldValue } from '@/lib/fieldValue';
import { localizedWardText } from '@/lib/wardText';
import { db } from '@/server/db';
import { latestTeamSummaries } from '@/server/services/teamSummary';
import { getWardPublic } from '@/server/services/wards';
import { getSession } from '@/server/session';

import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const view = await getWardPublic(id);
  if (!view) return {};
  return { title: `${view.ward.name} – ${view.ward.location.organization.name}`, alternates: { canonical: `/wards/${id}` } };
}

/** Station: "Wie es sich auf einer Station arbeiten lässt – bevor du dich bewirbst." */
export default async function WardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await getWardPublic(id);
  if (!view) notFound();
  const { ward, reality } = view;
  const [t, tf, te, tc, x, xj] = await Promise.all([
    getTranslations('public.ward'),
    getTranslations('fields'),
    getTranslations('enums'),
    getTranslations('common'),
    getTranslations('explore.ward'),
    getTranslations('explore.job'),
  ]);
  const session = await getSession();
  const [locale, summaries, candidate] = await Promise.all([
    getLocale(),
    latestTeamSummaries(ward.id),
    session ? db.candidateProfile.findUnique({ where: { userId: session.user.id }, select: { homeLat: true, homeLng: true } }) : null,
  ]);
  const about = localizedWardText(ward.description, ward.translations, locale);
  const fmt = (k: string, v: unknown) => formatFieldValue(k, v, { fields: tf, enums: te, common: tc });

  const chips: HeroChip[] = [
    { label: tc('confirmedBy', { date: formatDate(ward.confirmedAt) }) },
    ...(isStale(ward.confirmedAt) ? [{ label: tc('states.stale'), tone: 'signal' as const }] : []),
    ...(ward.reentryFriendly ? [{ label: tf('reentryFriendly') }] : []),
    ...(ward._count.verifiedEmployees > 0 ? [{ label: t('verifiedEmployees', { count: ward._count.verifiedEmployees }) }] : []),
  ];
  const sections = [
    { id: 'rhythm', label: t('rhythm') },
    { id: 'profile', label: t('profile') },
    ...(summaries.length ? [{ id: 'voices', label: x('voicesTitle') }] : []),
    ...(ward.benchmarks.length ? [{ id: 'benchmark', label: t('benchmark') }] : []),
    ...(ward.videos.length ? [{ id: 'videos', label: t('videos') }] : []),
    { id: 'questions', label: t('questions') },
  ];

  return (
    <>
      <DetailHero
        department={ward.department}
        departmentLabel={te(`Department.${ward.department}`)}
        back={{ href: '/search', label: xj('back') }}
        logo={<OrgLogo fileId={ward.location.organization.logoFileId} size={32} />}
        org={{ href: `/organizations/${ward.location.organization.id}`, label: ward.location.organization.name }}
        place={
          <>
            <span>{ward.location.name}</span>
            <span>{ward.location.city}</span>
          </>
        }
        title={ward.name}
        chips={chips}
        facts={[
          { label: xj('salary'), value: ward.salaryMinChf != null && ward.salaryMaxChf != null ? formatChfRange(ward.salaryMinChf, ward.salaryMaxChf) : xj('unknown') },
          { label: xj('rosterLead'), value: ward.rosterLeadWeeks != null ? xj('weeks', { count: ward.rosterLeadWeeks }) : xj('unknown') },
          { label: xj('ratio'), value: ward.patientsPerNurseDay != null ? `1 : ${ward.patientsPerNurseDay}` : xj('unknown') },
          { label: x('openJobs'), value: String(ward.jobs.length) },
        ]}
        {...(ward.jobs.length ? { cta: { href: '#jobs', label: t('openJobs', { count: ward.jobs.length }) } } : {})}
      />

      <div className="mx-auto grid max-w-content gap-8 px-4 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <SectionNav label={xj('onThisPage')} items={sections} />
          <Card id="rhythm" className="scroll-mt-32">
            <CardHeader title={t('rhythm')} />
            <CardBody>
              <Roster pattern={ward.rosterPattern} />
            </CardBody>
          </Card>
          <Card id="profile" className="scroll-mt-32">
            <CardHeader title={t('profile')} meta={t('realityHint')} />
            <CardBody>
              <WardProfileView profile={ward as unknown as PartialWardProfile} confirmedAt={ward.confirmedAt} reality={reality} comments={ward.fieldComments} location={ward.location} />
            </CardBody>
          </Card>
          {about.text ? (
            <section className="flex flex-col gap-3 rounded-card border border-line-200 bg-sand-100 p-6 md:p-8" lang={about.translated ? locale : 'de-CH'}>
              <h2 className="text-h2">{t('about')}</h2>
              <p className="prose-k whitespace-pre-line text-body text-ink-900">{about.text}</p>
              {about.translated ? <p className="text-micro text-ink-500">{t('autoTranslated')}</p> : null}
            </section>
          ) : null}
          {summaries.length ? (
            <section id="voices" aria-labelledby="voices-title" className="flex scroll-mt-32 flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 id="voices-title" className="text-h2">{x('voicesTitle')}</h2>
                <p className="text-body-s text-ink-700">{t('teamVoicesHint')}</p>
              </div>
              <ul className="grid gap-4 md:grid-cols-2">
                {summaries.map((sm) => (
                  <li key={sm.field} className="flex flex-col gap-4 rounded-card border border-line-200 bg-surface-0 p-5">
                    <Icon icon={Quote} size={28} className="text-pulse-500" />
                    <blockquote className="text-body text-ink-900">{sm.summary}</blockquote>
                    <div className="mt-auto flex flex-col gap-2 border-t border-line-200 pt-3">
                      <p className="flex items-center gap-2 text-caption text-ink-700">
                        <span className="font-semibold text-ink-900">{tf(sm.field)}</span>
                        <span className="inline-flex items-center gap-1 rounded-chip bg-accent-50 px-2 py-0.5 text-micro text-accent-700">
                          <Icon icon={Sparkles} size={12} />
                          {tc('aiSummary')}
                        </span>
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1 text-micro text-ink-500">
                          <Icon icon={Users} size={12} />
                          {t('basedOn', { count: sm.basedOn })}
                        </span>
                        <ReportButton entity="RealityCheck" entityId={`${ward.id}:${sm.field}`} signedIn={!!session} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {ward.benchmarks.length ? (
            <Card id="benchmark" className="scroll-mt-32">
              <CardHeader title={t('benchmark')} meta={t('benchmarkHint', { min: BENCHMARK_MIN_PEERS })} />
              <CardBody>
                <ul className="flex flex-col divide-y divide-line-200 text-body-s">
                  {ward.benchmarks.map((b) => (
                    <li key={b.field} className="flex justify-between gap-4 py-2 tabular">
                      <span className="text-ink-700">{tf(b.field)}</span>
                      <span>{fmt(b.field, b.wardValue)} · {t('median', { value: fmt(b.field, b.medianValue), peers: b.peerCount })}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
          {ward.videos.length ? (
            <Card id="videos" className="scroll-mt-32">
              <CardHeader title={t('videos')} />
              <CardBody className="grid gap-4 sm:grid-cols-2">
                {ward.videos.map((v) => (
                  <div key={v.id} className="flex flex-col items-start gap-1">
                    <video controls preload="none" className="w-full rounded-control border border-line-300" poster={v.posterId ? `/api/files/${v.posterId}` : undefined}>
                      <source src={`/api/files/${v.fileId}`} type="video/mp4" />
                      <track kind="captions" src={`/api/files/${v.captionsId}`} srcLang="de" label="Deutsch" default />
                    </video>
                    <ReportButton entity="WardVideo" entityId={v.id} signedIn={!!session} />
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}
          <Card id="questions" className="scroll-mt-32">
            <CardHeader title={t('questions')} meta={t('questionsHint')} />
            <CardBody className="flex flex-col gap-4">
              {ward.questions.length === 0 ? <EmptyState>{t('noQuestions')}</EmptyState> : null}
              {ward.questions.map((q) => (
                <div key={q.id} className="flex flex-col gap-2 border-b border-line-200 pb-4 last:border-b-0">
                  <p className="text-body-s font-semibold text-ink-900">{q.body}</p>
                  {q.answer ? (
                    <p className="border-l-2 border-accent-600 pl-3 text-body-s text-ink-700">{q.answer}</p>
                  ) : (
                    <p className="text-micro text-ink-500">{t('unanswered')}</p>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    {q.answeredAt ? (
                      <p className="text-micro text-ink-500">{t('answeredAfter', { hours: Math.max(1, Math.round((q.answeredAt.getTime() - q.createdAt.getTime()) / 3600_000)) })}</p>
                    ) : (
                      <span />
                    )}
                    <ReportButton entity="TeamQuestion" entityId={q.id} signedIn={!!session} />
                  </div>
                </div>
              ))}
              <AskTeam wardId={ward.id} signedIn={!!session} />
            </CardBody>
          </Card>
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <section id="jobs" aria-labelledby="jobs-title" className="flex scroll-mt-24 flex-col gap-3 rounded-card border-2 border-ink-900 bg-surface-0 p-5">
            <h2 id="jobs-title" className="text-h3">{t('openJobs', { count: ward.jobs.length })}</h2>
            {ward.jobs.length === 0 ? <p className="text-body-s text-ink-700">{t('noJobs')}</p> : null}
            <ul className="flex flex-col gap-2">
              {ward.jobs.map((j) => (
                <li key={j.id}>
                  <Link href={`/jobs/${j.id}`} className="group flex items-center justify-between gap-3 rounded-control border border-line-200 px-3 py-2.5 transition-colors hover:border-accent-600">
                    <span className="flex flex-col">
                      <span className="text-body-s font-medium text-ink-900">{j.title}</span>
                      <span className="text-micro text-ink-500 tabular">{j.workloadMinPct}–{j.workloadMaxPct} %</span>
                    </span>
                    <Icon icon={ArrowRight} size={16} className="shrink-0 text-ink-500 group-hover:text-accent-600" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          {candidate?.homeLat != null && candidate.homeLng != null ? (
            <Card>
              <CardHeader title={t('commute')} />
              <CardBody>
                <CommuteInfo origin={encodeGeohash(candidate.homeLat, candidate.homeLng)} wardId={ward.id} />
              </CardBody>
            </Card>
          ) : candidate ? (
            <p className="text-micro text-ink-500">
              <Link href="/me/pass" className="text-accent-700 underline">{t('commuteSetHome')}</Link>
            </p>
          ) : null}
          <section className="flex flex-col gap-3 rounded-card bg-sand-100 p-5">
            <h2 className="text-h3">{t('workHere')}</h2>
            <p className="text-body-s text-ink-700">{t('workHereBody')}</p>
            <Button asChild>
              <Link href={`/wards/${ward.id}/team`}>{t('workHereAction')}</Link>
            </Button>
          </section>
        </aside>
      </div>
    </>
  );
}
