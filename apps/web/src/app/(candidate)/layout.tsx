import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';


import { AppShell, type NavItem } from '@/components/shell/AppShell';
import { db } from '@/server/db';
import { requireUser } from '@/server/session';

import type { ReactNode } from 'react';

/** Bereich der Fachperson (PRD 7.2). */
export default async function CandidateLayout({ children }: { children: ReactNode }) {
  const s = await requireUser('/me');
  const t = await getTranslations('common.nav');
  const candidate = await db.candidateProfile.findUnique({ where: { userId: s.user.id }, select: { id: true, profession: true } });
  const [openOffers, ambassador, verified] = await Promise.all([
    candidate ? db.offer.count({ where: { candidateId: candidate.id, status: 'SENT', expiresAt: { gt: new Date() } } }) : 0,
    db.wardAmbassador.count({ where: { userId: s.user.id } }),
    db.verifiedEmployee.count({ where: { userId: s.user.id } }),
  ]);
  const items: NavItem[] = [
    { href: '/search', label: t('me.search'), icon: 'search' },
    { href: '/me/applications', label: t('me.applications'), icon: 'applications' },
    { href: '/me/pass', label: t('me.pass'), icon: 'pass' },
    { href: '/me/shifts', label: t('me.shifts'), icon: 'shifts' },
    { href: '/me/saved', label: t('me.saved'), icon: 'saved' },
    { href: '/me/marketplace', label: t('me.marketplace'), icon: 'marketplace', badge: openOffers || undefined },
    ...(candidate?.profession === 'PHYSICIAN' ? [{ href: '/me/training', label: t('me.training'), icon: 'training' as const }] : []),
    { href: '/me/recognition', label: t('me.recognition'), icon: 'recognition' },
    ...(ambassador + verified > 0 ? [{ href: '/me/team', label: t('me.team'), icon: 'team' as const }] : []),
    { href: '/me/settings', label: t('me.settings'), icon: 'settings' },
  ];
  const all = (await getMessages()) as Record<string, Record<string, unknown>>;
  const collapsed = (await cookies()).get('kardia_nav')?.value === '1';
  return (
    <NextIntlClientProvider messages={{ common: all.common, enums: all.enums, fields: all.fields, errors: all.errors, candidate: all.candidate }}>
      <AppShell
        items={items}
        title={s.user.name || s.user.email}
        initialCollapsed={collapsed}
        labels={{ collapse: t('collapse'), expand: t('expand'), more: t('more'), menu: t('menu') }}
      >
        {children}
      </AppShell>
    </NextIntlClientProvider>
  );
}
