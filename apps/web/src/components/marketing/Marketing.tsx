import { ArrowUpRight, Plus } from 'lucide-react';
import Link from 'next/link';

import { formatNumber } from '@kardia/core';
import { Icon, cx } from '@kardia/ui';

import { AlpinePulse, ContourField, PulseLine } from '@/components/brand/Artwork';

import type { ReactNode } from 'react';

/**
 * Bausteine der Einstiegsseiten (Bildsprache «Puls & Alpen», docs/design-language.md):
 * Hero auf Markenfläche, Abschnittstitel, Titelband, FAQ und Abschluss-CTA.
 */

/** Link als Haupt- oder Nebenaktion auf dunkler Markenfläche. */
export function BrandLink({ href, children, variant = 'primary' }: { href: string; children: ReactNode; variant?: 'primary' | 'outline' }) {
  return (
    <Link
      href={href}
      className={cx(
        'inline-flex h-control-l items-center gap-2 rounded-control px-6 text-body transition-colors',
        variant === 'primary'
          ? 'bg-pulse-500 font-semibold text-brand-950 hover:bg-brand-100'
          : 'border border-brand-700 font-medium text-brand-100 hover:bg-brand-900',
      )}
    >
      {children}
      {variant === 'primary' ? <Icon icon={ArrowUpRight} size={18} /> : null}
    </Link>
  );
}

/** Kleine Marke über Titeln, auf Markenfläche mit Pulspunkt. */
export function Eyebrow({ children, inverse = false }: { children: ReactNode; inverse?: boolean }) {
  return inverse ? (
    <span className="inline-flex w-fit items-center gap-2 rounded-chip border border-brand-700 bg-brand-900 px-3 py-1 text-caption text-brand-100">
      <span className="size-2 rounded-full bg-pulse-500" aria-hidden />
      {children}
    </span>
  ) : (
    <span className="inline-flex w-fit items-center gap-2 text-caption font-semibold tracking-wider text-accent-600 uppercase">
      <span className="h-px w-6 bg-accent-600" aria-hidden />
      {children}
    </span>
  );
}

