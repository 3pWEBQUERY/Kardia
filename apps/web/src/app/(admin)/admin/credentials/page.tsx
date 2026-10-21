import { Award, BadgeCheck, FileBadge, GraduationCap, Languages, ScrollText, type LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { formatDate } from '@kardia/core';
import { EmptyState, StatusChip } from '@kardia/ui';

import { PageHeader, RowLink } from '@/components/app/PageHeader';
import { credentialQueue } from '@/server/services/admin';

const TYPE_ICONS: Record<string, LucideIcon> = {
  DIPLOMA: GraduationCap,
  RECOGNITION_SRK: Award,
  RECOGNITION_MEBEKO: Award,
  REGISTRY_ENTRY: ScrollText,
  FURTHER_EDUCATION: FileBadge,
  LANGUAGE_CERTIFICATE: Languages,
};

/** Prüfqueue Qualifikations-Pass: älteste zuerst, Alter in Arbeitstagen, SLA-Markierung (AK-D3). */
export default async function CredentialQueuePage() {
  const [t, e, ta] = await Promise.all([getTranslations('admin.credentials'), getTranslations('enums'), getTranslations('admin')]);
  const items = await credentialQueue();
  const overdue = items.filter((c) => c.overdue).length;
  const inReview = items.filter((c) => c.status === 'IN_REVIEW').length;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={ta('eyebrow')}
        title={t('title')}
        description={t('lead')}
        stats={[
          { label: t('stats.open'), value: items.length },
          { label: e('CredentialStatus.IN_REVIEW'), value: inReview },
          { label: t('stats.overdue'), value: overdue },
        ]}
      />
      {items.length === 0 ? (
        <EmptyState>{t('empty')}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((c) => (
            <li key={c.id}>
              <RowLink
                href={`/admin/credentials/${c.id}`}
                icon={TYPE_ICONS[c.type] ?? BadgeCheck}
                title={`${c.candidate.firstName} ${c.candidate.lastName} · ${e(`CredentialType.${c.type}`)}`}
                meta={
                  <>
                    <span>{e(`Profession.${c.candidate.profession}`)}</span>
                    <span aria-hidden>·</span>
                    <span>{c.title}</span>
                    <span aria-hidden>·</span>
                    <span className="tabular">{`${t('submitted')} ${formatDate(c.createdAt)}`}</span>
                  </>
                }
                aside={<span className="text-caption text-ink-700 tabular">{t('ageDays', { days: c.ageBusinessDays })}</span>}
              >
                <span className="flex flex-wrap gap-1.5">
                  <StatusChip tone={c.status === 'IN_REVIEW' ? 'accent' : 'neutral'}>{e(`CredentialStatus.${c.status}`)}</StatusChip>
                  {c.overdue ? <StatusChip tone="critical">{t('overdue')}</StatusChip> : null}
                </span>
              </RowLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
