'use client';

import { Ellipsis, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { Icon, Sheet, cx } from '@kardia/ui';

import { KardiaLogo, KardiaMark } from '@/components/brand/KardiaLogo';

import { NAV_ICONS, type NavIcon } from './icons.ts';

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  badge?: number | undefined;
}

const COLLAPSE_COOKIE = 'kardia_nav';

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/me' && href !== '/employer' && href !== '/admin' && pathname.startsWith(`${href}/`));
}

/**
 * App-Navigation (PRD 7.2): Desktop linke Seitenleiste 240 px, einklappbar auf 64 px;
 * Mobile untere Leiste mit max. 4 Einträgen + "Mehr".
 */
export function AppShell({
  items,
  title,
  initialCollapsed,
  labels,
  top,
  children,
}: {
  items: NavItem[];
  title: ReactNode;
  initialCollapsed: boolean;
  labels: { collapse: string; expand: string; more: string; menu: string };
  top?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = items.slice(0, 4);
  const rest = items.slice(4);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${COLLAPSE_COOKIE}=${next ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`;
  };

  const initial = typeof title === 'string' && title.trim() ? title.trim().charAt(0).toUpperCase() : null;

  return (
    <div className="flex min-h-dvh bg-surface-50">
      <aside
        className={cx(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line-200 bg-surface-0 transition-[width] duration-base ease-kardia md:flex print:hidden',
          collapsed ? 'w-sidebar-collapsed' : 'w-sidebar',
        )}
      >
        <div className={cx('flex h-16 items-center border-b border-line-200', collapsed ? 'justify-center' : 'px-4')}>
          <Link href="/" aria-label="Kardia" className="rounded-control">
            {collapsed ? <KardiaMark className="size-8" /> : <KardiaLogo />}
          </Link>
        </div>
        {!collapsed && top ? <div className="border-b border-line-200 px-4 py-3">{top}</div> : null}
        <nav aria-label={labels.menu} className="flex-1 overflow-y-auto p-2">
          {!collapsed ? <p className="px-3 pt-2 pb-2 text-micro font-semibold tracking-wider text-ink-500 uppercase">{labels.menu}</p> : null}
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cx(
                      'relative flex h-10 items-center gap-3 rounded-control text-body-s transition-colors',
                      collapsed ? 'justify-center' : 'px-3',
                      active
                        ? 'bg-accent-50 font-semibold text-accent-700 before:absolute before:top-2 before:bottom-2 before:-left-2 before:w-[3px] before:rounded-chip before:bg-accent-600'
                        : 'text-ink-700 hover:bg-surface-100 hover:text-ink-900',
                    )}
                  >
                    <Icon icon={NAV_ICONS[item.icon]} label={collapsed ? item.label : undefined} />
                    {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
                    {item.badge ? (
                      <span
                        className={cx(
                          'inline-flex min-w-5 items-center justify-center rounded-chip bg-pulse-500 px-1.5 text-micro font-semibold text-brand-950 tabular',
                          collapsed && 'absolute top-1 right-1 min-w-4 px-1',
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className={cx('flex items-center gap-2 border-t border-line-200 p-2', collapsed ? 'flex-col' : '')}>
          {initial ? (
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-950 text-body-s font-semibold text-brand-100" aria-hidden>
              {initial}
            </span>
          ) : null}
          {!collapsed ? <span className="min-w-0 flex-1 truncate text-body-s font-medium text-ink-900">{title}</span> : null}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? labels.expand : labels.collapse}
            className="inline-flex size-touch shrink-0 items-center justify-center rounded-control text-ink-700 hover:bg-surface-100"
          >
            <Icon icon={collapsed ? PanelLeftOpen : PanelLeftClose} />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-line-200 bg-surface-0 px-4 md:hidden print:hidden">
          <Link href="/" aria-label="Kardia" className="rounded-control">
            <KardiaLogo />
          </Link>
          <span className="truncate text-caption text-ink-700">{title}</span>
        </header>
        <main id="main" className="mx-auto w-full max-w-content flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-12 print:p-0">
          {children}
        </main>
      </div>

      <nav aria-label={labels.menu} className="fixed inset-x-0 bottom-0 z-30 print:hidden border-t border-line-200 bg-surface-0 pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-5">
          {primary.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'relative flex h-14 flex-col items-center justify-center gap-0.5 text-micro',
                    active ? 'font-semibold text-accent-600 before:absolute before:top-0 before:inset-x-4 before:h-[3px] before:rounded-chip before:bg-accent-600' : 'text-ink-700',
                  )}
                >
                  <Icon icon={NAV_ICONS[item.icon]} />
                  <span className="max-w-full truncate px-1">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <Sheet
              open={moreOpen}
              onOpenChange={setMoreOpen}
              title={labels.more}
              trigger={
                <button type="button" className="flex h-14 w-full flex-col items-center justify-center gap-0.5 text-micro text-ink-700">
                  <Icon icon={Ellipsis} />
                  {labels.more}
                </button>
              }
            >
              <ul className="flex flex-col">
                {rest.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} onClick={() => setMoreOpen(false)} className="flex h-row items-center gap-3 border-b border-line-200 text-body-s">
                      <Icon icon={NAV_ICONS[item.icon]} />
                      {item.label}
                    </Link>
                  </li>
                ))}
                {top ? <li className="pt-4">{top}</li> : null}
              </ul>
            </Sheet>
          </li>
        </ul>
      </nav>
    </div>
  );
}
