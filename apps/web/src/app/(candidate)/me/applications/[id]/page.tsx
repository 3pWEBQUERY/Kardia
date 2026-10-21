import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ProblemError, formatDate, formatDateTime } from '@kardia/core';
import { Card, CardBody, CardHeader, StatusChip } from '@kardia/ui';

import { ApplicationActions } from '@/components/candidate/ApplicationActions';
import { MessageThread } from '@/components/candidate/MessageThread';
import { getMyApplication, markMessagesRead } from '@/server/services/applications';
import { requireUser } from '@/server/session';

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireUser(`/me/applications/${id}`);
  const app = await getMyApplication(s.user.id, id).catch((e: unknown) => {
    if (e instanceof ProblemError) return null;
    throw e;
  });
  if (!app) notFound();
  // Thread geöffnet: Nachrichten des Arbeitgebers gelten als gelesen (PRD 13.2).
  await markMessagesRead(app.id, s.user.id);
  const [t, e] = await Promise.all([getTranslations('candidate.applications'), getTranslations('enums')]);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-caption text-ink-700">{app.job.ward.location.organization.name} · {app.job.ward.name}</p>
        <h1 className="text-h1"><Link href={`/jobs/${app.jobId}`} className="hover:text-accent-700">{app.job.title}</Link></h1>
        <div className="flex flex-wrap gap-2">
          <StatusChip tone="accent">{e(`ApplicationStatus.${app.status}`)}</StatusChip>
          <StatusChip>{t('appliedOn', { date: formatDate(app.createdAt) })}</StatusChip>
          {app.rejectionReason ? <StatusChip tone="critical">{e(`RejectionReason.${app.rejectionReason}`)}</StatusChip> : null}
        </div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader title={t('thread')} meta={t('threadHint')} />
          <CardBody>
            <MessageThread
              applicationId={app.id}
              messages={app.messages.map((m) => ({ id: m.id, body: m.body, mine: m.mine, at: formatDateTime(m.createdAt), read: m.readAt != null }))}
              disabled={app.status === 'WITHDRAWN'}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t('settings')} />
          <CardBody>
            <ApplicationActions applicationId={app.id} documentsShared={app.documentsShared} canWithdraw={!['HIRED', 'WITHDRAWN', 'REJECTED'].includes(app.status)} />
          </CardBody>
        </Card>
      </div>
      {app.message ? (
        <Card>
          <CardHeader title={t('yourMessage')} />
          <CardBody><p className="text-body-s text-ink-700">{app.message}</p></CardBody>
        </Card>
      ) : null}
    </div>
  );
}
