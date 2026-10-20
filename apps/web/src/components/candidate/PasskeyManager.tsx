'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { formatDate } from '@kardia/core';
import { Button, Callout, EmptyState } from '@kardia/ui';

import { authClient } from '@/lib/auth-client';

interface PasskeyRow {
  id: string;
  name?: string | null;
  createdAt?: Date | string | null;
}

/** Passkeys verwalten (Admins melden sich nur damit an). */
export function PasskeyManager() {
  const t = useTranslations('candidate.settings');
  const c = useTranslations('common');
  const [list, setList] = useState<PasskeyRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    const r = await authClient.passkey.listUserPasskeys();
    setList((r.data ?? []) as PasskeyRow[]);
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="flex flex-col gap-3">
      {list.length === 0 ? <EmptyState>{t('noPasskeys')}</EmptyState> : null}
      <ul className="flex flex-col">
        {list.map((p) => (
          <li key={p.id} className="flex items-center justify-between border-b border-line-200 py-2 last:border-0">
            <span className="text-body-s">{p.name || t('passkey')}{p.createdAt ? ` · ${formatDate(new Date(p.createdAt))}` : ''}</span>
            <Button size="s" variant="ghost" onClick={() => void authClient.passkey.deletePasskey({ id: p.id }).then(() => load())}>{c('actions.remove')}</Button>
          </li>
        ))}
      </ul>
      <div>
        <Button
          variant="primary"
          onClick={() =>
            void authClient.passkey.addPasskey({ name: navigator.platform || 'Passkey' }).then((r) => {
              if (r?.error) setError(t('passkeyFailed'));
              else void load();
            })
          }
        >
          {t('addPasskey')}
        </Button>
      </div>
      {error ? <Callout tone="critical">{error}</Callout> : null}
    </div>
  );
}
