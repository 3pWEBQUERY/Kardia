import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { formatDate } from '@kardia/core';
import { EmptyState, StatusChip } from '@kardia/ui';

import { credentialQueue } from '@/server/services/admin';

/** Prüfqueue Qualifikations-Pass: älteste zuerst, Alter in Arbeitstagen, SLA-Markierung (AK-D3). */
export default async function CredentialQueuePage() {
  const [t, e] = await Promise.all([getTranslations('admin.credentials'), getTranslations('enums')]);
  const items = await credentialQueue();
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-s text-ink-700">{t('lead')}</p>
      </header>
      {items.length === 0 ? (
        <EmptyState>{t('empty')}</EmptyState>
      ) : (
        <div className="overflow-x-auto border border-line-300 bg-surface-0">
          <table className="w-full border-collapse text-body-s">
            <caption className="sr-only">{t('title')}</caption>
            <thead>
              <tr className="bg-surface-100 text-left text-caption text-ink-700">
                <th scope="col" className="h-row px-3">{t('person')}</th>
                <th scope="col" className="px-3">{t('type')}</th>
                <th scope="col" className="px-3">{t('submitted')}</th>
                <th scope="col" className="px-3">{t('age')}</th>
                <th scope="col" className="px-3">{t('status')}</th>
                <th scope="col" className="px-3"><span className="sr-only">{t('open')}</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="h-row border-t border-line-200">
                  <td className="px-3">
                    {c.candidate.firstName} {c.candidate.lastName}
                    <span className="block text-micro text-ink-500">{e(`Profession.${c.candidate.profession}`)}</span>
                  </td>
                  <td className="px-3">
                    {e(`CredentialType.${c.type}`)}
                    <span className="block text-micro text-ink-500">{c.title}</span>
                  </td>
                  <td className="px-3 tabular">{formatDate(c.createdAt)}</td>
                  <td className="px-3 tabular">
                    {t('ageDays', { days: c.ageBusinessDays })}
                    {c.overdue ? <span className="ml-2"><StatusChip tone="critical">{t('overdue')}</StatusChip></span> : null}
                  </td>
                  <td className="px-3"><StatusChip tone={c.status === 'IN_REVIEW' ? 'accent' : 'neutral'}>{e(`CredentialStatus.${c.status}`)}</StatusChip></td>
                  <td className="px-3 text-right">
                    <Link href={`/admin/credentials/${c.id}`} className="text-accent-600 hover:text-accent-700">{t('open')}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
