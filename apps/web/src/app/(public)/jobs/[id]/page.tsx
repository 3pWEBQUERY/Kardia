import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { EVENTS, encodeGeohash, formatPlainDate, isStale, jobPostingJsonLd, overriddenFields } from '@kardia/core';
import { Callout, Card, CardBody, CardHeader, StatusChip } from '@kardia/ui';

import { ApplyPanel } from '@/components/domain/ApplyPanel';
import { CommuteInfo } from '@/components/domain/CommuteInfo';
import { Roster } from '@/components/domain/Roster';
import { SaveButton } from '@/components/domain/SaveButton';
import { WardProfileView } from '@/components/domain/WardProfileView';
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
  const session = await getSession();
  const candidate = session ? await db.candidateProfile.findUnique({ where: { userId: session.user.id }, include: { savedJobs: { where: { jobId: id } }, applications: { where: { jobId: id } } } }) : null;
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

  return (
    <div className="mx-auto grid max-w-content gap-8 px-4 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <article className="flex min-w-0 flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-caption text-ink-700">
            <Link href={`/organizations/${ward.location.organization.id}`} className="hover:text-accent-700">
              {ward.location.organization.name}
            </Link>{' '}
            · <Link href={`/wards/${ward.id}`} className="hover:text-accent-700">{ward.name}</Link> · {ward.location.city}
          </p>
          <h1 className="text-h1">{job.title}</h1>
          <div className="flex flex-wrap gap-2">
            <StatusChip>{e(`Profession.${job.profession}`)}</StatusChip>
            <StatusChip>{e(`Department.${ward.department}`)}</StatusChip>
            <StatusChip>{job.workloadMinPct === job.workloadMaxPct ? `${job.workloadMinPct} %` : `${job.workloadMinPct}–${job.workloadMaxPct} %`}</StatusChip>
            {job.startDate ? <StatusChip>{t('start', { date: formatPlainDate(job.startDate) })}</StatusChip> : null}
            {job.allowsPendingRecog ? <StatusChip tone="accent">{t('pendingRecog')}</StatusChip> : null}
            {isStale(ward.confirmedAt) ? <StatusChip tone="warn">{t('stale')}</StatusChip> : null}
          </div>
        </header>

        <Card>
          <CardHeader title={t('rhythm')} meta={t('rhythmHint')} />
          <CardBody>
            <Roster pattern={ward.rosterPattern} workloadPct={job.workloadMaxPct} />
          </CardBody>
        </Card>

        {job.profession === 'PHYSICIAN' ? (
          recognizedTraining ? (
            <Card>
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
            <Callout tone="warn">{t('noTraining')}</Callout>
          )
        ) : null}

        <Card>
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
        {ward.description ? (
          <section className="prose-k">
            <h2 className="text-h2">{t('about')}</h2>
            <p>{ward.description}</p>
          </section>
        ) : null}
      </article>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardBody className="flex flex-col gap-4">
            <ApplyPanel jobId={job.id} state={applyState} />
            <SaveButton jobId={job.id} initial={!!candidate?.savedJobs.length} signedIn={!!session} />
          </CardBody>
        </Card>
        {candidate?.homeLat != null && candidate.homeLng != null ? (
          <Card>
            <CardHeader title={t('commute')} />
            <CardBody>
              <CommuteInfo origin={encodeGeohash(candidate.homeLat, candidate.homeLng)} wardId={ward.id} />
            </CardBody>
          </Card>
        ) : null}
        <p className="text-micro text-ink-500">{t('direct')}</p>
      </aside>
    </div>
  );
}
