'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { WEBHOOK_EVENTS } from '@kardia/core';
import { MemberRole } from '@kardia/db/enums';
import { Button, Callout, Checkbox, Input, Select, useToast } from '@kardia/ui';

import {
  dropApiKey,
  dropMember,
  dropWebhook,
  inviteTeamMember,
  newApiKey,
  newFeed,
  newWebhook,
  saveDomains,
  setMemberRole,
} from '@/app/actions/employer';
import { useActionMessage } from '@/lib/useActionError';

function useRun() {
  const router = useRouter();
  const toast = useToast();
  const message = useActionMessage();
  return async <T,>(
    p: Promise<{ ok: true; data: T } | { ok: false; error: { kind: string; message: string } }>,
    done?: string,
  ): Promise<T | null> => {
    const r = await p;
    if (!r.ok) {
      toast({ tone: 'critical', message: message(r) ?? '' });
      return null;
    }
    if (done) toast({ tone: 'neutral', message: done });
    router.refresh();
    return r.data;
  };
}

export function InviteMemberForm() {
  const t = useTranslations('employer.team');
  const te = useTranslations('enums');
  const run = useRun();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>(MemberRole.RECRUITER);
  return (
    <form
      className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        void run(inviteTeamMember(email, role as MemberRole), t('invited')).then(
          (ok) => ok !== null && setEmail(''),
        );
      }}
    >
      <Input
        label={t('email')}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Select
        label={t('role')}
        value={role}
        onChange={(e) => setRole(e.target.value)}
        options={Object.values(MemberRole).map((r) => ({ value: r, label: te(`MemberRole.${r}`) }))}
      />
      <Button type="submit" variant="primary">
        {t('invite')}
      </Button>
    </form>
  );
}

export function MemberRow({
  id,
  label,
  role,
  isSelf,
}: {
  id: string;
  label: string;
  role: string;
  isSelf: boolean;
}) {
  const t = useTranslations('employer.team');
  const te = useTranslations('enums');
  const run = useRun();
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span className="text-body-s">{label}</span>
      <div className="flex items-center gap-2">
        <select
          aria-label={t('role')}
          defaultValue={role}
          onChange={(e) =>
            void run(setMemberRole(id, e.target.value as MemberRole), t('roleSaved'))
          }
          className="h-control-s rounded-control border border-line-300 bg-surface-0 px-2 text-body-s"
        >
          {Object.values(MemberRole).map((r) => (
            <option key={r} value={r}>
              {te(`MemberRole.${r}`)}
            </option>
          ))}
        </select>
        {!isSelf ? (
          <Button size="s" variant="danger" onClick={() => void run(dropMember(id), t('removed'))}>
            {t('remove')}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function DomainsForm({ initial }: { initial: string[] }) {
  const t = useTranslations('employer.team');
  const run = useRun();
  const [v, setV] = useState(initial.join(', '));
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          saveDomains(
            v
              .split(',')
              .map((d) => d.trim())
              .filter(Boolean),
          ),
          t('domainsSaved'),
        );
      }}
    >
      <div className="min-w-64 flex-1">
        <Input
          label={t('domains')}
          hint={t('domainsHint')}
          value={v}
          onChange={(e) => setV(e.target.value)}
        />
      </div>
      <Button type="submit">{t('save')}</Button>
    </form>
  );
}

/** Klartext wird nur einmal angezeigt (gespeichert ist nur der SHA-256). */
function OnceSecret({ label, value }: { label: string; value: string }) {
  const t = useTranslations('employer.team');
  const [copied, setCopied] = useState(false);
  return (
    <Callout tone="warn" title={label}>
      <code className="block font-mono text-micro break-all">{value}</code>
      <div className="mt-2">
        <Button
          size="s"
          onClick={() => void navigator.clipboard.writeText(value).then(() => setCopied(true))}
        >
          {copied ? t('copied') : t('copy')}
        </Button>
      </div>
    </Callout>
  );
}

