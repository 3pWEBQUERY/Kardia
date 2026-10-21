import { ArrowLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { Icon, cx } from '@kardia/ui';

import { ContourField } from '@/components/brand/Artwork';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface HeaderStat {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
}

/**
 * Seitenkopf für alle App-Bereiche (Fachperson, Cockpit, Admin): Rubrik mit Pulspunkt,
 * Titel, Beschreibung, Aktionen und optional eine Kennzahlenleiste. Höhenlinien in Sand
 * als ruhige Textur – flach, ohne Schatten oder Verläufe (docs/design-language.md).
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
  meta,
  stats,
  icon,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  meta?: ReactNode;
  stats?: HeaderStat[] | undefined;
  icon?: LucideIcon;
}) {
  return (
    <header className="relative isolate overflow-hidden rounded-card border border-line-200 bg-surface-0 print:border-0">
      <ContourField tone="sand" className="absolute top-0 -right-16 -z-10 hidden h-full w-3/5 md:block print:hidden" />
      <div className="flex flex-col gap-4 px-5 py-6 md:px-8 md:py-7">
        {back ? (
          <Link href={back.href} className="inline-flex w-fit items-center gap-1.5 text-caption font-medium text-accent-600 hover:underline print:hidden">
            <Icon icon={ArrowLeft} size={14} />
            {back.label}
          </Link>
        ) : null}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="flex min-w-0 max-w-3xl flex-1 basis-80 items-start gap-4">
            {icon ? (
              <span className="hidden size-12 shrink-0 items-center justify-center rounded-card bg-brand-950 text-pulse-500 sm:inline-flex">
                <Icon icon={icon} size={22} />
              </span>
            ) : null}
            <div className="flex min-w-0 flex-col gap-2">
              {eyebrow ? (
                <span className="inline-flex w-fit items-center gap-2 text-caption font-semibold tracking-wider text-accent-600 uppercase">
                  <span className="size-2 rounded-full bg-pulse-500" aria-hidden />
                  {eyebrow}
                </span>
              ) : null}
              <h1 className="text-h1 break-words text-ink-900 md:text-display">{title}</h1>
              {meta ? <div className="flex flex-wrap items-center gap-2 text-body-s text-ink-700">{meta}</div> : null}
              {description ? <p className="max-w-2xl text-body-s text-ink-700 md:text-body">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div> : null}
        </div>
      </div>
      {stats?.length ? (
        <dl className={cx('grid grid-cols-2 border-t border-line-200 bg-surface-0', stats.length >= 4 ? 'md:grid-cols-4' : stats.length === 3 ? 'md:grid-cols-3' : '')}>
          {stats.map((s, i) => (
            <div
              key={i}
              className={cx(
                'flex flex-col gap-1 px-5 py-4 md:px-8',
                i % 2 === 1 && 'border-l border-line-200',
                i >= 2 && 'border-t border-line-200 md:border-t-0',
                i >= 2 && 'md:border-l',
                // Ungerade Anzahl: letzte Kennzahl füllt auf Mobile die ganze Zeile.
                stats.length % 2 === 1 && i === stats.length - 1 && 'col-span-2 md:col-span-1',
              )}
            >
              <dt className="order-2 text-micro text-ink-500">{s.label}</dt>
              <dd className="order-1 text-h2 font-semibold text-ink-900 tabular">{s.value}</dd>
              {s.hint ? <dd className="order-3 text-micro text-ink-500">{s.hint}</dd> : null}
            </div>
          ))}
        </dl>
      ) : null}
    </header>
  );
}

/**
 * Listenzeile als Link: Icon-Kachel, Titel, Metazeile, rechte Spalte (Chips/Zahlen), Chevron.
 * Hover: Rahmenfarbe wechselt – nichts hebt sich an.
 */
export function RowLink({
  href,
  icon,
  title,
  meta,
  aside,
  children,
}: {
  href: string;
  icon?: LucideIcon;
  title: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-card border border-line-200 bg-surface-0 px-4 py-3.5 transition-colors hover:border-accent-600 focus-visible:border-accent-600"
    >
      {icon ? (
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-control bg-accent-50 text-accent-700">
          <Icon icon={icon} size={20} />
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-body-s font-semibold text-ink-900 group-hover:text-accent-700">{title}</span>
        {meta ? <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-micro text-ink-500">{meta}</span> : null}
        {children}
      </span>
      {aside ? <span className="hidden shrink-0 items-center gap-3 sm:flex">{aside}</span> : null}
      <Icon icon={ChevronRight} size={18} className="shrink-0 text-ink-500 transition-colors group-hover:text-accent-600" />
    </Link>
  );
}

/** Abschnittstitel innerhalb einer App-Seite (h2 mit optionaler Aktion und Zähler). */
export function SectionTitle({ children, count, action, id }: { children: ReactNode; count?: number; action?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="flex items-center gap-2 text-h2 text-ink-900">
        {children}
        {count != null ? <span className="rounded-chip bg-surface-100 px-2 py-0.5 text-caption text-ink-700 tabular">{count}</span> : null}
      </h2>
      {action}
    </div>
  );
}
