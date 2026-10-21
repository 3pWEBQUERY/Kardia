import { BadgeCheck, CalendarClock, ChartColumn, Columns3, Fingerprint, Gift, Landmark, MapPinned, Sparkles, Store, Building2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { FOUNDING_PARTNER } from '@kardia/core';
import { ConditionChip, Icon, StatusChip, type RosterCode } from '@kardia/ui';

import { Roster } from '@/components/domain/Roster';
import { BrandCta, BrandHero, BrandLink, Faq, SectionTitle } from '@/components/marketing/Marketing';
import { platformStats } from '@/server/services/showcase';

import type { LucideIcon } from 'lucide-react';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('public.employers');
  return { title: t('title'), description: t('lead') };
}

const POINTS = [
  ['direct', Building2],
  ['import', Sparkles],
  ['pipeline', Columns3],
  ['pool', CalendarClock],
  ['marketplace', Store],
  ['benchmark', ChartColumn],
] as const satisfies readonly (readonly [string, LucideIcon])[];

const SAMPLE_ROSTER: RosterCode[] = ['F', 'F', 'S', 'S', 'X', 'X', 'X', 'N', 'N', 'X', 'X', 'F', 'F', 'F', 'S', 'S', 'X', 'X', 'F', 'F', 'X', 'X', 'X', 'N', 'N', 'N', 'X', 'X'];

