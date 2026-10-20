'use client';

import { KeyRound, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

import { Button, Callout, Icon, Input } from '@kardia/ui';

import { authClient } from '@/lib/auth-client';

/** Konto per Passkey oder E-Mail-Link – kein Passwort (PRD 7.3, 14.2). */
export function SignInForm({ next, adminOnly }: { next: string; adminOnly: boolean }) {
  const t = useTranslations('common.auth');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const passkey = async () => {
    setError(null);
    setBusy(true);
    const res = await authClient.signIn.passkey();
    setBusy(false);
    if (res?.error) setError(t('passkeyFailed'));
    else window.location.href = next;
  };

  const magic = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await authClient.signIn.magicLink({ email, callbackURL: next });
    setBusy(false);
    if (res.error) setError(t('linkFailed'));
    else setSent(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <Button variant="primary" size="l" onClick={() => void passkey()} disabled={busy}>
        <Icon icon={KeyRound} />
        {t('passkey')}
      </Button>
      {adminOnly ? <Callout tone="warn">{t('adminPasskey')}</Callout> : null}
      <div className="flex items-center gap-3 text-micro text-ink-500" aria-hidden>
        <span className="h-px flex-1 bg-line-200" />
        {t('or')}
        <span className="h-px flex-1 bg-line-200" />
      </div>
      {sent ? (
        <Callout title={t('sentTitle')}>{t('sent', { email })}</Callout>
      ) : (
        <form onSubmit={(e) => void magic(e)} className="flex flex-col gap-3">
          <Input label={t('email')} type="email" required autoComplete="email webauthn" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" size="l" disabled={busy}>
            <Icon icon={Mail} />
            {t('sendLink')}
          </Button>
          <p className="text-micro text-ink-500">{t('linkHint')}</p>
        </form>
      )}
      {error ? <Callout tone="critical">{error}</Callout> : null}
    </div>
  );
}
