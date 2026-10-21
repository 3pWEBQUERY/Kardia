'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { normalizeUid } from '@kardia/core';
import { Button, Callout, Checkbox, Input } from '@kardia/ui';

import { registerOrg } from '@/app/actions/employer';
import { useActionMessage } from '@/lib/useActionError';

export function OnboardingForm({
  labels,
  defaultDomain,
}: {
  labels: {
    name: string;
    uid: string;
    uidHint: string;
    domains: string;
    domainsHint: string;
    terms: string;
    termsLink: string;
    submit: string;
  };
  defaultDomain: string;
}) {
  const te = useTranslations('errors.fields');
  const message = useActionMessage();
  const [name, setName] = useState('');
  const [uid, setUid] = useState('');
  const [domains, setDomains] = useState(defaultDomain);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const uidInvalid = uid.length >= 9 && !normalizeUid(uid);

  const submit = async () => {
    setError(null);
    setBusy(true);
    const r = await registerOrg({
      name,
      uid,
      emailDomains: domains
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean),
      acceptTerms: terms,
    });
    setBusy(false);
    if (!r.ok) setError(r.error.fields?.uid ? te('invalidUid') : message(r));
    else {
      router.replace('/employer');
      router.refresh();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-4"
    >
      <Input
        label={labels.name}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={160}
      />
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
      <Input
        label={labels.domains}
        required
        hint={labels.domainsHint}
        value={domains}
        onChange={(e) => setDomains(e.target.value)}
      />
      <Checkbox
        checked={terms}
        onCheckedChange={setTerms}
        label={
          <span>
            {labels.terms}{' '}
            <Link href="/legal/terms-employers" target="_blank" className="text-accent-700 underline">
              {labels.termsLink}
            </Link>
          </span>
        }
      />
      {error ? <Callout tone="critical">{error}</Callout> : null}
      <div>
        <Button type="submit" variant="primary" disabled={busy || uidInvalid || !terms}>
          {labels.submit}
        </Button>
      </div>
    </form>
  );
}
