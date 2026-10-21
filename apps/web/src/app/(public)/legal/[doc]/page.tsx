import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { Callout } from '@kardia/ui';

import { TitleBand } from '@/components/marketing/Marketing';

import type { Metadata } from 'next';

const DOCS = ['terms', 'terms-employers', 'privacy', 'imprint'] as const;
type Doc = (typeof DOCS)[number];

export function generateStaticParams() {
  return DOCS.map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const { doc } = await params;
  if (!(DOCS as readonly string[]).includes(doc)) return {};
  const t = await getTranslations('public.legal');
  return { title: t(`${doc as Doc}.title`) };
}

/** Rechtstexte (PRD 14.3): Entwürfe, vor Launch juristisch zu prüfen. Inhaltsverzeichnis mit Sprungmarken. */
export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!(DOCS as readonly string[]).includes(doc)) notFound();
  const t = await getTranslations('public.legal');
  const sections = t.raw(`${doc as Doc}.sections`) as { h: string; p: string[] }[];
  return (
    <>
      <TitleBand eyebrow={t('eyebrow')} title={t(`${doc as Doc}.title`)} />
      <div className="mx-auto grid max-w-content gap-10 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-[1fr_3fr]">
        <nav aria-label={t('toc')} className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-caption font-semibold tracking-wider text-ink-500 uppercase">{t('toc')}</p>
          <ol className="flex flex-col border-l border-line-300">
            {sections.map((s, i) => (
              <li key={s.h}>
                <a href={`#s${i + 1}`} className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-body-s text-ink-700 hover:border-accent-600 hover:text-accent-700">
                  {s.h}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="prose-k flex flex-col">
          <Callout tone="warn">{t('draft')}</Callout>
          {sections.map((s, i) => (
            <section key={s.h} id={`s${i + 1}`} className="scroll-mt-24">
              <h2>{s.h}</h2>
              {s.p.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </>
  );
}
