'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type SyntheticEvent } from 'react';

import { formatDate, formatDateTime } from '@kardia/core';
import { Button, Callout, Card, CardBody, CardHeader, Dialog, EmptyState, Icon, Input, useToast } from '@kardia/ui';

import { deleteDataSubjectAccount, exportDataSubjectJson, lookupDataSubject } from '@/app/actions/admin';
import { useActionMessage } from '@/lib/useActionError';

import type { DataSubject } from '@/server/services/adminPrivacy';

/** Betroffenenanfrage (revDSG): Person suchen, JSON-Export herunterladen, Konto löschen. */
export function DataSubjectRequest() {
  const t = useTranslations('admin.privacy');
  const c = useTranslations('common');
  const toast = useToast();
  const message = useActionMessage();
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState<DataSubject | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState('');
  const [open, setOpen] = useState(false);

  const lookup = async (ev: SyntheticEvent) => {
    ev.preventDefault();
    setError(null);
    setBusy(true);
    const r = await lookupDataSubject(email);
    setBusy(false);
    if (!r.ok) return setError(message(r));
    setSubject(r.data);
  };

  const download = async (s: DataSubject) => {
    setBusy(true);
    const r = await exportDataSubjectJson(s.id);
    setBusy(false);
    if (!r.ok) return setError(message(r));
    const url = URL.createObjectURL(new Blob([r.data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `kardia-auskunft-${s.id}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (s: DataSubject) => {
    setBusy(true);
    const r = await deleteDataSubjectAccount(s.id, confirm);
    setBusy(false);
    if (!r.ok) return setError(message(r));
    setOpen(false);
    setConfirm('');
    setSubject({ ...s, deletedAt: new Date() });
    toast({ tone: 'neutral', message: t('deleted') });
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={(ev) => void lookup(ev)} className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <Input label={t('email')} type="email" required value={email} onChange={(ev) => setEmail(ev.target.value)} autoComplete="off" />
        </div>
        <Button type="submit" variant="primary" disabled={busy}>
          <Icon icon={Search} size={16} />
          {t('lookup')}
        </Button>
      </form>
      {error ? <Callout tone="critical">{error}</Callout> : null}
      {subject === null ? <EmptyState>{t('notFound')}</EmptyState> : null}
      {subject ? (
        <Card>
          <CardHeader title={subject.email} />
          <CardBody>
            <dl className="grid gap-x-6 gap-y-2 text-body-s sm:grid-cols-2">
              <div><dt className="text-micro text-ink-500">{t('createdAt')}</dt><dd className="tabular">{formatDate(subject.createdAt)}</dd></div>
              <div><dt className="text-micro text-ink-500">{t('lastActiveAt')}</dt><dd className="tabular">{formatDateTime(subject.lastActiveAt)}</dd></div>
              <div><dt className="text-micro text-ink-500">{t('candidate')}</dt><dd>{subject.candidate ? t('candidateCounts', subject.candidate) : t('none')}</dd></div>
              <div>
                <dt className="text-micro text-ink-500">{t('memberships')}</dt>
                <dd>{subject.memberships.length ? subject.memberships.map((m) => `${m.organization} (${m.role})`).join(', ') : t('none')}</dd>
              </div>
            </dl>
            {subject.deletedAt ? <Callout tone="warn">{t('alreadyDeleted', { date: formatDate(subject.deletedAt) })}</Callout> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={() => void download(subject)} disabled={busy || !!subject.deletedAt}>{t('export')}</Button>
              {!subject.isAdmin && !subject.deletedAt ? (
                <Dialog
                  open={open}
                  onOpenChange={setOpen}
                  title={t('deleteTitle')}
                  description={t('deleteBody')}
                  closeLabel={c('actions.close')}
                  trigger={<Button variant="danger">{t('delete')}</Button>}
                  footer={
                    <>
                      <Button onClick={() => setOpen(false)}>{c('actions.cancel')}</Button>
                      <Button variant="danger" disabled={busy || confirm.trim().toLowerCase() !== subject.email.toLowerCase()} onClick={() => void remove(subject)}>
                        {t('deleteConfirm')}
                      </Button>
                    </>
                  }
                >
                  <Input label={t('deleteType', { email: subject.email })} value={confirm} onChange={(ev) => setConfirm(ev.target.value)} />
                </Dialog>
              ) : null}
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