/** Für Arbeitgeber: Inserat in 10 Minuten, direkt besetzen statt Agenturaufschlag. */
export default async function EmployersPage() {
  const t = await getTranslations('public.employers');
  const e = await getTranslations('enums');
  const c = await getTranslations('common');
  const stats = await platformStats();
  const faq = t.raw('faq') as { q: string; a: string }[];

  const pipeline: { status: 'NEW' | 'SCREENED' | 'INTERVIEW'; cards: string[] }[] = [
    { status: 'NEW', cards: [t('preview.candidate', { years: 8 }), t('preview.candidateFage', { years: 3 })] },
    { status: 'SCREENED', cards: [t('preview.candidate', { years: 12 })] },
    { status: 'INTERVIEW', cards: [t('preview.candidate', { years: 5 })] },
  ];
  const bench: { key: 'lead' | 'weekends' | 'education'; yours: number; median: number; max: number }[] = [
    { key: 'lead', yours: 6, median: 4, max: 8 },
    { key: 'weekends', yours: 1.5, median: 2, max: 3 },
    { key: 'education', yours: 5, median: 3, max: 6 },
  ];

  return (
    <>
      <BrandHero
        eyebrow={t('eyebrow')}
        title={t('title')}
        lead={t('lead')}
        actions={
          <>
            <BrandLink href="/employer/onboarding">{t('cta')}</BrandLink>
            <BrandLink href="/pricing" variant="outline">
              {t('pricing')}
            </BrandLink>
          </>
        }
        stats={[
          { value: stats.jobs, label: t('stats.jobs') },
          { value: stats.wards, label: t('stats.wards') },
          { value: stats.organizations, label: t('stats.organizations') },
        ]}
      />

      {/* Drei Schritte */}
      <section aria-labelledby="steps" className="border-b border-sand-200 bg-sand-100">
        <div className="mx-auto grid max-w-content gap-10 px-4 py-16 md:px-8 lg:grid-cols-[1fr_2fr]">
          <h2 id="steps" className="text-display-l text-ink-900">
            {t('stepsTitle')}
          </h2>
          <ol className="grid gap-8 sm:grid-cols-3">
            {(['register', 'import', 'hire'] as const).map((k, i) => (
              <li key={k} className="flex flex-col gap-3 border-t-2 border-ink-900 pt-5">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-brand-950 text-body font-semibold text-brand-100 tabular">{i + 1}</span>
                <h3 className="text-h3 text-ink-900">{t(`steps.${k}.title`)}</h3>
                <p className="text-body-s text-ink-700">{t(`steps.${k}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Funktionen */}
      <section aria-labelledby="features" className="mx-auto flex max-w-content flex-col gap-12 px-4 py-20 md:px-8 md:py-28">
        <SectionTitle id="features" title={t('featuresTitle')} lead={t('featuresLead')} />
        <ul className="grid gap-px overflow-hidden rounded-card border border-line-200 bg-line-200 sm:grid-cols-2 lg:grid-cols-3">
          {POINTS.map(([k, icon]) => (
            <li key={k} className="flex flex-col gap-4 bg-surface-0 p-7">
              <span className="inline-flex size-12 items-center justify-center rounded-control bg-brand-950 text-pulse-500">
                <Icon icon={icon} size={22} />
              </span>
              <h3 className="text-h3 text-ink-900">{t(`points.${k}.title`)}</h3>
              <p className="text-body-s text-ink-700">{t(`points.${k}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Produktausschnitt aus echten Bausteinen */}
      <section aria-labelledby="preview" className="border-y border-line-200 bg-surface-0">
        <div className="mx-auto flex max-w-content flex-col gap-12 px-4 py-20 md:px-8 md:py-28">
          <SectionTitle id="preview" title={t('previewTitle')} lead={t('previewLead')} />
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Pipeline */}
            <figure className="flex flex-col gap-5 rounded-card border border-line-200 bg-surface-50 p-6 lg:col-span-3">
              <figcaption className="flex flex-col gap-1">
                <span className="text-h3 text-ink-900">{t('preview.pipeline.title')}</span>
                <span className="text-body-s text-ink-700">{t('preview.pipeline.body')}</span>
              </figcaption>
              <div className="mt-auto grid grid-cols-1 gap-2 sm:grid-cols-3">
                {pipeline.map((col) => (
                  <div key={col.status} className="flex flex-col gap-2 rounded-control border border-line-300 bg-surface-0 p-2">
                    <div className="flex items-center justify-between px-1 text-micro text-ink-700">
                      <span className="font-semibold">{e(`ApplicationStatus.${col.status}`)}</span>
                      <span className="tabular text-ink-500">{col.cards.length}</span>
                    </div>
                    {col.cards.map((card) => (
                      <div key={card} className="flex flex-col gap-1.5 rounded-control border border-line-200 bg-surface-0 p-2">
                        <span className="text-caption font-medium text-ink-900">{card}</span>
                        <span className="inline-flex items-center gap-1 text-micro text-ok-600">
                          <Icon icon={BadgeCheck} size={12} />
                          {t('preview.passOk')}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </figure>

            {/* Stationsprofil */}
            <figure className="flex flex-col gap-5 rounded-card border border-line-200 bg-surface-50 p-6 lg:col-span-2">
              <figcaption className="flex flex-col gap-1">
                <span className="text-h3 text-ink-900">{t('preview.profile.title')}</span>
                <span className="text-body-s text-ink-700">{t('preview.profile.body')}</span>
              </figcaption>
              <div className="mt-auto flex flex-col gap-3 rounded-control border border-line-300 bg-surface-0 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-body-s font-semibold text-ink-900">{t('preview.ward')}</span>
                  <StatusChip tone="ok">{c('states.verified')}</StatusChip>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <ConditionChip state="met" stateLabel={c('states.met')}>
                    {c('conditions.minRosterLeadWeeks.wanted', { value: 6, transport: '' })}
                  </ConditionChip>
                  <ConditionChip state="met" stateLabel={c('states.met')}>
                    {c('conditions.maxWeekendsPerMonth.wanted', { value: 2, transport: '' })}
                  </ConditionChip>
                </div>
                <Roster pattern={SAMPLE_ROSTER} workloadPct={100} compact showLegend={false} />
              </div>
            </figure>

            {/* Benchmark */}
            <figure className="flex flex-col gap-5 rounded-card border border-line-200 bg-surface-50 p-6 lg:col-span-5 lg:flex-row lg:items-center lg:gap-10">
              <figcaption className="flex flex-col gap-1 lg:w-72 lg:shrink-0">
                <span className="text-h3 text-ink-900">{t('preview.benchmark.title')}</span>
                <span className="text-body-s text-ink-700">{t('preview.benchmark.body')}</span>
              </figcaption>
              <div className="mt-auto grid flex-1 gap-4 rounded-control border border-line-300 bg-surface-0 p-4 sm:grid-cols-3 lg:mt-0">
                <div className="flex gap-4 text-micro text-ink-700 sm:col-span-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-accent-600" aria-hidden />
                    {t('preview.yours')}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-line-300" aria-hidden />
                    {t('preview.median')}
                  </span>
                </div>
                {bench.map((b) => (
                  <dl key={b.key} className="flex flex-col gap-1.5">
                    <dt className="text-micro font-medium text-ink-900">{t(`preview.rows.${b.key}`)}</dt>
                    <dd className="flex items-center gap-2">
                      <span className="h-2.5 rounded-sm bg-accent-600" style={{ width: `${(b.yours / b.max) * 75}%` }} />
                      <span className="text-micro text-ink-700 tabular">{b.yours}</span>
                    </dd>
                    <dd className="flex items-center gap-2">
                      <span className="h-2.5 rounded-sm bg-line-300" style={{ width: `${(b.median / b.max) * 75}%` }} />
                      <span className="text-micro text-ink-500 tabular">{b.median}</span>
                    </dd>
                  </dl>
                ))}
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* Agenturfrei + Gründungspartner */}
      <section className="mx-auto grid max-w-content gap-6 px-4 py-20 md:px-8 md:py-28 lg:grid-cols-2">
        <div className="flex flex-col gap-6 rounded-card border border-line-200 bg-surface-0 p-8 md:p-10">
          <span className="inline-flex size-12 items-center justify-center rounded-control bg-accent-50 text-accent-700">
            <Icon icon={Landmark} size={22} />
          </span>
          <h2 className="text-display text-ink-900">{t('agencyTitle')}</h2>
          <p className="text-body text-ink-700">{t('agencyBody')}</p>
          <ul className="mt-auto flex flex-col gap-3 border-t border-line-200 pt-5">
            {(
              [
                ['uid', Fingerprint],
                ['seco', BadgeCheck],
                ['address', MapPinned],
              ] as const
            ).map(([k, icon]) => (
              <li key={k} className="flex items-center gap-3 text-body-s font-medium text-ink-900">
                <Icon icon={icon} size={18} className="text-accent-600" />
                {t(`agencyPoints.${k}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-6 rounded-card bg-pulse-500 p-8 text-brand-950 md:p-10">
          <span className="inline-flex size-12 items-center justify-center rounded-control bg-brand-950 text-pulse-500">
            <Icon icon={Gift} size={22} />
          </span>
          <h2 className="text-display">{t('foundingTitle')}</h2>
          <p className="text-body">{t('foundingBody')}</p>
          <p className="text-h3 tabular">{t('foundingSlots', { slots: FOUNDING_PARTNER.slots, months: FOUNDING_PARTNER.months })}</p>
          <div className="mt-auto">
            <a
              href="/employer/onboarding"
              className="inline-flex h-control-l items-center rounded-control bg-brand-950 px-6 text-body font-semibold text-brand-100 transition-colors hover:bg-brand-800"
            >
              {t('foundingCta')}
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="border-t border-sand-200 bg-sand-100">
        <div className="mx-auto grid max-w-content gap-10 px-4 py-20 md:px-8 md:py-24 lg:grid-cols-[1fr_2fr]">
          <h2 id="faq" className="text-display-l text-ink-900">
            {t('faqTitle')}
          </h2>
          <Faq items={faq} />
        </div>
      </section>

      <BrandCta
        title={t('ctaTitle')}
        body={t('ctaBody')}
        actions={
          <>
            <BrandLink href="/employer/onboarding">{t('cta')}</BrandLink>
            <BrandLink href="/pricing" variant="outline">
              {t('pricing')}
            </BrandLink>
          </>
        }
      />
    </>
  );
}
