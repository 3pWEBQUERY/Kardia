import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { formatDate } from '@kardia/core';
import { Button, EmptyState, StatusChip } from '@kardia/ui';

import { listMyApplications } from '@/server/services/applications';
import { requireUser } from '@/server/session';

const TONE = { NEW: 'neutral', SCREENED: 'neutral', INTERVIEW: 'accent', OFFER: 'accent', HIRED: 'ok', REJECTED: 'critical', WITHDRAWN: 'neutral' } as const;

/** Eigene Bewerbungen mit Status – offline lesbar (PRD 13.2). */
export default async function ApplicationsPage() {
  const s = await requireUser('/me/applications');
  const [t, e] = await Promise.all([getTranslations('candidate.applications'), getTranslations('enums')]);
  const apps = await listMyApplications(s.user.id);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">{t('title')}</h1>
      {apps.length === 0 ? <EmptyState action={<Button asChild variant="primary"><Link href="/search">{t('toSearch')}</Link></Button>}>{t('empty')}</EmptyState> : null}
      <ul className="flex flex-col gap-2">
        {apps.map((a) => (
          <li key={a.id}>
            <Link href={`/me/applications/${a.id}`} className="flex flex-col gap-1 rounded-card border border-line-300 bg-surface-0 px-4 py-3 hover:border-ink-500 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body-s font-medium">{a.job.title}</span>
                <span className="text-micro text-ink-500">
                  {a.job.ward.location.organization.name} · {a.job.ward.name} · {t('since', { date: formatDate(a.statusChangedAt) })}
                </span>
              </span>
              <span className="flex items-center gap-2">
                {a._count.messages ? <span className="text-micro text-ink-500">{t('messages', { count: a._count.messages })}</span> : null}
                <StatusChip tone={TONE[a.status]}>{e(`ApplicationStatus.${a.status}`)}</StatusChip>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
