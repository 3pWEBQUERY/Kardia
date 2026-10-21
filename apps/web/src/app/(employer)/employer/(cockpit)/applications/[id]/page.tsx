import { getTranslations } from 'next-intl/server';

import { formatDate, formatDateTime, formatPlainDate } from '@kardia/core';
import { Callout, Card, CardBody, CardHeader, StatusChip, type Tone } from '@kardia/ui';

import { PageHeader } from '@/components/app/PageHeader';
import { MessageComposer, StatusControl } from '@/components/employer/ApplicationControls';
import { orNotFound } from '@/lib/orNotFound';
import { getApplicationForOrg, markCandidateMessagesRead } from '@/server/services/applications';
import { requireOrgPage } from '@/server/session';

const CRED_TONE: Record<string, Tone> = {
  VERIFIED: 'ok',
  SUBMITTED: 'neutral',
  IN_REVIEW: 'neutral',
  REJECTED: 'critical',
  EXPIRED: 'warn',
};

/**
 * Bewerbung: Pass mit verifizierten Feldern. Originaldokumente nur nach Freigabe
 * pro Bewerbung (AK-D1); sonst nur der Status "verifiziert".
 */
export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOrgPage('applications.read');
  const app = await orNotFound(getApplicationForOrg(ctx, id));
  // Gelesen-Markierung (PRD 13.2): Öffnen der Bewerbung liest die Nachrichten der Fachperson.
  await markCandidateMessagesRead(app.id, app.candidate.userId);
  const [t, te] = await Promise.all([
    getTranslations('employer.application'),
    getTranslations('enums'),
  ]);
  const c = app.candidate;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${app.job.title} · ${app.job.ward.name}`}
        back={{ href: `/employer/pipeline?job=${app.jobId}`, label: t('backToPipeline') }}
        title={`${c.firstName} ${c.lastName}`}
        meta={
          <>
            <StatusChip tone="accent">{te(`ApplicationStatus.${app.status}`)}</StatusChip>
            <StatusChip>{te(`Profession.${c.profession}`)}</StatusChip>
            <StatusChip>{t('received', { date: formatDate(app.createdAt) })}</StatusChip>
            {c.workAuthorizedCh != null ? (
              <StatusChip tone={c.workAuthorizedCh ? 'ok' : 'warn'}>
                {c.workAuthorizedCh ? t('authorized') : t('notAuthorized')}
              </StatusChip>
            ) : null}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          {app.message ? (
            <Card>
              <CardHeader title={t('personalMessage')} />
              <CardBody>
                <p className="text-body-s whitespace-pre-line">{app.message}</p>
              </CardBody>
            </Card>
          ) : null}
          <Card>
            <CardHeader
              title={t('pass')}
              meta={app.documentsShared ? t('docsShared') : t('docsNotShared')}
            />
            <CardBody className="flex flex-col gap-4">
              <ul className="flex flex-col divide-y divide-line-200">
                {c.credentials.map((cr) => (
                  <li
                    key={cr.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-body-s font-medium">{cr.title}</span>
                      <span className="text-micro text-ink-500">
                        {te(`CredentialType.${cr.type}`)}
                        {cr.issuer ? ` · ${cr.issuer}` : ''}
                        {cr.issuedAt ? ` · ${formatPlainDate(cr.issuedAt)}` : ''}
                        {cr.registry ? ` · ${te(`Registry.${cr.registry}`)}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusChip tone={CRED_TONE[cr.status] ?? 'neutral'}>
                        {te(`CredentialStatus.${cr.status}`)}
                      </StatusChip>
                      {cr.fileId ? (
                        <a
                          href={`/api/files/${cr.fileId}`}
                          className="text-body-s text-accent-600 hover:text-accent-700"
                        >
                          {t('document')}
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-1 text-caption text-ink-700">
                    {t('experience', { years: c.yearsExperience })}
                  </h3>
                  <ul className="text-body-s">
                    {c.experiences.map((e) => (
                      <li key={e.id}>
                        {te(`Department.${e.department}`)}: {e.years} {t('years')}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-1 text-caption text-ink-700">{t('languages')}</h3>
                  <ul className="text-body-s">
                    {c.languages.map((l) => (
                      <li key={l.id}>
                        {l.language.toUpperCase()} · {l.level}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('thread')} meta={t('threadHint')} />
            <CardBody className="flex flex-col gap-4">
              {app.messages.length === 0 ? (
                <p className="text-body-s text-ink-700">{t('noMessages')}</p>
              ) : null}
              <ol className="flex flex-col gap-3">
                {app.messages.map((m) => (
                  <li
                    key={m.id}
                    className={
                      m.senderUserId === ctx.user.id
                        ? 'ml-8 rounded-card border border-accent-600 bg-accent-50 px-3 py-2'
                        : 'mr-8 rounded-card border border-line-300 bg-surface-0 px-3 py-2'
                    }
                  >
                    <p className="text-body-s whitespace-pre-line">{m.body}</p>
                    <p className="text-micro text-ink-500">
                      {formatDateTime(m.createdAt)}
                      {m.senderUserId !== app.candidate.userId && m.readAt ? ` · ${t('read')}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
              <MessageComposer applicationId={app.id} />
            </CardBody>
          </Card>
        </div>
        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader title={t('statusTitle')} />
            <CardBody>
              <StatusControl applicationId={app.id} status={app.status} />
            </CardBody>
          </Card>
          {app.status === 'OFFER' || app.status === 'INTERVIEW' || app.status === 'HIRED' ? (
            <Card>
              <CardHeader title={t('contact')} />
              <CardBody>
                <a href={`mailto:${c.user.email}`} className="text-body-s text-accent-600">
                  {c.user.email}
                </a>
              </CardBody>
            </Card>
          ) : null}
          <Callout>{t('noAutoDecision')}</Callout>
        </aside>
      </div>
    </div>
  );
}
