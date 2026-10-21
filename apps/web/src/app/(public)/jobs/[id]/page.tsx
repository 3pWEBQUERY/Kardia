import { Building2 } from 'lucide-react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';


import { EVENTS, encodeGeohash, formatChfRange, formatDate, formatPlainDate, isStale, jobPostingJsonLd, overriddenFields } from '@kardia/core';
import { Callout, Card, CardBody, CardHeader, Icon } from '@kardia/ui';

import { ApplyPanel } from '@/components/domain/ApplyPanel';
import { CommuteInfo } from '@/components/domain/CommuteInfo';
import { DetailHero, SectionNav, type HeroChip } from '@/components/domain/DetailHero';
import { OrgLogo } from '@/components/domain/OrgLogo';
import { Roster } from '@/components/domain/Roster';
import { SaveButton } from '@/components/domain/SaveButton';
import { WardProfileView } from '@/components/domain/WardProfileView';
import { localizedWardText } from '@/lib/wardText';
import { track } from '@/server/audit';
import { db } from '@/server/db';
import { getJobPublic } from '@/server/services/jobs';
import { getSession } from '@/server/session';

import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const view = await getJobPublic(id);
  if (!view) return {};
  return {
    title: `${view.job.title} – ${view.ward.location.organization.name}`,
    description: `${view.ward.name}, ${view.ward.location.city}. Lohnband, Dienstplan-Vorlauf und Schichtmodell im Stationsprofil.`,
    alternates: { canonical: `/jobs/${id}` },
  };
}

