import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import Link from 'next/link';

import { Icon, cx } from '@kardia/ui';

import { ContourField } from '@/components/brand/Artwork';
import { DEPARTMENT_ICONS } from '@/components/brand/departmentIcons';

import type { Department } from '@kardia/db/enums';
import type { ReactNode } from 'react';

export interface HeroFact {
  label: string;
  value: string;
}

export interface HeroChip {
  label: string;
  /** `signal`: Hinweis (z. B. veraltet) mit Pulspunkt. */
  tone?: 'default' | 'signal';
}

/**
 * Kopf der Detailseiten (Stelle, Station) auf Markenfläche: Fachbereich, Titel,
 * Arbeitgeber und Ort, Kennzahlen in grosser Schrift und die Haupthandlung.
 * Flach – Höhenlinien als Hintergrund, keine Schatten (PRD 8.1).
 */
export function DetailHero({
  department,
  departmentLabel,
  back,
  logo,
  org,
  site,
  city,
  title,
  chips,
  facts,
  cta,
  aside,
}: {
  department: Department;
  departmentLabel: string;
  back?: { href: string; label: string };
  logo?: ReactNode;
  org: { href: string; label: string };
  /** Station bzw. Standort (Link erlaubt); der Ort folgt mit Kartennadel. */
  site: ReactNode;
  city: string;
  title: string;
  chips: HeroChip[];
  facts: HeroFact[];
  cta?: { href: string; label: string };
  aside?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-brand-950 print:bg-surface-0">
      <ContourField className="absolute inset-y-0 right-0 -z-10 h-full w-full opacity-80 md:w-3/4 print:hidden" />
      <div className="mx-auto flex max-w-content flex-col gap-8 px-4 pt-8 pb-10 md:px-8 md:pt-10 md:pb-14">
        {back ? (
          <Link href={back.href} className="inline-flex w-fit items-center gap-1.5 text-body-s text-brand-300 hover:text-brand-100 print:hidden">
            <Icon icon={ArrowLeft} size={16} />
            {back.label}
          </Link>
        ) : null}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-3xl flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-12 items-center justify-center rounded-control bg-brand-800 text-pulse-500 print:hidden">
                <Icon icon={DEPARTMENT_ICONS[department]} size={24} />
              </span>
              <span className="text-caption font-semibold tracking-wider text-brand-300 uppercase print:text-ink-700">{departmentLabel}</span>
            </div>
            <h1 className="text-h1 text-brand-100 sm:text-display-l print:text-ink-900">{title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-body text-brand-300 print:text-ink-700">
              {logo}
              <Link href={org.href} className="font-medium text-brand-100 underline-offset-4 hover:underline print:text-ink-900">
                {org.label}
              </Link>
              <span aria-hidden>·</span>
              <span>{site}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Icon icon={MapPin} size={16} />
                {city}
              </span>
            </div>
            {chips.length ? (
              <ul className="flex flex-wrap gap-2">
                {chips.map((c) => (
                  <li
                    key={c.label}
                    className={cx(
                      'inline-flex items-center gap-1.5 rounded-chip border px-3 py-1 text-caption print:border-line-300 print:text-ink-900',
                      c.tone === 'signal' ? 'border-pulse-500 text-brand-100' : 'border-brand-700 bg-brand-900 text-brand-100',
                    )}
                  >
                    {c.tone === 'signal' ? <span className="size-1.5 rounded-full bg-pulse-500" aria-hidden /> : null}
                    {c.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {cta ? (
            <Link
              href={cta.href}
              className="inline-flex h-control-l w-fit shrink-0 items-center gap-2 rounded-control bg-pulse-500 px-6 text-body font-semibold text-brand-950 transition-colors hover:bg-brand-100 print:hidden"
            >
              {cta.label}
              <Icon icon={ArrowRight} size={18} />
            </Link>
          ) : null}
          {aside}
        </div>
        {facts.length ? (
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-brand-800 bg-brand-800 md:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="flex flex-col gap-1 bg-brand-950 p-4 md:p-5 print:bg-surface-0">
                <dt className="order-2 text-micro text-brand-300 print:text-ink-700">{f.label}</dt>
                <dd className="order-1 text-h3 text-brand-100 tabular md:text-h2 print:text-ink-900">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}

/** Sprungnavigation innerhalb einer Detailseite. */
export function SectionNav({ label, items }: { label: string; items: { id: string; label: string }[] }) {
  return (
    <nav aria-label={label} className="sticky top-16 z-10 -mx-4 border-b border-line-200 bg-surface-50 px-4 md:mx-0 md:rounded-card md:border md:bg-surface-0 md:px-2 print:hidden">
      <ul className="flex gap-1 overflow-x-auto py-2">
        {items.map((i) => (
          <li key={i.id} className="shrink-0">
            <a href={`#${i.id}`} className="inline-flex h-9 items-center rounded-control px-3 text-body-s font-medium text-ink-700 hover:bg-surface-100 hover:text-ink-900">
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
