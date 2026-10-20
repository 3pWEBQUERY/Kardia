'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { encodeFilter, evaluateMatch, withoutCondition, type SearchFilter } from '@kardia/core';

import { ConditionChips } from '@/components/domain/ConditionChips';

/** Erkannte Filter als Chips, die man entfernen kann (KI-2, PRD 9.1). */
export function ActiveFilters({ filter }: { filter: SearchFilter }) {
  const t = useTranslations('common.search');
  const router = useRouter();
  if (filter.conditions.length === 0) return null;
  // Ohne Treffer-Kontext: Zustand "unbekannt"; zeigt nur die gewählten Bedingungen.
  const results = evaluateMatch(filter.conditions, { profile: {}, hasParking: null, allowsPendingRecog: null, trainingCategory: null }).results;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-micro text-ink-500">{t('active')}</span>
      <ConditionChips
        results={results.map((r) => ({ ...r, state: 'unknown' as const }))}
        onRemove={(key) => router.push(`/search?f=${encodeFilter(withoutCondition(filter, key as never))}`)}
      />
    </div>
  );
}