/** Stelle: aufgelöstes Stationsprofil, Dienstrhythmus, Realitäts-Check, Pendelzeit, Bewerben (PRD 7.3). */
export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await getJobPublic(id);
  if (!view) notFound();
  const { job, ward, profile, reality, recognizedTraining } = view;
  const t = await getTranslations('public.job');
  const e = await getTranslations('enums');
  const f = await getTranslations('fields');
  const x = await getTranslations('explore.job');
  const session = await getSession();
  const candidate = session ? await db.candidateProfile.findUnique({ where: { userId: session.user.id }, include: { savedJobs: { where: { jobId: id } }, applications: { where: { jobId: id } } } }) : null;
  const about = localizedWardText(ward.description, ward.translations, await getLocale());
  const applyState = !session ? 'anonymous' : !candidate ? 'noPass' : candidate.applications.length ? 'applied' : 'ready';
  await track(EVENTS.jobViewed, { userId: session?.user.id ?? null, orgId: ward.location.organizationId, entityId: id });

  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const origin = process.env.APP_ORIGIN ?? 'http://localhost:3000';
  const jsonLd = jobPostingJsonLd({
    url: `${origin}/jobs/${id}`,
    title: job.title,
    description: ward.description ?? `${job.title} – ${ward.name}`,
    datePosted: job.publishedAt ?? job.createdAt,
    validThrough: job.paidUntil,
    orgName: ward.location.organization.name,
    street: ward.location.street,
    postalCode: ward.location.postalCode,
    city: ward.location.city,
    canton: ward.location.canton,
    salaryMinChf: profile.salaryMinChf ?? ward.salaryMinChf,
    salaryMaxChf: profile.salaryMaxChf ?? ward.salaryMaxChf,
    workloadMinPct: job.workloadMinPct,
    workloadMaxPct: job.workloadMaxPct,
  });

  const workload = job.workloadMinPct === job.workloadMaxPct ? `${job.workloadMinPct} %` : `${job.workloadMinPct}–${job.workloadMaxPct} %`;
  const salaryMin = profile.salaryMinChf ?? ward.salaryMinChf;
  const salaryMax = profile.salaryMaxChf ?? ward.salaryMaxChf;
  const chips: HeroChip[] = [
    { label: e(`Profession.${job.profession}`) },
    ...(job.startDate ? [{ label: t('start', { date: formatPlainDate(job.startDate) }) }] : []),
    ...(job.allowsPendingRecog ? [{ label: t('pendingRecog') }] : []),
    ...(isStale(ward.confirmedAt) ? [{ label: t('stale'), tone: 'signal' as const }] : [{ label: x('verifiedBy', { date: formatDate(ward.confirmedAt) }) }]),
  ];
  const sections = [
    { id: 'rhythm', label: t('rhythm') },
    ...(job.profession === 'PHYSICIAN' ? [{ id: 'training', label: t('training') }] : []),
    { id: 'profile', label: t('profile') },
    ...(about.text ? [{ id: 'about', label: t('about') }] : []),
  ];

  return (
    <>
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <DetailHero
        department={ward.department}
        departmentLabel={e(`Department.${ward.department}`)}
        back={{ href: '/search', label: x('back') }}
        logo={<OrgLogo fileId={ward.location.organization.logoFileId} size={32} />}
        org={{ href: `/organizations/${ward.location.organization.id}`, label: ward.location.organization.name }}
        site={
          <Link href={`/wards/${ward.id}`} className="text-brand-100 underline-offset-4 hover:underline">
            {ward.name}
          </Link>
        }
        city={ward.location.city}
        title={job.title}
        chips={chips}
        facts={[
          { label: x('salary'), value: salaryMin != null && salaryMax != null ? formatChfRange(salaryMin, salaryMax) : x('unknown') },
          { label: x('workload'), value: workload },
          { label: x('rosterLead'), value: profile.rosterLeadWeeks != null ? x('weeks', { count: profile.rosterLeadWeeks }) : x('unknown') },
          { label: x('ratio'), value: profile.patientsPerNurseDay != null ? `1 : ${profile.patientsPerNurseDay}` : x('unknown') },
        ]}
        cta={{ href: '#apply', label: x('applyNow') }}
      />

      <div className="mx-auto grid max-w-content gap-8 px-4 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="flex min-w-0 flex-col gap-6">
          <SectionNav label={x('onThisPage')} items={sections} />

          <Card id="rhythm" className="scroll-mt-32">
            <CardHeader title={t('rhythm')} meta={t('rhythmHint')} />
            <CardBody>
              <Roster pattern={ward.rosterPattern} workloadPct={job.workloadMaxPct} />
            </CardBody>
          </Card>

          {job.profession === 'PHYSICIAN' ? (
            recognizedTraining ? (
              <Card id="training" className="scroll-mt-32">
                <CardHeader title={t('training')} />
                <CardBody className="grid gap-2 text-body-s sm:grid-cols-2">
                  <p><span className="text-ink-700">{f('specialtyTitle')}:</span> {job.specialtyTitle}</p>
                  <p><span className="text-ink-700">{f('trainingCategory')}:</span> {job.trainingCategory}</p>
                  {job.maxCreditableYears != null ? <p><span className="text-ink-700">{f('maxCreditableYears')}:</span> {job.maxCreditableYears}</p> : null}
                  {job.weeklyHours != null ? <p><span className="text-ink-700">{f('weeklyHours')}:</span> {job.weeklyHours} h</p> : null}
                  {job.structuredTrainingHoursWeek != null ? <p><span className="text-ink-700">{f('structuredTrainingHoursWeek')}:</span> {job.structuredTrainingHoursWeek} h/Wo</p> : null}
                  {job.assistantPositions != null ? <p><span className="text-ink-700">{f('assistantPositions')}:</span> {job.assistantPositions}</p> : null}
                  {job.rotations.length ? <p className="sm:col-span-2"><span className="text-ink-700">{f('rotations')}:</span> {job.rotations.join(', ')}</p> : null}
                </CardBody>
              </Card>
            ) : (
              <div id="training" className="scroll-mt-32">
                <Callout tone="warn">{t('noTraining')}</Callout>
              </div>
            )
          ) : null}

          <Card id="profile" className="scroll-mt-32">
            <CardHeader title={t('profile')} meta={t('profileHint')} />
            <CardBody>
              <WardProfileView
                profile={profile}
                confirmedAt={ward.confirmedAt}
                reality={reality}
                comments={ward.fieldComments}
                overridden={overriddenFields(job.overrides)}
                location={ward.location}
              />
            </CardBody>
          </Card>
          {about.text ? (
            <section id="about" className="flex scroll-mt-32 flex-col gap-3 rounded-card border border-line-200 bg-sand-100 p-6 md:p-8" lang={about.translated ? undefined : 'de-CH'}>
              <h2 className="text-h2">{t('about')}</h2>
              <p className="prose-k whitespace-pre-line text-body text-ink-900">{about.text}</p>
              {about.translated ? <p className="text-micro text-ink-500">{t('autoTranslated')}</p> : null}
            </section>
          ) : null}
        </article>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <section id="apply" aria-labelledby="apply-title" className="flex scroll-mt-24 flex-col gap-4 rounded-card border-2 border-ink-900 bg-surface-0 p-5">
            <div className="flex flex-col gap-1">
              <h2 id="apply-title" className="text-h3">{x('apply')}</h2>
              <p className="text-body-s text-ink-700">{x('applyLead')}</p>
            </div>
            <ApplyPanel jobId={job.id} state={applyState} />
            <SaveButton jobId={job.id} initial={!!candidate?.savedJobs.length} signedIn={!!session} />
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
          <p className="flex items-start gap-2 rounded-card bg-surface-100 p-4 text-micro text-ink-700">
            <Icon icon={Building2} size={16} className="mt-0.5 shrink-0 text-accent-700" />
            {t('direct')}
          </p>
        </aside>
      </div>
    </>
  );
}
