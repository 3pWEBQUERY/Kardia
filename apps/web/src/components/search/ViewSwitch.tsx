'use client';

import { List, Map } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { encodeFilter, type SearchFilter } from '@kardia/core';
import { Icon, cx } from '@kardia/ui';

export function ViewSwitch({ filter }: { filter: SearchFilter }) {
  const t = useTranslations('common.search');
  const items = [
    { view: 'list' as const, icon: List, label: t('list') },
    { view: 'map' as const, icon: Map, label: t('map') },
  ];
  return (
    <nav aria-label={t('view')} className="inline-flex overflow-hidden rounded-control border border-line-300">
      {items.map((i) => (
        <Link
          key={i.view}
          href={`/search?f=${encodeFilter({ ...filter, view: i.view })}`}
          aria-current={filter.view === i.view ? 'page' : undefined}
          className={cx('inline-flex h-control-s items-center gap-1.5 border-l border-line-300 px-3 text-body-s first:border-l-0', filter.view === i.view ? 'bg-accent-50 text-accent-700' : 'text-ink-700 hover:bg-surface-100')}
        >
          <Icon icon={i.icon} size={16} />
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function SortSelect({ filter }: { filter: SearchFilter }) {
  const t = useTranslations('common.search');
  return (
    <label className="flex items-center gap-2 text-body-s text-ink-700">
      {t('sort')}
      <select
        className="h-control-s rounded-control border border-line-300 bg-surface-0 px-2 text-body-s text-ink-900"
        value={filter.sort}
        onChange={(e) => (window.location.href = `/search?f=${encodeFilter({ ...filter, sort: e.target.value as SearchFilter['sort'] })}`)}
      >
        <option value="match">{t('sortMatch')}</option>
        <option value="newest">{t('sortNewest')}</option>
        <option value="salary">{t('sortSalary')}</option>
      </select>
    </label>
  );
}
