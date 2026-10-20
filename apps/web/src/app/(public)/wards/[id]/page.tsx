import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { BENCHMARK_MIN_PEERS, formatDate, isStale, type PartialWardProfile } from '@kardia/core';
import { Button, Card, CardBody, CardHeader, EmptyState, StatusChip } from '@kardia/ui';

import { AskTeam } from '@/components/domain/AskTeam';
import { Roster } from '@/components/domain/Roster';
import { WardProfileView } from '@/components/domain/WardProfileView';
import { formatFieldValue } from '@/lib/fieldValue';
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
  const [t, tf, te, tc] = await Promise.all([getTranslations('public.ward'), getTranslations('fields'), getTranslations('enums'), getTranslations('common')]);
  const session = await getSession();
  const fmt = (k: string, v: unknown) => formatFieldValue(k, v, { fields: tf, enums: te, common: tc });

  return (
    <div className="mx-auto flex max-w-content flex-col gap-8 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-caption text-ink-700">
          <Link href={`/organizations/${ward.location.organization.id}`} className="hover:text-accent-700">{ward.location.organization.name}</Link> · {ward.location.name} · {ward.location.city}
        </p>
        <h1 className="text-h1">{ward.name}</h1>
        <div className="flex flex-wrap gap-2">
          <StatusChip>{te(`Department.${ward.department}`)}</StatusChip>
          <StatusChip>{tc('confirmedBy', { date: formatDate(ward.confirmedAt) })}</StatusChip>
          {isStale(ward.confirmedAt) ? <StatusChip tone="warn">{tc('states.stale')}</StatusChip> : null}
          {ward.reentryFriendly ? <StatusChip tone="accent">{tf('reentryFriendly')}</StatusChip> : null}
          {ward._count.verifiedEmployees > 0 ? <StatusChip>{t('verifiedEmployees', { count: ward._count.verifiedEmployees })}</StatusChip> : null}
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title={t('rhythm')} />
            <CardBody>
              <Roster pattern={ward.rosterPattern} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('profile')} meta={t('realityHint')} />
            <CardBody>
              <WardProfileView profile={ward as unknown as PartialWardProfile} confirmedAt={ward.confirmedAt} reality={reality} comments={ward.fieldComments} location={ward.location} />
            </CardBody>
          </Card>
          {ward.benchmarks.length ? (
            <Card>
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
            <Card>
              <CardHeader title={t('videos')} />
              <CardBody className="grid gap-4 sm:grid-cols-2">
                {ward.videos.map((v) => (
                  <video key={v.id} controls preload="none" className="w-full rounded-control border border-line-300" poster={v.posterId ? `/api/files/${v.posterId}` : undefined}>
                    <source src={`/api/files/${v.fileId}`} type="video/mp4" />
                    <track kind="captions" src={`/api/files/${v.captionsId}`} srcLang="de" label="Deutsch" default />
                  </video>
                ))}
              </CardBody>
            </Card>
          ) : null}
          <Card>
            <CardHeader title={t('questions')} meta={t('questionsHint')} />
            <CardBody className="flex flex-col gap-4">
              {ward.questions.length === 0 ? <EmptyState>{t('noQuestions')}</EmptyState> : null}
              {ward.questions.map((q) => (
                <div key={q.id} className="flex flex-col gap-1 border-b border-line-200 pb-3">
                  <p className="text-body-s font-medium">{q.body}</p>
                  {q.answer ? <p className="text-body-s text-ink-700">{q.answer}</p> : <p className="text-micro text-ink-500">{t('unanswered')}</p>}
                  {q.answeredAt ? (
                    <p className="text-micro text-ink-500">{t('answeredAfter', { hours: Math.max(1, Math.round((q.answeredAt.getTime() - q.createdAt.getTime()) / 3600_000)) })}</p>
                  ) : null}
                </div>
              ))}
              <AskTeam wardId={ward.id} signedIn={!!session} />
            </CardBody>
          </Card>
        </div>
        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader title={t('openJobs', { count: ward.jobs.length })} />
            <CardBody className="flex flex-col gap-2">
              {ward.jobs.length === 0 ? <EmptyState>{t('noJobs')}</EmptyState> : null}
              {ward.jobs.map((j) => (
                <Link key={j.id} href={`/jobs/${j.id}`} className="flex flex-col rounded-control border border-line-300 px-3 py-2 hover:border-ink-500">
                  <span className="text-body-s font-medium">{j.title}</span>
                  <span className="text-micro text-ink-500">{j.workloadMinPct}–{j.workloadMaxPct} %</span>
                </Link>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('workHere')} />
            <CardBody className="flex flex-col gap-2">
              <p className="text-body-s text-ink-700">{t('workHereBody')}</p>
              <Button asChild>
                <Link href={`/wards/${ward.id}/team`}>{t('workHereAction')}</Link>
              </Button>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