export function ApiKeys({
  keys,
  enabled,
}: {
  keys: {
    id: string;
    name: string;
    prefix: string;
    scopes: string[];
    lastUsedAt: string | null;
    revokedAt: string | null;
  }[];
  enabled: boolean;
}) {
  const t = useTranslations('employer.team');
  const run = useRun();
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<Set<'jobs:write' | 'applications:read'>>(
    new Set(['applications:read']),
  );
  const [plain, setPlain] = useState<string | null>(null);
  if (!enabled) return <Callout>{t('apiNotInPlan')}</Callout>;
  return (
    <div className="flex flex-col gap-3">
      {plain ? <OnceSecret label={t('keyOnce')} value={plain} /> : null}
      <ul className="flex flex-col divide-y divide-line-200">
        {keys.map((k) => (
          <li
            key={k.id}
            className="flex flex-wrap items-center justify-between gap-2 py-2 text-body-s"
          >
            <span>
              <span className="font-mono">{k.prefix}…</span> · {k.name} · {k.scopes.join(', ')}
            </span>
            {k.revokedAt ? (
              <span className="text-ink-500">{t('revoked')}</span>
            ) : (
              <Button
                size="s"
                variant="danger"
                onClick={() => void run(dropApiKey(k.id), t('revokedToast'))}
              >
                {t('revoke')}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(newApiKey(name, [...scopes])).then((d) => {
            if (d) {
              setPlain(d.key);
              setName('');
            }
          });
        }}
      >
        <Input
          label={t('keyName')}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex flex-wrap gap-4">
          {(['jobs:write', 'applications:read'] as const).map((s) => (
            <Checkbox
              key={s}
              label={s}
              checked={scopes.has(s)}
              onCheckedChange={(on) =>
                setScopes((p) => {
                  const n = new Set(p);
                  if (on) n.add(s);
                  else n.delete(s);
                  return n;
                })
              }
            />
          ))}
        </div>
        <div>
          <Button type="submit" disabled={!name.trim() || scopes.size === 0}>
            {t('createKey')}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function Webhooks({
  hooks,
  enabled,
}: {
  hooks: { id: string; url: string; events: string[] }[];
  enabled: boolean;
}) {
  const t = useTranslations('employer.team');
  const run = useRun();
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<Set<string>>(new Set(WEBHOOK_EVENTS));
  const [secret, setSecret] = useState<string | null>(null);
  if (!enabled) return <Callout>{t('apiNotInPlan')}</Callout>;
  return (
    <div className="flex flex-col gap-3">
      {secret ? <OnceSecret label={t('secretOnce')} value={secret} /> : null}
      <ul className="flex flex-col divide-y divide-line-200">
        {hooks.map((h) => (
          <li
            key={h.id}
            className="flex flex-wrap items-center justify-between gap-2 py-2 text-body-s"
          >
            <span className="break-all">
              {h.url} · {h.events.join(', ')}
            </span>
            <Button
              size="s"
              variant="danger"
              onClick={() => void run(dropWebhook(h.id), t('deleted'))}
            >
              {t('delete')}
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(newWebhook(url, [...events])).then((d) => {
            if (d) {
              setSecret(d.secret);
              setUrl('');
            }
          });
        }}
      >
        <Input
          label={t('webhookUrl')}
          type="url"
          placeholder="https://"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          hint={t('webhookHint')}
        />
        <div className="flex flex-wrap gap-4">
          {WEBHOOK_EVENTS.map((ev) => (
            <Checkbox
              key={ev}
              label={ev}
              checked={events.has(ev)}
              onCheckedChange={(on) =>
                setEvents((p) => {
                  const n = new Set(p);
                  if (on) n.add(ev);
                  else n.delete(ev);
                  return n;
                })
              }
            />
          ))}
        </div>
        <div>
          <Button type="submit" disabled={!url || events.size === 0}>
            {t('createWebhook')}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function Feeds({
  feeds,
  wards,
  enabled,
}: {
  feeds: {
    id: string;
    url: string;
    format: string;
    lastRunAt: string | null;
    lastError: string | null;
  }[];
  wards: { id: string; name: string }[];
  enabled: boolean;
}) {
  const t = useTranslations('employer.team');
  const run = useRun();
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<'XML' | 'JSON'>('XML');
  const [wardId, setWardId] = useState(wards[0]?.id ?? '');
  if (!enabled) return <Callout>{t('apiNotInPlan')}</Callout>;
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-line-200">
        {feeds.map((f) => (
          <li key={f.id} className="flex flex-col py-2 text-body-s">
            <span className="break-all">
              {f.url} · {f.format}
            </span>
            <span
              className={f.lastError ? 'text-micro text-critical-600' : 'text-micro text-ink-500'}
            >
              {f.lastError ??
                (f.lastRunAt ? t('feedLastRun', { date: f.lastRunAt }) : t('feedPending'))}
            </span>
          </li>
        ))}
      </ul>
      <form
        className="grid gap-2 sm:grid-cols-[2fr_1fr_1.5fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void run(newFeed({ url, format, wardId }), t('feedCreated')).then(
            (d) => d !== null && setUrl(''),
          );
        }}
      >
        <Input
          label={t('feedUrl')}
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Select
          label={t('feedFormat')}
          value={format}
          onChange={(e) => setFormat(e.target.value as 'XML' | 'JSON')}
          options={[
            { value: 'XML', label: 'XML' },
            { value: 'JSON', label: 'JSON' },
          ]}
        />
        <Select
          label={t('feedWard')}
          value={wardId}
          onChange={(e) => setWardId(e.target.value)}
          options={wards.map((w) => ({ value: w.id, label: w.name }))}
        />
        <Button type="submit" disabled={!url || !wardId}>
          {t('createFeed')}
        </Button>
      </form>
      <p className="text-micro text-ink-500">{t('feedHint')}</p>
    </div>
  );
}
