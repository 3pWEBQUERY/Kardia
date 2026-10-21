import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { formatDateTime } from '@kardia/core';
import { Button, EmptyState, Input } from '@kardia/ui';

import { PageHeader } from '@/components/app/PageHeader';
import { auditLog } from '@/server/services/admin';

/** Audit-Log (PRD 6, 14.2): Person, Zeit, Objekt, Vorher/Nachher; Filter und Cursor-Paginierung. */
export default async function AuditPage({ searchParams }: { searchParams: Promise<{ entity?: string; entityId?: string; cursor?: string }> }) {
  const sp = await searchParams;
  const t = await getTranslations('admin.audit');
  const ta = await getTranslations('admin');
  const filter = {
    ...(sp.entity ? { entity: sp.entity } : {}),
    ...(sp.entityId ? { entityId: sp.entityId } : {}),
    ...(sp.cursor ? { cursor: sp.cursor } : {}),
  };
  const rows = await auditLog(filter);
  const last = rows.at(-1);
  const next = rows.length === 100 && last ? `/admin/audit?${new URLSearchParams({ ...(sp.entity ? { entity: sp.entity } : {}), ...(sp.entityId ? { entityId: sp.entityId } : {}), cursor: last.id }).toString()}` : null;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={ta('eyebrow')} title={t('title')} description={t('lead')} />
      <form method="get" className="flex flex-wrap items-end gap-3">
        <Input label={t('entity')} name="entity" defaultValue={sp.entity ?? ''} className="w-48" />
        <Input label={t('entityId')} name="entityId" defaultValue={sp.entityId ?? ''} className="w-72" />
        <Button type="submit">{t('filter')}</Button>
        <Button asChild variant="ghost"><Link href="/admin/audit">{t('reset')}</Link></Button>
      </form>
      {rows.length === 0 ? (
        <EmptyState>{t('empty')}</EmptyState>
      ) : (
        <div className="relative overflow-x-auto border border-line-300 bg-surface-0">
          <table className="w-full border-collapse text-body-s">
            <caption className="sr-only">{t('title')}</caption>
            <thead>
              <tr className="bg-surface-100 text-left text-caption text-ink-700">
                <th scope="col" className="h-row px-3">{t('time')}</th>
                <th scope="col" className="px-3">{t('actor')}</th>
                <th scope="col" className="px-3">{t('action')}</th>
                <th scope="col" className="px-3">{t('object')}</th>
                <th scope="col" className="px-3">{t('change')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line-200 align-top">
                  <td className="px-3 py-2 whitespace-nowrap tabular">{formatDateTime(r.createdAt)}</td>
                  <td className="px-3 py-2">{r.actor.email}</td>
                  <td className="px-3 py-2 font-mono text-micro">{r.action}</td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/audit?entity=${encodeURIComponent(r.entity)}&entityId=${encodeURIComponent(r.entityId)}`} className="text-accent-600 hover:text-accent-700">
                      {r.entity}
                    </Link>
                    <span className="block font-mono text-micro text-ink-500">{r.entityId}</span>
                  </td>
                  <td className="px-3 py-2">
                    {r.before != null || r.after != null ? (
                      <details>
                        <summary className="cursor-pointer text-accent-600">{t('change')}</summary>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <div>
                            <span className="text-micro text-ink-500">{t('before')}</span>
                            <pre className="relative overflow-x-auto font-mono text-micro">{JSON.stringify(r.before, null, 2)}</pre>
                          </div>
                          <div>
                            <span className="text-micro text-ink-500">{t('after')}</span>
                            <pre className="relative overflow-x-auto font-mono text-micro">{JSON.stringify(r.after, null, 2)}</pre>
                          </div>
                        </div>
                      </details>
                    ) : (
                      <span className="text-ink-500">–</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {next ? <div><Button asChild><Link href={next}>{t('more')}</Link></Button></div> : null}
    </div>
  );
}
