import { ArrowRight, BadgeCheck, MapPin } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { formatChfRange, formatNumber } from '@kardia/core';
import { Icon } from '@kardia/ui';

import { ContourField } from '@/components/brand/Artwork';
import { DEPARTMENT_ICONS } from '@/components/brand/departmentIcons';
import { OrgLogo } from '@/components/domain/OrgLogo';
import { Eyebrow } from '@/components/marketing/Marketing';
import { db } from '@/server/db';

import type { Metadata } from 'next';

async function load(id: string) {
  return db.organization.findFirst({
    where: { id, verification: 'VERIFIED' },
    include: { locations: { include: { wards: { include: { _count: { select: { jobs: { where: { status: 'PUBLISHED' } } } } }, orderBy: { name: 'asc' } } }, orderBy: { name: 'asc' } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const org = await load((await params).id);
  return org ? { title: org.name } : {};
}

/** Institution: Standorte → Stationen. Die Bedingungen hängen an der Station, nicht an der Institution. */
export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const org = await load((await params).id);
  if (!org) notFound();
  const t = await getTranslations('public.organization');
  const e = await getTranslations('enums');
  const wards = org.locations.flatMap((l) => l.wards);
  const openJobs = wards.reduce((sum, w) => sum + w._count.jobs, 0);
  // Logo nur, wenn geprüft (READY); sonst Initialen statt leerer Fläche.
  const logoReady = org.logoFileId ? (await db.file.findUnique({ where: { id: org.logoFileId }, select: { status: true } }))?.status === 'READY' : false;
  const initials = org.name
    .replace(/\(.*?\)/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <>
      <section className="relative isolate overflow-hidden bg-brand-950">
        <ContourField className="absolute inset-0 -z-10 size-full" />
        <div className="mx-auto flex max-w-content flex-col gap-8 px-4 py-14 md:px-8 md:py-20">
          <Eyebrow inverse>{t('eyebrow')}</Eyebrow>
          <div className="flex flex-wrap items-center gap-5">
            {logoReady ? (
              <span className="rounded-card bg-surface-0 p-2">
                <OrgLogo fileId={org.logoFileId} size={64} />
              </span>
            ) : (
              <span className="inline-flex size-20 items-center justify-center rounded-card bg-pulse-500 text-display text-brand-950" aria-hidden>
                {initials}
              </span>
            )}
            <div className="flex flex-col gap-2">
              <h1 className="text-display-l text-brand-100">{org.name}</h1>
              <span className="inline-flex w-fit items-center gap-1.5 text-body-s text-brand-300">
                <Icon icon={BadgeCheck} size={16} className="text-pulse-500" />
                {t('verified')}
              </span>
            </div>
          </div>
          <p className="max-w-2xl text-body text-brand-300">{t('lead')}</p>
          <dl className="grid max-w-xl grid-cols-3 gap-4 border-t border-brand-800 pt-6">
            {(
              [
                [t('locations', { count: org.locations.length }), org.locations.length],
                [t('wards', { count: wards.length }), wards.length],
                [t('openJobs', { count: openJobs }), openJobs],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1">
                <dt className="order-2 text-micro text-brand-300">{label}</dt>
                <dd className="order-1 text-display-l text-brand-100 tabular">{formatNumber(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="wards" className="mx-auto flex max-w-content flex-col gap-10 px-4 py-16 md:px-8 md:py-20">
        <h2 id="wards" className="text-display text-ink-900">
          {t('wardsTitle')}
        </h2>
        {org.locations.map((loc) => (
          <div key={loc.id} className="flex flex-col gap-4">
            <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line-300 pb-3">
              <span className="text-h3 text-ink-900">{loc.name}</span>
              <span className="inline-flex items-center gap-1 text-body-s text-ink-500">
                <Icon icon={MapPin} size={14} />
                {`${loc.street}, ${loc.postalCode} ${loc.city}`}
              </span>
            </h3>
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loc.wards.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/wards/${w.id}`}
                    className="group flex h-full flex-col gap-4 rounded-card border border-line-200 bg-surface-0 p-5 transition-colors hover:border-accent-600"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-control bg-accent-50 text-accent-700">
                        <Icon icon={DEPARTMENT_ICONS[w.department]} size={20} />
                      </span>
                      <div className="flex flex-col">
                        <span className="text-micro font-semibold tracking-wide text-accent-600 uppercase">{e(`Department.${w.department}`)}</span>
                        <span className="text-h3 text-ink-900">{w.name}</span>
                      </div>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-body-s">
                      <span className="rounded-chip bg-surface-100 px-3 py-1 font-medium text-ink-900 tabular">{formatChfRange(w.salaryMinChf, w.salaryMaxChf)}</span>
                      <span className="text-ink-700">{t('jobs', { count: w._count.jobs })}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-body-s font-medium text-accent-600 group-hover:underline">
                      {t('toWard')}
                      <Icon icon={ArrowRight} size={16} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}
