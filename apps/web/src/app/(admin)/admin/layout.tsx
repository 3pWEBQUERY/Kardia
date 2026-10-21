import { cookies } from 'next/headers';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';


import { AppShell, type NavItem } from '@/components/shell/AppShell';
import { requireAdmin } from '@/server/session';

import type { ReactNode } from 'react';

function pick(all: Record<string, AbstractIntlMessages>, keys: string[]): AbstractIntlMessages {
  return Object.fromEntries(keys.map((k) => [k, all[k] ?? {}]));
}

export const metadata = { robots: { index: false, follow: false } };

/** Admin-Konsole (PRD 6): nur mit Passkey-Sitzung ≤ 12 h (requireAdmin). */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const s = await requireAdmin();
  const t = await getTranslations('common.nav');
  const all = (await getMessages()) as Record<string, AbstractIntlMessages>;
  const collapsed = (await cookies()).get('kardia_nav')?.value === '1';
  const items: NavItem[] = [
    { href: '/admin', label: t('admin.kpis'), icon: 'kpis' },
    { href: '/admin/credentials', label: t('admin.credentials'), icon: 'credentials' },
    { href: '/admin/organizations', label: t('admin.organizations'), icon: 'organizations' },
    { href: '/admin/moderation', label: t('admin.moderation'), icon: 'moderation' },
    { href: '/admin/editorial', label: t('admin.editorial'), icon: 'editorial' },
    { href: '/admin/privacy', label: t('admin.privacy'), icon: 'privacy' },
    { href: '/admin/audit', label: t('admin.audit'), icon: 'audit' },
  ];
  return (
    <NextIntlClientProvider messages={pick(all, ['common', 'enums', 'fields', 'errors', 'admin'])}>
      <AppShell
        items={items}
        title={t('admin.queues')}
        initialCollapsed={collapsed}
        labels={{ collapse: t('collapse'), expand: t('expand'), more: t('more'), menu: t('menu') }}
        top={<p className="truncate text-micro text-ink-500">{s.user.email}</p>}
      >
        {children}
      </AppShell>
    </NextIntlClientProvider>
  );
}
