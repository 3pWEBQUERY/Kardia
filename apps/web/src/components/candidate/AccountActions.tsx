'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, Callout, Dialog, Input } from '@kardia/ui';

import { deleteAccount, exportData } from '@/app/actions/candidate';
import { authClient } from '@/lib/auth-client';
import { useActionMessage } from '@/lib/useActionError';

/** Datenexport als JSON per Klick, Selbstlöschung, Abmelden. */
export function AccountActions({ email }: { email: string }) {
  const t = useTranslations('candidate.settings');
  const c = useTranslations('common');
  const message = useActionMessage();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const download = async () => {
    const r = await exportData();
    if (!r.ok) return setError(message(r));
    const url = URL.createObjectURL(new Blob([r.data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `kardia-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => void download()}>{t('export')}</Button>
      <Button onClick={() => void authClient.signOut().then(() => (window.location.href = '/'))}>{c('nav.signOut')}</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t('deleteTitle')}
        description={t('deleteBody')}
        trigger={<Button variant="danger">{t('delete')}</Button>}
        footer={
          <>
            <Button onClick={() => setOpen(false)}>{c('actions.cancel')}</Button>
            <Button variant="danger" disabled={confirm.trim().toLowerCase() !== email.toLowerCase()} onClick={() => void deleteAccount(confirm).then((r) => (r.ok ? (window.location.href = '/') : setError(message(r))))}>
              {t('deleteConfirm')}
            </Button>
          </>
        }
      >
        <Input label={t('deleteType', { email })} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Dialog>
      {error ? <Callout tone="critical">{error}</Callout> : null}
    </div>
  );
}
