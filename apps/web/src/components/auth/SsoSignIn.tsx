'use client';

import { Building2 } from 'lucide-react';
import { useState, type SyntheticEvent } from 'react';

import { Button, Callout, Icon, Input } from '@kardia/ui';

import { authClient } from '@/lib/auth-client';

/** Firmen-Login (SSO, Abo Spitalgruppe): Arbeits-E-Mail → Identity Provider der Organisation. */
export function SsoSignIn({
  next,
  labels,
}: {
  next: string;
  labels: { toggle: string; email: string; submit: string; hint: string; failed: string };
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: SyntheticEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await authClient.signIn.sso({ email, callbackURL: next });
    if (res.error) {
      setBusy(false);
      setError(labels.failed);
    }
  };

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <Icon icon={Building2} />
        {labels.toggle}
      </Button>
    );
  }
  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
      <Input label={labels.email} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} hint={labels.hint} />
      <Button type="submit" disabled={busy}>
        <Icon icon={Building2} />
        {labels.submit}
      </Button>
      {error ? <Callout tone="critical">{error}</Callout> : null}
    </form>
  );
}
