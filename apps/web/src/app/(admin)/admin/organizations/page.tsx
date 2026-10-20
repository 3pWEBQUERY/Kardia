import { getTranslations } from 'next-intl/server';

import { formatDate } from '@kardia/core';
import { Callout, Card, CardBody, CardHeader, EmptyState, StatusChip } from '@kardia/ui';

import { OrgDecision, OrgPlanForm } from '@/components/admin/OrgActions';
import { listOrganizations, organizationQueue } from '@/server/services/admin';
import { orgCheckEvents } from '@/server/services/adminOrgs';

/** Prüfqueue Organisationen (UID, SECO-Treffer, Domain) und alle Organisationen mit Abo (PRD 6, AK-C1). */
export default async function AdminOrganizationsPage() {
  const [t, e] = await Promise.all([getTranslations('admin.organizations'), getTranslations('enums')]);
  const [queue, all] = await Promise.all([organizationQueue(), listOrganizations()]);
  const checks = await orgCheckEvents(queue.map((o) => o.id));
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-h1">{t('title')}</h1>
      <section className="flex flex-col gap-3">
        <h2 className="text-h2">{t('queue')}</h2>
        {queue.length === 0 ? <EmptyState>{t('queueEmpty')}</EmptyState> : null}
        {queue.map((o) => (
          <Card key={o.id}>
            <CardHeader
              title={o.name}
              meta={`${t('uid')} ${o.uid} · ${t('createdAt')} ${formatDate(o.createdAt)}`}
              actions={<StatusChip tone={o.verification === 'AGENCY_REVIEW' ? 'warn' : 'neutral'}>{e(`OrgVerification.${o.verification}`)}</StatusChip>}
            />
            <CardBody className="flex flex-col gap-3 text-body-s">
              {o.secoRegistryMatch || o.verification === 'AGENCY_REVIEW' ? <Callout tone="warn">{t('secoHit')}</Callout> : null}
              <p><span className="text-ink-700">{t('domains')}:</span> {o.emailDomains.join(', ')}</p>
              <p><span className="text-ink-700">{t('members')}:</span> {o.members.map((m) => m.user.email).join(', ')}</p>
              <div className="flex flex-col gap-1">
                <span className="text-ink-700">{t('check')}</span>
                {checks.get(o.id) ? (
                  <pre className="overflow-x-auto rounded-control border border-line-200 bg-surface-50 p-3 font-mono text-micro">{JSON.stringify(checks.get(o.id), null, 2)}</pre>
                ) : (
                  <span className="text-ink-500">{t('checkNone')}</span>
                )}
              </div>
              <OrgDecision id={o.id} />
            </CardBody>
          </Card>
        ))}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-h2">{t('all')}</h2>
        <div className="overflow-x-auto border border-line-300 bg-surface-0">
          <table className="w-full border-collapse text-body-s">
            <caption className="sr-only">{t('all')}</caption>
            <thead>
              <tr className="bg-surface-100 text-left text-caption text-ink-700">
                <th scope="col" className="h-row px-3">{t('title')}</th>
                <th scope="col" className="px-3">{t('uid')}</th>
                <th scope="col" className="px-3">{t('verification')}</th>
                <th scope="col" className="px-3">{t('plan')}</th>
              </tr>
            </thead>
            <tbody>
              {all.map((o) => (
                <tr key={o.id} className="border-t border-line-200 align-top">
                  <td className="px-3 py-2">{o.name}<span className="block text-micro text-ink-500">{t('members')}: {o._count.members}</span></td>
                  <td className="px-3 py-2 font-mono text-micro tabular">{o.uid}</td>
                  <td className="px-3 py-2"><StatusChip tone={o.verification === 'VERIFIED' ? 'ok' : o.verification === 'REJECTED' ? 'critical' : 'warn'}>{e(`OrgVerification.${o.verification}`)}</StatusChip></td>
                  <td className="px-3 py-2">
                    <OrgPlanForm
                      id={o.id}
                      plan={o.plan}
                      validUntil={o.planValidUntil ? o.planValidUntil.toISOString().slice(0, 10) : null}
                      foundingPartner={o.foundingPartner}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