/** Hero auf brand-950 mit Markengrafik; rechts optional eine helle Karte. */
export function BrandHero({
  eyebrow,
  title,
  lead,
  actions,
  stats,
  aside,
  art = 'alpine',
  size = 'l',
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  stats?: { value: number; label: string }[];
  aside?: ReactNode;
  art?: 'alpine' | 'contour';
  size?: 'l' | 'm';
}) {
  return (
    <section className="relative isolate overflow-hidden bg-brand-950">
      {art === 'alpine' ? (
        // Grafik am unteren Rand verankert (16:9), damit Pulslinie und Berge unter dem Text bleiben.
        <div className="absolute inset-x-0 bottom-0 -z-10 aspect-[16/9] min-h-[520px] w-full">
          <AlpinePulse className="size-full" />
        </div>
      ) : (
        <ContourField className="absolute inset-0 -z-10 size-full" />
      )}
      <div
        className={cx(
          'mx-auto grid max-w-content gap-10 px-4 md:px-8 lg:items-center lg:gap-14',
          aside ? 'lg:grid-cols-[1.25fr_1fr]' : '',
          art === 'alpine' ? 'pt-14 pb-72 md:pt-20 md:pb-80' : 'py-16 md:py-24',
        )}
      >
        <div className="flex flex-col gap-6">
          {eyebrow ? <Eyebrow inverse>{eyebrow}</Eyebrow> : null}
          <h1 className={cx('max-w-4xl text-brand-100', size === 'l' ? 'text-hero' : 'text-display-l')}>{title}</h1>
          {lead ? <p className="max-w-2xl text-body text-brand-300 md:text-h3 md:font-normal">{lead}</p> : null}
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          {stats?.length ? (
            <dl className="mt-2 grid max-w-xl grid-cols-3 gap-4 border-t border-brand-800 pt-6">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col gap-1">
                  <dt className="order-2 text-micro text-brand-300">{s.label}</dt>
                  <dd className="order-1 text-display-l text-brand-100 tabular">{formatNumber(s.value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        {aside ? <div className="flex flex-col">{aside}</div> : null}
      </div>
    </section>
  );
}

/** Titelband für Inhaltsseiten (Recht, Vergleich, Organisation): hell, mit Höhenlinien rechts. */
export function TitleBand({ eyebrow, title, lead, children, tone = 'sand' }: { eyebrow?: ReactNode; title: ReactNode; lead?: ReactNode; children?: ReactNode; tone?: 'sand' | 'surface' }) {
  return (
    <section className={cx('relative isolate overflow-hidden border-b', tone === 'sand' ? 'border-sand-200 bg-sand-100' : 'border-line-200 bg-surface-0')}>
      <ContourField tone="sand" className="absolute inset-y-0 right-0 -z-10 hidden h-full w-1/2 md:block" />
      <div className="mx-auto flex max-w-content flex-col gap-4 px-4 py-12 md:px-8 md:py-16">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="max-w-3xl text-display-l text-ink-900">{title}</h1>
        {lead ? <p className="max-w-2xl text-body text-ink-700">{lead}</p> : null}
        {children}
        <PulseLine className="mt-2 h-8 w-full max-w-md text-accent-600" peakAt={0.7} />
      </div>
    </section>
  );
}

/** Abschnittstitel mit grossem Display-Titel. */
export function SectionTitle({ id, eyebrow, title, lead, align = 'start' }: { id: string; eyebrow?: ReactNode; title: ReactNode; lead?: ReactNode; align?: 'start' | 'center' }) {
  return (
    <div className={cx('flex max-w-3xl flex-col gap-3', align === 'center' && 'mx-auto items-center text-center')}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 id={id} className="text-display-l text-ink-900">
        {title}
      </h2>
      {lead ? <p className="text-body text-ink-700 md:text-h3 md:font-normal">{lead}</p> : null}
    </div>
  );
}

/** Häufige Fragen als native Disclosure (Tastatur, Screenreader). */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="flex flex-col border-t border-line-300">
      {items.map((item) => (
        <details key={item.q} className="group border-b border-line-300">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-h3 text-ink-900 marker:hidden hover:text-accent-700 [&::-webkit-details-marker]:hidden">
            {item.q}
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line-300 text-ink-700 transition-transform group-open:rotate-45 group-open:border-accent-600 group-open:text-accent-600">
              <Icon icon={Plus} size={18} />
            </span>
          </summary>
          <p className="max-w-3xl pb-6 text-body text-ink-700">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Abschluss-Kachel auf Markenfläche mit Höhenlinien. */
export function BrandCta({ title, body, actions, aside }: { title: ReactNode; body?: ReactNode; actions: ReactNode; aside?: ReactNode }) {
  return (
    <section className="mx-auto max-w-content px-4 py-20 md:px-8 md:py-28">
      <div className={cx('relative isolate grid overflow-hidden rounded-card bg-brand-900', aside ? 'md:grid-cols-[1.3fr_1fr]' : '')}>
        <ContourField className="absolute inset-0 -z-10 size-full" />
        <div className="flex flex-col gap-5 p-8 md:p-12">
          <h2 className="max-w-3xl text-display-l text-brand-100">{title}</h2>
          {body ? <p className="max-w-xl text-body text-brand-300">{body}</p> : null}
          <div className="flex flex-wrap gap-3">{actions}</div>
        </div>
        {aside ? <div className="hidden items-end p-8 md:flex md:p-12">{aside}</div> : null}
      </div>
    </section>
  );
}

/** Statement-Band in Akzentfarbe. */
export function StatementBand({ children }: { children: ReactNode }) {
  return (
    <section className="bg-accent-600 text-on-accent">
      <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-20 md:px-8 md:py-24">
        <p className="max-w-4xl text-display-l">{children}</p>
        <PulseLine className="h-10 w-full text-on-accent" peakAt={0.3} />
      </div>
    </section>
  );
}
