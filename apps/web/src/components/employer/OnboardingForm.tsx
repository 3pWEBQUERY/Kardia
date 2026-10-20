'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

import { normalizeUid } from '@kardia/core';
import { Button, Callout, Input } from '@kardia/ui';

import { registerOrg } from '@/app/actions/employer';
import { useActionMessage } from '@/lib/useActionError';

export function OnboardingForm({
  labels,
  defaultDomain,
}: {
  labels: { name: string; uid: string; uidHint: string; domains: string; domainsHint: string; submit: string };
  defaultDomain: string;
}) {
  const te = useTranslations('errors.fields');
  const message = useActionMessage();
  const [name, setName] = useState('');
  const [uid, setUid] = useState('');
  const [domains, setDomains] = useState(defaultDomain);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const uidInvalid = uid.length >= 9 && !normalizeUid(uid);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const r = await registerOrg({ name, uid, emailDomains: domains.split(',').map((d) => d.trim()).filter(Boolean) });
    setBusy(false);
    if (!r.ok) setError(r.error.fields?.uid ? te('invalidUid') : message(r));
    else window.location.href = '/employer';
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      <Input label={labels.name} required value={name} onChange={(e) => setName(e.target.value)} maxLength={160} />
      <Input
        label={labels.uid}
        required
        hint={labels.uidHint}
        error={uidInvalid ? te('invalidUid') : undefined}
        value={uid}
        onChange={(e) => setUid(e.target.value)}
        onBlur={() => setUid((v) => normalizeUid(v) ?? v)}
        placeholder="CHE-123.456.789"
      />
      <Input label={labels.domains} required hint={labels.domainsHint} value={domains} onChange={(e) => setDomains(e.target.value)} />
      {error ? <Callout tone="critical">{error}</Callout> : null}
      <div>
        <Button type="submit" variant="primary" disabled={busy || uidInvalid}>{labels.submit}</Button>
      </div>
    </form>
  );
}
