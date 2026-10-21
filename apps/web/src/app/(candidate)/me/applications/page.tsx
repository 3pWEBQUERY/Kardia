import { MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { formatDate } from '@kardia/core';
import { Button, EmptyState, Icon, StatusChip } from '@kardia/ui';

import { PageHeader, RowLink } from '@/components/app/PageHeader';
import { StatusSteps } from '@/components/app/StatusSteps';
import { DEPARTMENT_ICONS } from '@/components/brand/departmentIcons';
import { listMyApplications } from '@/server/services/applications';
import { requireUser } from '@/server/session';

const TONE = { NEW: 'neutral', SCREENED: 'neutral', INTERVIEW: 'accent', OFFER: 'accent', HIRED: 'ok', REJECTED: 'critical', WITHDRAWN: 'neutral' } as const;
const CLOSED = ['HIRED', 'REJECTED', 'WITHDRAWN'];

/** Eigene Bewerbungen mit Status – offline lesbar (PRD 13.2). */
export default async function ApplicationsPage() {
  const s = await requireUser('/me/applications');
  const [t, e, tm] = await Promise.all([getTranslations('candidate.applications'), getTranslations('enums'), getTranslations('candidate.overview')]);
  const apps = await listMyApplications(s.user.id);
  const active = apps.filter((a) => !CLOSED.includes(a.status));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={tm('eyebrow')}
        title={t('title')}
        description={t('lead')}
        actions={
          <Button asChild variant="primary">
            <Link href="/search">{t('toSearch')}</Link>
          </Button>
        }
        stats={[
          { label: t('stats.active'), value: active.length },
          { label: t('stats.interviews'), value: apps.filter((a) => a.status === 'INTERVIEW' || a.status === 'OFFER').length },
          { label: t('stats.closed'), value: apps.length - active.length },
        ]}
      />
      {apps.length === 0 ? (
        <EmptyState
          action={
            <Button asChild variant="primary">
              <Link href="/search">{t('toSearch')}</Link>
            </Button>
          }
        >
          {t('empty')}
        </EmptyState>
      ) : null}
      <ul className="flex flex-col gap-2">
        {apps.map((a) => (
          <li key={a.id}>
            <RowLink
              href={`/me/applications/${a.id}`}
              icon={DEPARTMENT_ICONS[a.job.ward.department]}
              title={a.job.title}
              meta={
                <>
                  <span>{a.job.ward.location.organization.name}</span>
                  <span aria-hidden>·</span>
                  <span>{a.job.ward.name}</span>
                  <span aria-hidden>·</span>
                  <span className="tabular">{t('since', { date: formatDate(a.statusChangedAt) })}</span>
                </>
              }
              aside={
                <>
                  {a._count.messages ? (
                    <span className="inline-flex items-center gap-1 text-micro text-ink-500 tabular">
                      <Icon icon={MessageSquare} size={14} />
                      {a._count.messages}
                    </span>
                  ) : null}
                  <StatusSteps status={a.status} className="hidden lg:inline-flex" />
                  <StatusChip tone={TONE[a.status]}>{e(`ApplicationStatus.${a.status}`)}</StatusChip>
                </>
              }
            >
              <span className="flex items-center gap-2 sm:hidden">
                <StatusChip tone={TONE[a.status]}>{e(`ApplicationStatus.${a.status}`)}</StatusChip>
              </span>
            </RowLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
