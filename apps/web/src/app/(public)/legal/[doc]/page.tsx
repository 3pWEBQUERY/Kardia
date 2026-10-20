import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { Callout } from '@kardia/ui';

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

/** Rechtstexte (PRD 14.3): Entwürfe, vor Launch juristisch zu prüfen. */
export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!(DOCS as readonly string[]).includes(doc)) notFound();
  const t = await getTranslations('public.legal');
  const sections = t.raw(`${doc as Doc}.sections`) as { h: string; p: string[] }[];
  return (
    <article className="prose-k mx-auto px-4 py-12">
      <h1 className="mb-4 text-h1">{t(`${doc as Doc}.title`)}</h1>
      <Callout tone="warn">{t('draft')}</Callout>
      {sections.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.p.map((p) => <p key={p}>{p}</p>)}
        </section>
      ))}
    </article>
  );
}
