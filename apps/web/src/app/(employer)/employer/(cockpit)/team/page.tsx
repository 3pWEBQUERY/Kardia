import { getTranslations } from 'next-intl/server';

import { can, formatDateTime, limitsFor } from '@kardia/core';
import { Callout, Card, CardBody, CardHeader, StatusChip } from '@kardia/ui';

import {
  ApiKeys,
  DomainsForm,
  Feeds,
  InviteMemberForm,
  MemberRow,
  Webhooks,
} from '@/components/employer/TeamSettings';
import { db } from '@/server/db';
import { listMembers, orgSettings } from '@/server/services/org';
import { requireOrg } from '@/server/session';

/** Team & Einstellungen: Mitglieder und Rollen, E-Mail-Domains, API, Webhooks, Feed-Import, SSO. */
export default async function TeamPage() {
  const ctx = await requireOrg();
  const [t, te] = await Promise.all([getTranslations('employer.team'), getTranslations('enums')]);
  const limits = limitsFor(ctx.org.plan as Parameters<typeof limitsFor>[0]);
  const manage = can(ctx.role, 'team.manage');
  const apiManage = can(ctx.role, 'apikeys.manage');
  const [{ members, invites }, settings, wards] = await Promise.all([
    listMembers(ctx),
    orgSettings(ctx),
    db.ward.findMany({
      where: { location: { organizationId: ctx.org.id } },
      select: { id: true, name: true },
    }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-s text-ink-700">
          {t('lead', { role: te(`MemberRole.${ctx.role}`) })}
        </p>
      </header>
      <Card>
        <CardHeader
          title={t('members')}
          meta={
            limits?.users != null
              ? t('usersLimit', { count: members.length, max: limits.users })
              : undefined
          }
        />
        <CardBody className="flex flex-col gap-4">
          {manage ? (
            <ul className="flex flex-col divide-y divide-line-200">
              {members.map((m) => (
                <MemberRow
                  key={m.id}
                  id={m.id}
                  role={m.role}
                  label={`${m.user.name || m.user.email} · ${m.user.email}`}
                  isSelf={m.userId === ctx.user.id}
                />
              ))}
            </ul>
          ) : (
            <ul className="flex flex-col divide-y divide-line-200 text-body-s">
              {members.map((m) => (
                <li key={m.id} className="flex justify-between py-2">
                  <span>{m.user.name || m.user.email}</span>
                  <StatusChip>{te(`MemberRole.${m.role}`)}</StatusChip>
                </li>
              ))}
            </ul>
          )}
          {invites.length ? (
            <div className="flex flex-col gap-1">
              <h3 className="text-caption text-ink-700">{t('openInvites')}</h3>
              <ul className="text-body-s">
                {invites.map((i) => (
                  <li key={i.id}>
                    {i.email} · {i.role ? te(`MemberRole.${i.role}`) : ''} ·{' '}
                    {t('until', { date: formatDateTime(i.expiresAt) })}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {manage ? <InviteMemberForm /> : <Callout>{t('noPermission')}</Callout>}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t('domainsTitle')} />
        <CardBody>
          {can(ctx.role, 'org.manage') ? (
            <DomainsForm initial={settings.emailDomains} />
          ) : (
            <p className="text-body-s">{settings.emailDomains.join(', ')}</p>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t('sso')} />
        <CardBody>
          <Callout>{limits?.sso ? t('ssoAvailable') : t('ssoNotInPlan')}</Callout>
        </CardBody>
      </Card>
      {apiManage ? (
        <>
          <Card>
            <CardHeader title={t('apiKeys')} meta={t('apiHint')} />
            <CardBody>
              <ApiKeys
                enabled={!!limits?.api}
                keys={settings.apiKeys.map((k) => ({
                  id: k.id,
                  name: k.name,
                  prefix: k.prefix,
                  scopes: k.scopes,
                  lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
                  revokedAt: k.revokedAt?.toISOString() ?? null,
                }))}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('webhooks')} />
            <CardBody>
              <Webhooks
                enabled={!!limits?.webhooks}
                hooks={settings.webhooks.map((h) => ({ id: h.id, url: h.url, events: h.events }))}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('feeds')} />
            <CardBody>
              <Feeds
                enabled={!!limits?.feedImport}
                wards={wards}
                feeds={settings.feeds.map((f) => ({
                  id: f.id,
                  url: f.url,
                  format: f.format,
                  lastRunAt: f.lastRunAt ? formatDateTime(f.lastRunAt) : null,
                  lastError: f.lastError,
                }))}
              />
            </CardBody>
          </Card>
        </>
      ) : null}
    </div>
  );
}
