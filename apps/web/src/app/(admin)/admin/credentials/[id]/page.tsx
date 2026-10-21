import { ExternalLink } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { formatPlainDate, REGISTRY_SEARCH_URL } from '@kardia/core';
import { Callout, Card, CardBody, CardHeader, Icon, StatusChip } from '@kardia/ui';

import { CredentialDecision } from '@/components/admin/CredentialDecision';
import { PageHeader } from '@/components/app/PageHeader';
import { credentialDetail } from '@/server/services/admin';
import { requireAdmin } from '@/server/session';

import type { ReactNode } from 'react';

interface Precheck {
  documentType?: string;
  holderName?: string | null;
  title?: string | null;
  issuer?: string | null;
  issuedAt?: string | null;
  deviations?: { field: string; claimed: string; found: string | null }[];
  notes?: string | null;
}

/** Prüfansicht: Dokument links, Felder rechts, Registerlink, Entscheid mit Grund (PRD 6). */
export default async function CredentialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireAdmin();
  const [t, e, ta] = await Promise.all([getTranslations('admin.credentials'), getTranslations('enums'), getTranslations('admin')]);
  const c = await credentialDetail(s, id);
  const pre = (c.precheck ?? null) as Precheck | null;
  const fileUrl = c.file ? `/api/files/${c.file.id}` : null;
  const row = (label: string, value: string | null | undefined) => (
    <div className="grid grid-cols-[160px_1fr] gap-3 border-b border-line-200 py-2 text-body-s">
      <dt className="text-ink-700">{label}</dt>
      <dd className="text-ink-900">{value ?? '–'}</dd>
    </div>
  );
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={ta('eyebrow')}
        back={{ href: '/admin/credentials', label: t('back') }}
        title={t('detailTitle')}
        meta={<StatusChip tone={c.status === 'VERIFIED' ? 'ok' : c.status === 'REJECTED' ? 'critical' : 'neutral'}>{e(`CredentialStatus.${c.status}`)}</StatusChip>}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)] lg:items-start">
        <Card>
          <CardHeader title={t('document')} />
          <CardBody>
            {!c.file ? (
              <EmptyNote>{t('noFile')}</EmptyNote>
            ) : c.file.status !== 'READY' ? (
              <Callout tone="warn">{t('fileNotReady')}</Callout>
            ) : c.file.mimeType === 'application/pdf' ? (
              <iframe title={t('document')} src={fileUrl ?? undefined} sandbox="allow-same-origin" className="h-[75vh] w-full border border-line-300" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- signierte Kurzzeit-URL, nicht optimierbar
              <img src={fileUrl ?? undefined} alt={t('document')} className="max-h-[75vh] w-full border border-line-300 object-contain" />
            )}
          </CardBody>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title={t('fields')} />
            <CardBody>
              <dl>
                {row(t('holder'), `${c.candidate.firstName} ${c.candidate.lastName}`)}
                {row(t('profession'), e(`Profession.${c.candidate.profession}`))}
                {row(t('type'), e(`CredentialType.${c.type}`))}
                {row(t('title_'), c.title)}
                {row(t('issuer'), c.issuer)}
                {row(t('issuedAt'), c.issuedAt ? formatPlainDate(c.issuedAt) : null)}
                {row(t('validUntil'), c.validUntil ? formatPlainDate(c.validUntil) : null)}
                {row(t('registry'), c.registry ? e(`Registry.${c.registry}`) : null)}
                {row(t('registryNumber'), c.registryNumber)}
              </dl>
              {c.registry ? (
                <a href={REGISTRY_SEARCH_URL[c.registry]} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-body-s text-accent-600 hover:text-accent-700">
                  {t('registryLink')}
                  <Icon icon={ExternalLink} size={14} />
                </a>
              ) : null}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('precheckTitle')} />
            <CardBody className="flex flex-col gap-2 text-body-s">
              {!pre ? (
                <p className="text-ink-500">{t('precheckNone')}</p>
              ) : (
                <>
                  <dl>
                    {row(t('precheckType'), pre.documentType ? (e.has(`CredentialType.${pre.documentType}`) ? e(`CredentialType.${pre.documentType}`) : pre.documentType) : null)}
                    {row(t('holder'), pre.holderName)}
                    {row(t('title_'), pre.title)}
                    {row(t('issuer'), pre.issuer)}
                    {row(t('issuedAt'), pre.issuedAt)}
                  </dl>
                  <p className="text-caption text-ink-700">{t('precheckDeviations')}</p>
                  {pre.deviations?.length ? (
                    <ul className="flex flex-col gap-1">
                      {pre.deviations.map((d, i) => (
                        <li key={`${d.field}-${i}`} className="text-warn-600">
                          {d.field}: {t('claimed', { claimed: d.claimed, found: d.found ?? '–' })}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-ink-500">{t('precheckNoDeviations')}</p>
                  )}
                  {pre.notes ? <p className="text-ink-700">{t('precheckNotes')}: {pre.notes}</p> : null}
                </>
              )}
            </CardBody>
          </Card>
          <CredentialDecision id={c.id} status={c.status} />
        </div>
      </div>
    </div>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-body-s text-ink-700">{children}</p>;
}
