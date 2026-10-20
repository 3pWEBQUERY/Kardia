import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { formatPlainDate } from '@kardia/core';
import { Card, CardBody, EmptyState } from '@kardia/ui';

import { db } from '@/server/db';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('public.guide');
  return { title: t('title') };
}

/** Ratgeber Anerkennung (Modul H): redaktionell gepflegt, mit Prüfdatum, keine Rechtsberatung. */
export default async function GuideIndexPage() {
  const t = await getTranslations('public.guide');
  const e = await getTranslations('enums');
  const guides = await db.recognitionGuide.findMany({ orderBy: [{ targetProfession: 'asc' }, { originCountry: 'asc' }] });
  return (
    <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-8 md:px-8">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body text-ink-700">{t('lead')}</p>
        <p className="text-micro text-ink-500">{t('disclaimer')}</p>
        <p className="text-micro text-ink-500">{t('who')}</p>
      </header>
      {guides.length === 0 ? <EmptyState>{t('empty')}</EmptyState> : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {guides.map((g) => (
          <li key={g.id}>
            <Card>
              <CardBody>
                <Link href={`/guide/recognition/${g.id}`} className="flex flex-col gap-1 hover:text-accent-700">
                  <span className="text-h3">{t('route', { origin: g.originCountry, profession: e(`Profession.${g.targetProfession}`) })}</span>
                  <span className="text-micro text-ink-500">{t('authority', { authority: g.authority, date: formatPlainDate(g.reviewedAt) })}</span>
                </Link>
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
