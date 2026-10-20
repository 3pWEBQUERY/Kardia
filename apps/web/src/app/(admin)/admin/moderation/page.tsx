import { getTranslations } from 'next-intl/server';

import { formatDateTime } from '@kardia/core';
import { Card, CardBody, CardHeader, EmptyState, StatusChip } from '@kardia/ui';

import { ModerationButtons } from '@/components/admin/ModerationButtons';
import { moderationQueue } from '@/server/services/admin';

type Flag = { category?: string; reason?: string } | null;

/** Moderation (PRD 6): Fragen, Antworten, Kommentare, Videos, Meldungen – KI-4 gibt nur Hinweise. */
export default async function ModerationPage() {
  const t = await getTranslations('admin.moderation');
  const q = await moderationQueue();
  const flag = (f: unknown) => {
    const x = f as Flag;
    if (!x?.category) return null;
    const cat = t.has(`categories.${x.category}`) ? t(`categories.${x.category}`) : x.category;
    return <StatusChip tone="warn">{t('aiFlag', { category: cat, reason: x.reason ?? '' })}</StatusChip>;
  };
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-h1">{t('title')}</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">{t('questions')}</h2>
        {q.questions.length === 0 ? <EmptyState>{t('empty')}</EmptyState> : null}
        {q.questions.map((x) => (
          <Card key={x.id}>
            <CardHeader title={x.ward.name} meta={formatDateTime(x.createdAt)} />
            <CardBody className="flex flex-col gap-2 text-body-s">
              <p><span className="text-ink-700">{t('question')}:</span> {x.body}</p>
              <p><span className="text-ink-700">{t('answer')}:</span> {x.answer ?? <span className="text-ink-500">{t('noAnswer')}</span>}</p>
              {flag(x.aiFlag)}
              <ModerationButtons entity="TeamQuestion" id={x.id} approveLabel={t('approve')} rejectLabel={t('reject')} />
            </CardBody>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">{t('comments')}</h2>
        {q.comments.length === 0 ? <EmptyState>{t('empty')}</EmptyState> : null}
        {q.comments.map((c) => (
          <Card key={c.id}>
            <CardHeader title={`${c.ward} · ${c.field}`} />
            <CardBody className="flex flex-col gap-2 text-body-s">
              <p>{c.comment}</p>
              {flag(c.aiFlag)}
              <ModerationButtons entity="RealityCheckComment" id={c.id} approveLabel={t('keep')} rejectLabel={t('removeComment')} />
            </CardBody>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">{t('videos')}</h2>
        {q.videos.length === 0 ? <EmptyState>{t('empty')}</EmptyState> : null}
        {q.videos.map((v) => (
          <Card key={v.id}>
            <CardHeader title={v.ward.name} meta={t('duration', { seconds: v.durationSec })} />
            <CardBody className="flex flex-col gap-3">
              <video controls preload="none" className="w-full max-w-xl rounded-control border border-line-300">
                <source src={`/api/files/${v.fileId}`} />
                <track kind="captions" src={`/api/files/${v.captionsId}`} srcLang="de" label="Deutsch" default />
              </video>
              <ModerationButtons entity="WardVideo" id={v.id} approveLabel={t('approve')} rejectLabel={t('reject')} />
            </CardBody>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2">{t('reports')}</h2>
        {q.reports.length === 0 ? <EmptyState>{t('empty')}</EmptyState> : null}
        {q.reports.map((r) => (
          <Card key={r.id}>
            <CardHeader title={`${r.entity} · ${r.entityId}`} meta={formatDateTime(r.createdAt)} />
            <CardBody className="flex flex-col gap-2 text-body-s">
              <p><span className="text-ink-700">{t('reportReason')}:</span> {r.reason}</p>
              <ModerationButtons entity="ContentReport" id={r.id} approveLabel={t('approve')} rejectLabel={t('reject')} />
            </CardBody>
          </Card>
        ))}
      </section>
    </div>
  );
}
