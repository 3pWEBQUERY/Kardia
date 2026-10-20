import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { formatChfRange } from '@kardia/core';
import { Card, CardBody, CardHeader, StatusChip } from '@kardia/ui';

import { db } from '@/server/db';

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
  return (
    <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{org.name}</h1>
        <p className="text-body-s text-ink-700">{t('lead')}</p>
        <div><StatusChip tone="ok">{t('verified')}</StatusChip></div>
      </header>
      {org.locations.map((loc) => (
        <Card key={loc.id}>
          <CardHeader title={loc.name} meta={`${loc.street}, ${loc.postalCode} ${loc.city}`} />
          <CardBody>
            <ul className="grid gap-3 md:grid-cols-2">
              {loc.wards.map((w) => (
                <li key={w.id}>
                  <Link href={`/wards/${w.id}`} className="flex flex-col gap-1 rounded-control border border-line-300 px-4 py-3 hover:border-ink-500">
                    <span className="text-body-s font-medium">{w.name}</span>
                    <span className="text-micro text-ink-500">
                      {e(`Department.${w.department}`)} · {formatChfRange(w.salaryMinChf, w.salaryMaxChf)} · {t('jobs', { count: w._count.jobs })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
