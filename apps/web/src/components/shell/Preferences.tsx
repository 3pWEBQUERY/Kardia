'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { setLocale, setTheme } from '@/app/actions/preferences';
import { LOCALES } from '@/i18n/config';

/** Sprache und Darstellung – native Selects, ohne Client-Bibliothek. */
export function Preferences({ theme }: { theme: 'system' | 'light' | 'dark' }) {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3 text-micro text-ink-700" aria-busy={pending}>
      <label className="flex items-center gap-1.5">
        {t('language.label')}
        <select
          className="h-8 rounded-control border border-line-300 bg-surface-0 px-2 text-micro text-ink-900"
          defaultValue={locale}
          onChange={(e) => start(async () => { await setLocale(e.target.value); router.refresh(); })}
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>{t(`language.${l}`)}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5">
        {t('theme.label')}
        <select
          className="h-8 rounded-control border border-line-300 bg-surface-0 px-2 text-micro text-ink-900"
          defaultValue={theme}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'system') delete document.documentElement.dataset.theme;
            else document.documentElement.dataset.theme = v;
            start(async () => { await setTheme(v); });
          }}
        >
          <option value="system">{t('theme.system')}</option>
          <option value="light">{t('theme.light')}</option>
          <option value="dark">{t('theme.dark')}</option>
        </select>
      </label>
    </div>
  );
}
