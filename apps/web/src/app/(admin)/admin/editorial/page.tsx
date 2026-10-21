import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import { SPECIALTY_TITLES, formatDateTime, recognitionStepSchema } from '@kardia/core';
import { Department, Profession } from '@kardia/db/enums';
import { Card, CardBody, CardHeader, EmptyState } from '@kardia/ui';

import { GuideEditor, type GuideDraft } from '@/components/admin/GuideEditor';
import { PageHeader } from '@/components/app/PageHeader';
import { listGuides, trainingDeviations } from '@/server/services/admin';

/** Redaktion: Anerkennungs-Tracker, Listen (Fachbereiche, Berufe, Titel), AK-F2-Abweichungen. */
export default async function EditorialPage() {
  const [t, e, ta] = await Promise.all([getTranslations('admin.editorial'), getTranslations('enums'), getTranslations('admin')]);
  const [guides, deviations] = await Promise.all([listGuides(), trainingDeviations()]);
  const drafts: GuideDraft[] = guides.map((g) => ({
    id: g.id,
    originCountry: g.originCountry,
    targetProfession: g.targetProfession,
    authority: g.authority,
    reviewedAt: g.reviewedAt.toISOString().slice(0, 10),
    steps: z.array(recognitionStepSchema).catch([]).parse(g.steps),
  }));
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={ta('eyebrow')} title={t('title')} description={t('lead')} />
      <section className="flex flex-col gap-3">
        <h2 className="text-h2">{t('guides')}</h2>
        <p className="text-body-s text-ink-700">{t('guidesLead')}</p>
        {drafts.map((d) => (
          <GuideEditor key={d.id} initial={d} />
        ))}
        <GuideEditor initial={null} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">{t('deviations')}</h2>
        {deviations.length === 0 ? <EmptyState>{t('deviationsEmpty')}</EmptyState> : null}
        <ul className="flex flex-col gap-2">
          {deviations.map((d) => (
            <li key={d.id} className="rounded-card border border-warn-600 bg-surface-0 p-3 text-body-s">
              <span className="text-micro text-ink-500">{formatDateTime(d.createdAt)} · {d.entityId}</span>
              <pre className="mt-1 overflow-x-auto font-mono text-micro">{JSON.stringify(d.props, null, 2)}</pre>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">{t('enums')}</h2>
        <p className="text-body-s text-ink-700">{t('enumsLead')}</p>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader title={t('departments')} />
            <CardBody>
              <ul className="flex flex-col gap-1 text-body-s">
                {Object.values(Department).map((d) => (
                  <li key={d} className="flex justify-between gap-2"><span>{e(`Department.${d}`)}</span><code className="font-mono text-micro text-ink-500">{d}</code></li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('professions')} />
            <CardBody>
              <ul className="flex flex-col gap-1 text-body-s">
                {Object.values(Profession).map((p) => (
                  <li key={p} className="flex justify-between gap-2"><span>{e(`Profession.${p}`)}</span><code className="font-mono text-micro text-ink-500">{p}</code></li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('specialties')} />
            <CardBody>
              <ul className="flex flex-col gap-2 text-body-s">
                {SPECIALTY_TITLES.map((s) => (
                  <li key={s.id}>
                    <span className="font-medium">{s.name}</span> <span className="text-micro text-ink-500">{t('years', { years: s.totalYears })}</span>
                    <ul className="pl-4 text-micro text-ink-700">
                      {s.areas.map((a) => (
                        <li key={a.id}>{a.name} · {t('years', { years: a.years })}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </section>
    </div>
  );
}
