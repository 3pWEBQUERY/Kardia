import { ArrowRight, ArrowUpRight, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { decodeFilter, encodeFilter, formatNumber } from '@kardia/core';
import { Profession } from '@kardia/db/enums';
import { Button, Checkbox, ConditionChip, Icon, Select, type RosterCode } from '@kardia/ui';

import { searchSentence, startSearch } from '@/app/actions/search';
import { AlpineBand, ContourField, DotField, PulseLine } from '@/components/brand/Artwork';
import { DEPARTMENT_ICONS } from '@/components/brand/departmentIcons';
import { JobTeaser } from '@/components/domain/JobTeaser';
import { Roster } from '@/components/domain/Roster';
import { searchJobs } from '@/server/services/search';
import { platformStats } from '@/server/services/showcase';

const R1_PROFESSIONS = [Profession.NURSE_HF_FH, Profession.FAGE, Profession.AGS, Profession.NURSING_AID_SRK, Profession.PHYSICIAN, Profession.MPA];

/** Beispiel-Dienstrhythmus für die Erklärung (vier Wochen, keine Nächte). */
const SAMPLE_ROSTER: RosterCode[] = ['F', 'F', 'S', 'S', 'X', 'X', 'X', 'X', 'F', 'F', 'F', 'S', 'X', 'X', 'S', 'S', 'X', 'X', 'F', 'F', 'F', 'X', 'F', 'F', 'S', 'S', 'X', 'X'];

/** Startseite: Hero mit drei Fragen (PRD 7.3), Fachbereiche, Ablauf, neue Stellen, Arbeitgeber. */
export default async function HomePage() {
  const t = await getTranslations('public.home');
  const e = await getTranslations('enums');
  const c = await getTranslations('common');
  const [stats, latest] = await Promise.all([
    platformStats(),
    searchJobs({ ...decodeFilter(undefined), sort: 'newest' }, { cursor: null, limit: 6 }),
  ]);
  const departments = stats.departments.filter((d) => d.jobs > 0);
  const deptHref = (d: string) => `/search?f=${encodeFilter({ departments: [d as never] })}`;

  return (
    <>
      {/* Hero: Markengrafik als Hintergrundbild, Suche im Vordergrund */}
      <section className="relative isolate overflow-hidden bg-brand-950">
        <DotField className="absolute inset-y-0 left-0 -z-10 h-full w-1/2" />
        <ContourField className="absolute inset-y-0 right-0 -z-10 h-full w-full lg:w-2/3" />
        <AlpineBand className="absolute inset-x-0 bottom-0 -z-10 h-[clamp(220px,30vw,440px)] w-full" />
        <div className="mx-auto grid max-w-content gap-10 px-4 pt-14 pb-[clamp(150px,19vw,280px)] md:px-8 md:pt-20 lg:grid-cols-[1.35fr_1fr] lg:items-start lg:gap-14">
          <div className="flex min-w-0 flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-chip border border-brand-700 bg-brand-900 px-3 py-1 text-caption text-brand-100">
              <span className="size-2 rounded-full bg-pulse-500" aria-hidden />
              {t('eyebrow')}
            </span>
            <h1 className="text-hero text-brand-100">{t('heroTitle')}</h1>
            <p className="max-w-xl text-body text-brand-300 md:text-h3 md:font-normal">{t('lead')}</p>
            <dl className="mt-2 grid max-w-lg grid-cols-3 gap-3 border-t border-brand-800 pt-6 sm:gap-4">
              {(
                [
                  ['jobs', stats.jobs],
                  ['wards', stats.wards],
                  ['organizations', stats.organizations],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1">
                  <dt className="order-2 text-micro break-words text-brand-300">{t(`stats.${k}`)}</dt>
                  <dd className="order-1 text-display-l text-brand-100 tabular">{formatNumber(v)}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex min-w-0 flex-col gap-4 rounded-card border border-brand-700 bg-surface-0 p-5 md:p-7">
            <h2 className="text-h3 text-ink-900">{t('searchCardTitle')}</h2>
            <form action={startSearch} className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  name="profession"
                  label={t('q1')}
                  placeholder={t('anyProfession')}
                  options={R1_PROFESSIONS.map((p) => ({ value: p, label: e(`Profession.${p}`) }))}
                />
                <Select
                  name="workload"
                  label={t('q2')}
                  placeholder={t('anyWorkload')}
                  options={[100, 90, 80, 70, 60, 50, 40, 30, 20].map((v) => ({ value: String(v), label: `${v} %` }))}
                />
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-caption text-ink-700">{t('q3')}</legend>
                <div className="grid gap-1 sm:grid-cols-2">
                  <Checkbox name="dealbreaker" value="nights" label={t('dealbreakers.nights')} />
                  <Checkbox name="dealbreaker" value="weekends" label={t('dealbreakers.weekends')} />
                  <Checkbox name="dealbreaker" value="splitShifts" label={t('dealbreakers.splitShifts')} />
                  <Checkbox name="dealbreaker" value="shortNotice" label={t('dealbreakers.shortNotice')} />
                </div>
              </fieldset>
              <div className="flex flex-col gap-2">
                <Button type="submit" variant="primary" size="l" className="w-full">
                  {t('submit')}
                  <Icon icon={ArrowRight} size={18} />
                </Button>
                <span className="text-center text-micro text-ink-500">{t('noAccount')}</span>
              </div>
            </form>
            <div className="flex items-center gap-3 text-micro text-ink-500" aria-hidden>
              <span className="h-px flex-1 bg-line-200" />
              {t('or')}
              <span className="h-px flex-1 bg-line-200" />
            </div>
            <form action={searchSentence} className="flex flex-col gap-2">
              <label htmlFor="sentence" className="flex items-center gap-1.5 text-caption text-ink-700">
                <Icon icon={Sparkles} size={14} className="text-accent-600" />
                {t('sentenceLabel')}
              </label>
              <div className="flex gap-2">
                <input
                  id="sentence"
                  name="q"
                  maxLength={300}
                  placeholder={t('sentencePlaceholder')}
                  className="h-control-l min-w-0 flex-1 rounded-control border border-line-300 bg-surface-0 px-3 text-body placeholder:text-ink-500"
                />
                <Button type="submit" size="l">
                  {t('sentenceSubmit')}
                </Button>
              </div>
              <p className="text-micro text-ink-500">{t('sentenceHint')}</p>
            </form>
          </div>
        </div>
      </section>

      {/* Fachbereiche als Laufband */}
      {departments.length ? (
        <section aria-labelledby="departments" className="border-b border-sand-200 bg-sand-100">
          <h2 id="departments" className="sr-only">
            {t('departmentsTitle')}
          </h2>
          <div className="overflow-hidden py-5">
            <ul className="k-marquee flex w-max gap-3 px-4 hover:[animation-play-state:paused]">
              {[...departments, ...departments].map((d, i) => (
                <li key={`${d.department}-${i}`} aria-hidden={i >= departments.length ? true : undefined}>
                  <Link
                    href={deptHref(d.department)}
                    tabIndex={i >= departments.length ? -1 : undefined}
                    className="inline-flex items-center gap-3 rounded-chip border border-sand-200 bg-surface-0 py-2 pr-4 pl-2 text-body-s font-medium text-ink-900 transition-colors hover:border-accent-600"
                  >
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-accent-50 text-accent-700">
                      <Icon icon={DEPARTMENT_ICONS[d.department]} size={16} />
                    </span>
                    {e(`Department.${d.department}`)}
                    <span className="text-micro text-ink-500 tabular">{t('departmentJobs', { count: d.jobs })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* So funktioniert's */}
      <section aria-labelledby="how" className="mx-auto flex max-w-content flex-col gap-10 px-4 py-20 md:px-8 md:py-28">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 id="how" className="text-display-l text-ink-900">
            {t('howTitle')}
          </h2>
          <p className="text-body text-ink-700 md:text-h3 md:font-normal">{t('howLead')}</p>
        </div>
        <ol className="grid gap-6 lg:grid-cols-3">
          <li className="flex flex-col gap-5 rounded-card border border-line-200 bg-surface-0 p-6">
            <StepHead n={1} title={t('steps.one.title')} body={t('steps.one.body')} />
            <div className="mt-auto flex flex-col gap-2 rounded-control bg-surface-50 p-4">
              <ConditionChip state="met" stateLabel={c('states.met')}>{c('conditions.noNights.wanted', { value: '', transport: '' })}</ConditionChip>
              <ConditionChip state="met" stateLabel={c('states.met')}>{c('conditions.minRosterLeadWeeks.wanted', { value: 6, transport: '' })}</ConditionChip>
              <ConditionChip state="unknown" stateLabel={c('states.unknown')}>{c('conditions.minSalary.wanted', { value: 90000, transport: '' })}</ConditionChip>
            </div>
          </li>
          <li className="flex flex-col gap-5 rounded-card border border-line-200 bg-surface-0 p-6">
            <StepHead n={2} title={t('steps.two.title')} body={t('steps.two.body')} />
            <div className="mt-auto rounded-control bg-surface-50 p-4">
              <Roster pattern={SAMPLE_ROSTER} workloadPct={80} compact showLegend={false} />
            </div>
          </li>
          <li className="flex flex-col gap-5 rounded-card border border-line-200 bg-surface-0 p-6">
            <StepHead n={3} title={t('steps.three.title')} body={t('steps.three.body')} />
            <ul className="mt-auto flex flex-col gap-2 rounded-control bg-surface-50 p-4 text-body-s text-ink-900">
              {[e('CredentialType.DIPLOMA'), e('CredentialType.REGISTRY_ENTRY'), e('CredentialType.LANGUAGE_CERTIFICATE')].map((label) => (
                <li key={label} className="flex items-center gap-2">
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-ok-600 text-on-accent">
                    <Icon icon={Check} size={12} />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </li>
        </ol>
      </section>

      {/* Neue Stellen */}
      {latest.hits.length ? (
        <section aria-labelledby="latest" className="border-y border-line-200 bg-surface-0">
          <div className="mx-auto flex max-w-content flex-col gap-8 px-4 py-20 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="latest" className="text-display-l text-ink-900">
                {t('latestTitle')}
              </h2>
              <Link href="/search" className="inline-flex items-center gap-1 text-body font-medium text-accent-600 hover:underline">
                {t('latestAll')}
                <Icon icon={ArrowRight} size={18} />
              </Link>
            </div>
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {latest.hits.map((hit) => (
                <li key={hit.jobId}>
                  <JobTeaser hit={hit} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Haltung als Statement */}
      <section className="bg-accent-600 text-on-accent">
        <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-20 md:px-8 md:py-24">
          <p className="max-w-4xl text-display-l">{t('statement')}</p>
          <PulseLine className="h-10 w-full text-on-accent" peakAt={0.3} />
        </div>
      </section>

      {/* Was Kardia anders macht */}
      <section aria-labelledby="usp" className="bg-sand-100">
        <div className="mx-auto grid max-w-content gap-10 px-4 py-20 md:px-8 md:py-24 lg:grid-cols-[1fr_2fr]">
          <h2 id="usp" className="text-display-l text-ink-900">
            {t('uspTitle')}
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {(['ward', 'roster', 'reality'] as const).map((k, i) => (
              <div key={k} className="flex flex-col gap-3 border-t-2 border-ink-900 pt-5">
                <span className="text-micro font-semibold text-accent-600 tabular">0{i + 1}</span>
                <h3 className="text-h3 text-ink-900">{t(`usp.${k}.title`)}</h3>
                <p className="text-body-s text-ink-700">{t(`usp.${k}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Für Arbeitgeber */}
      <section className="mx-auto max-w-content px-4 py-20 md:px-8 md:py-28">
        <div className="relative isolate grid overflow-hidden rounded-card bg-brand-900 md:grid-cols-[1.3fr_1fr]">
          <ContourField className="absolute inset-0 -z-10 size-full" />
          <div className="flex flex-col gap-5 p-8 md:p-12">
            <h2 className="text-display-l text-brand-100">{t('employerTitle')}</h2>
            <p className="max-w-xl text-body text-brand-300">{t('employerBody')}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/employers"
                className="inline-flex h-control-l items-center gap-2 rounded-control bg-pulse-500 px-6 text-body font-semibold text-brand-950 transition-colors hover:bg-brand-100"
              >
                {t('employerButton')}
                <Icon icon={ArrowUpRight} size={18} />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-control-l items-center rounded-control border border-brand-700 px-6 text-body font-medium text-brand-100 transition-colors hover:bg-brand-800"
              >
                {t('pricingButton')}
              </Link>
            </div>
          </div>
          <div className="hidden items-end p-8 md:flex md:p-12">
            <div className="w-full rounded-card border border-brand-700 bg-surface-0 p-5">
              <Roster pattern={SAMPLE_ROSTER} workloadPct={100} compact />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function StepHead({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-brand-950 text-h3 text-brand-100 tabular">{n}</span>
      <h3 className="text-h3 text-ink-900">{title}</h3>
      <p className="text-body-s text-ink-700">{body}</p>
    </div>
  );
}
