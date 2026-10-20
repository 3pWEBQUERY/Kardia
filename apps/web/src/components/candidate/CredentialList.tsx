'use client';

import { FileText, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { UPLOAD_PURPOSES } from '@kardia/core';
import { CredentialType, Registry } from '@kardia/db/enums';
import { Button, Callout, Dialog, EmptyState, Icon, Input, Select, StatusChip, useToast } from '@kardia/ui';

import { removeCredential, saveCredential } from '@/app/actions/candidate';
import { useActionMessage } from '@/lib/useActionError';

import { uploadPassFile } from './uploadFile.ts';

export interface CredentialRow {
  id: string;
  type: string;
  title: string;
  issuer: string | null;
  issuedAt: string | null;
  validUntil: string | null;
  registry: string | null;
  registryNumber: string | null;
  status: string;
  rejectReason: string | null;
  fileId: string | null;
  fileStatus: string | null;
  suggestion?: { title: string | null; issuer: string | null; issuedAt: string | null } | null;
}

const TONE = { SUBMITTED: 'neutral', IN_REVIEW: 'accent', VERIFIED: 'ok', REJECTED: 'critical', EXPIRED: 'warn' } as const;

type Draft = Omit<CredentialRow, 'status' | 'rejectReason' | 'fileStatus' | 'id' | 'suggestion'> & { id?: string };

const EMPTY: Draft = { type: 'DIPLOMA', title: '', issuer: null, issuedAt: null, validUntil: null, registry: null, registryNumber: null, fileId: null };

/**
 * Nachweise mit Status eingereicht → in Prüfung → verifiziert | abgelehnt (Grund) |
 * abgelaufen. Änderungen an verifizierten Angaben setzen den Status zurück (AK-D2) –
 * die Oberfläche sagt das vor dem Speichern.
 */
export function CredentialList({ credentials, defaultRegistry }: { credentials: CredentialRow[]; defaultRegistry: string }) {
  const t = useTranslations('candidate.pass');
  const c = useTranslations('common');
  const e = useTranslations('enums');
  const err = useTranslations('errors');
  const router = useRouter();
  const toast = useToast();
  const message = useActionMessage();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingVerified, setEditingVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<CredentialRow['suggestion']>(null);

  const open = (row?: CredentialRow) => {
    setError(null);
    setFileName(null);
    setEditingVerified(row?.status === 'VERIFIED');
    setSuggestion(row?.suggestion ?? null);
    setDraft(row ? { id: row.id, type: row.type, title: row.title, issuer: row.issuer, issuedAt: row.issuedAt, validUntil: row.validUntil, registry: row.registry, registryNumber: row.registryNumber, fileId: row.fileId } : { ...EMPTY, registry: defaultRegistry });
  };

  const onFile = async (file: File | undefined) => {
    if (!file || !draft) return;
    const rule = UPLOAD_PURPOSES.pass;
    if (!(rule.mime as readonly string[]).includes(file.type)) return setError(err('upload.type'));
    if (file.size > rule.maxBytes) return setError(err('upload.tooLarge'));
    setBusy(true);
    const r = await uploadPassFile(file);
    setBusy(false);
    if (!r.ok) return setError(r.error === 'upload' ? err('upload.failed') : r.error);
    setFileName(file.name);
    setDraft({ ...draft, fileId: r.fileId });
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    const r = await saveCredential({
      ...(draft.id ? { id: draft.id } : {}),
      type: draft.type as CredentialType,
      title: draft.title,
      issuer: draft.issuer || null,
      issuedAt: draft.issuedAt || null,
      validUntil: draft.validUntil || null,
      registry: (draft.registry || null) as Registry | null,
      registryNumber: draft.registryNumber || null,
      fileId: draft.fileId,
    });
    setBusy(false);
    if (!r.ok) return setError(message(r));
    setDraft(null);
    toast({ tone: 'neutral', message: t('credentialSaved') });
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      {credentials.length === 0 ? <EmptyState action={<Button variant="primary" onClick={() => open()}>{t('addCredential')}</Button>}>{t('noCredentials')}</EmptyState> : null}
      <ul className="flex flex-col divide-y divide-line-200">
        {credentials.map((cr) => (
          <li key={cr.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col">
              <span className="text-body-s font-medium">{cr.title}</span>
              <span className="text-micro text-ink-500">
                {e(`CredentialType.${cr.type}`)}
                {cr.issuer ? ` · ${cr.issuer}` : ''}
                {cr.registry ? ` · ${e(`Registry.${cr.registry}`)}` : ''}
                {cr.fileId ? ` · ${t('document')}` : ''}
              </span>
              {cr.status === 'REJECTED' && cr.rejectReason ? <span className="text-micro text-critical-600">{t('rejected', { reason: cr.rejectReason })}</span> : null}
              {cr.fileStatus === 'SCANNING' ? <span className="text-micro text-ink-500">{t('scanning')}</span> : null}
              {cr.suggestion ? <span className="text-micro text-accent-600">{t('aiSuggestionAvailable')}</span> : null}
            </div>
            <div className="flex items-center gap-2">
              <StatusChip tone={TONE[cr.status as keyof typeof TONE] ?? 'neutral'}>{e(`CredentialStatus.${cr.status}`)}</StatusChip>
              <Button size="s" variant="ghost" onClick={() => open(cr)}>{c('actions.edit')}</Button>
              <Button
                size="s"
                variant="ghost"
                onClick={() => void removeCredential(cr.id).then((r) => (r.ok ? router.refresh() : toast({ tone: 'critical', message: message(r) })))}
              >
                {c('actions.delete')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {credentials.length ? <div><Button size="s" onClick={() => open()}><Icon icon={Plus} size={16} />{t('addCredential')}</Button></div> : null}

      <Dialog
        open={draft !== null}
        onOpenChange={(o) => !o && setDraft(null)}
        title={draft?.id ? t('editCredential') : t('addCredential')}
        closeLabel={c('actions.close')}
        footer={
          <>
            <Button onClick={() => setDraft(null)}>{c('actions.cancel')}</Button>
            <Button variant="primary" disabled={busy || !draft?.title} onClick={() => void save()}>{busy ? c('actions.saving') : c('actions.save')}</Button>
          </>
        }
      >
        {draft ? (
          <div className="flex flex-col gap-4">
            {editingVerified ? <Callout tone="warn">{t('resetWarning')}</Callout> : null}
            {suggestion ? (
              <Callout
                title={t('aiSuggestion')}
                action={
                  <Button
                    size="s"
                    onClick={() => {
                      setDraft({ ...draft, title: suggestion.title ?? draft.title, issuer: suggestion.issuer ?? draft.issuer, issuedAt: suggestion.issuedAt ?? draft.issuedAt });
                      setSuggestion(null);
                    }}
                  >
                    {t('aiApply')}
                  </Button>
                }
              >
                {[suggestion.title, suggestion.issuer, suggestion.issuedAt].filter(Boolean).join(' · ')}
              </Callout>
            ) : null}
            <Select label={t('type')} value={draft.type} onChange={(ev) => setDraft({ ...draft, type: ev.target.value })} options={Object.values(CredentialType).map((x) => ({ value: x, label: e(`CredentialType.${x}`) }))} />
            <Input label={t('credTitle')} required value={draft.title} onChange={(ev) => setDraft({ ...draft, title: ev.target.value })} placeholder={t('credTitlePlaceholder')} />
            <Input label={t('issuer')} value={draft.issuer ?? ''} onChange={(ev) => setDraft({ ...draft, issuer: ev.target.value })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('issuedAt')} type="date" value={draft.issuedAt ?? ''} onChange={(ev) => setDraft({ ...draft, issuedAt: ev.target.value })} />
              <Input label={t('validUntil')} type="date" value={draft.validUntil ?? ''} onChange={(ev) => setDraft({ ...draft, validUntil: ev.target.value })} />
            </div>
            {draft.type === 'REGISTRY_ENTRY' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label={t('registry')} value={draft.registry ?? ''} onChange={(ev) => setDraft({ ...draft, registry: ev.target.value })} options={Object.values(Registry).map((x) => ({ value: x, label: e(`Registry.${x}`) }))} />
                <Input label={t('registryNumber')} hint={t('registryNumberHint')} value={draft.registryNumber ?? ''} onChange={(ev) => setDraft({ ...draft, registryNumber: ev.target.value })} />
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cred-file" className="text-caption text-ink-700">{t('file')}</label>
              <input id="cred-file" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(ev) => void onFile(ev.target.files?.[0])} className="text-body-s file:mr-3 file:h-control-s file:rounded-control file:border file:border-line-300 file:bg-surface-0 file:px-3 file:text-body-s" />
              <p className="text-micro text-ink-500">
                <Icon icon={FileText} size={14} /> {fileName ?? (draft.fileId ? t('fileAttached') : t('fileHint'))}
              </p>
            </div>
            {error ? <Callout tone="critical">{error}</Callout> : null}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
