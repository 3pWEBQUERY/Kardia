import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { can, type Permission } from '@kardia/core';

import { CockpitPalette, type PaletteEntry } from '@/components/employer/CockpitPalette';
import { OrgSwitcher } from '@/components/employer/OrgSwitcher';
import { AppShell, type NavItem } from '@/components/shell/AppShell';
import { db } from '@/server/db';
import { listMemberships } from '@/server/services/org';
import { requireOrg } from '@/server/session';

/** Arbeitgeber-Cockpit (PRD 6, 7.2): Seitenleiste, Organisationswechsel, Befehlspalette (Cmd/Ctrl + K). */
export default async function CockpitLayout({ children }: { children: ReactNode }) {
  const ctx = await requireOrg();
  const t = await getTranslations('common');
  const te = await getTranslations('employer.palette');
  const memberships = await listMemberships(ctx.user.id);
  const collapsed = (await cookies()).get('kardia_nav')?.value === '1';
  const newApps = await db.application.count({ where: { status: 'NEW', job: { ward: { location: { organizationId: ctx.org.id } } } } });

  // Nur Bereiche zeigen, die die Rolle öffnen darf.
  const allowed = (p?: Permission) => !p || can(ctx.role, p);
  const nav: (NavItem & { perm?: Permission })[] = [
    { href: '/employer', label: t('nav.employer.overview'), icon: 'overview' },
    { href: '/employer/jobs', label: t('nav.employer.jobs'), icon: 'jobs' },
    { href: '/employer/pipeline', label: t('nav.employer.pipeline'), icon: 'pipeline', badge: newApps || undefined, perm: 'applications.read' },
    { href: '/employer/wards', label: t('nav.employer.wards'), icon: 'wards' },
    { href: '/employer/marketplace', label: t('nav.employer.marketplace'), icon: 'marketplace', perm: 'marketplace.offer' },
    { href: '/employer/pool', label: t('nav.employer.pool'), icon: 'pool', perm: 'pool.manage' },
    { href: '/employer/benchmark', label: t('nav.employer.benchmark'), icon: 'benchmark' },
    { href: '/employer/team', label: t('nav.employer.team'), icon: 'users' },
    { href: '/employer/billing', label: t('nav.employer.billing'), icon: 'billing' },
  ];
  const items: NavItem[] = nav.filter((i) => allowed(i.perm)).map(({ href, label, icon, badge }) => ({ href, label, icon, badge }));

  // Befehlspalette: Stellen, Stationen, offene Bewerbungen und Aktionen.
  const [jobs, wards, apps] = await Promise.all([
    db.job.findMany({ where: { ward: { location: { organizationId: ctx.org.id } }, status: { not: 'CLOSED' } }, select: { id: true, title: true, status: true }, take: 100, orderBy: { updatedAt: 'desc' } }),
    db.ward.findMany({ where: { location: { organizationId: ctx.org.id } }, select: { id: true, name: true }, take: 100 }),
    db.application.findMany({
      where: { job: { ward: { location: { organizationId: ctx.org.id } } }, status: { notIn: ['WITHDRAWN', 'HIRED', 'REJECTED'] } },
      select: { id: true, candidate: { select: { firstName: true, lastName: true } }, job: { select: { title: true } } },
      take: 100,
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  const palette: PaletteEntry[] = [
    ...(allowed('jobs.edit') ? [{ id: 'a-new-job', group: te('actions'), label: te('newJob'), href: '/employer/jobs/new' }] : []),
    ...(allowed('wards.edit') ? [{ id: 'a-new-ward', group: te('actions'), label: te('newWard'), href: '/employer/wards/new' }] : []),
    { id: 'a-pipeline', group: te('actions'), label: te('openPipeline'), href: '/employer/pipeline' },
    ...(allowed('pool.manage') ? [{ id: 'a-pool', group: te('actions'), label: te('newShift'), href: '/employer/pool' }] : []),
    ...items.map((i) => ({ id: `n-${i.href}`, group: te('navigation'), label: i.label, href: i.href })),
    ...jobs.map((j) => ({ id: `j-${j.id}`, group: te('jobs'), label: j.title, hint: j.status, href: `/employer/jobs/${j.id}` })),
    ...wards.map((w) => ({ id: `w-${w.id}`, group: te('wards'), label: w.name, href: `/employer/wards/${w.id}` })),
    ...apps.map((a) => ({ id: `ap-${a.id}`, group: te('applications'), label: `${a.candidate.firstName} ${a.candidate.lastName.slice(0, 1)}. – ${a.job.title}`, href: `/employer/applications/${a.id}` })),
  ];

  const all = await getMessages();
  const messages = { common: all.common, enums: all.enums, fields: all.fields, errors: all.errors, employer: all.employer };

  return (
    <NextIntlClientProvider messages={messages}>
      <AppShell
        items={items}
        title={ctx.org.name}
        initialCollapsed={collapsed}
        labels={{ collapse: t('nav.collapse'), expand: t('nav.expand'), more: t('nav.more'), menu: t('nav.menu') }}
        top={
          <div className="flex flex-col gap-1">
            <span className="text-micro text-ink-500">{te('org')}</span>
            {memberships.length > 1 ? (
              <OrgSwitcher label={te('orgLabel')} current={ctx.org.id} options={memberships.map((m) => ({ id: m.organization.id, name: m.organization.name }))} />
            ) : (
              <span className="truncate text-body-s font-medium text-ink-900">{ctx.org.name}</span>
            )}
          </div>
        }
      >
        {children}
      </AppShell>
      <CockpitPalette entries={palette} />
    </NextIntlClientProvider>
  );
}
