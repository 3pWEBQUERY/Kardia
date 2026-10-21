'use client';

import { ArrowUpRight, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Icon, Sheet, cx } from '@kardia/ui';

export interface NavItem {
  href: string;
  label: string;
}

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Hauptnavigation der öffentlichen Seiten; markiert die aktuelle Seite (aria-current). */
export function PublicNav({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="hidden flex-1 items-center gap-1 md:flex">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'relative rounded-control px-3 py-2 text-body-s font-medium transition-colors',
              active ? 'text-ink-900' : 'text-ink-700 hover:bg-surface-100 hover:text-ink-900',
            )}
          >
            {item.label}
            {active ? <span aria-hidden className="absolute inset-x-3 -bottom-[13px] h-0.5 bg-pulse-500" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Menü für kleine Bildschirme: alle Ziele der oberen Leiste plus Arbeitgeber-CTA. */
export function MobileMenu({
  items,
  label,
  closeLabel,
  cta,
}: {
  items: NavItem[];
  label: string;
  closeLabel: string;
  cta: NavItem;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title={label}
      closeLabel={closeLabel}
      trigger={
        <button
          type="button"
          aria-label={label}
          className="inline-flex size-touch items-center justify-center rounded-control border border-line-300 text-ink-900 hover:bg-surface-100 md:hidden"
        >
          <Icon icon={Menu} />
        </button>
      }
    >
      <nav aria-label={label} className="flex flex-col">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'flex min-h-touch items-center justify-between border-b border-line-200 py-3 text-h3',
                active ? 'text-accent-600' : 'text-ink-900',
              )}
            >
              {item.label}
              {active ? <span aria-hidden className="size-2 rounded-full bg-pulse-500" /> : null}
            </Link>
          );
        })}
        <Link
          href={cta.href}
          onClick={() => setOpen(false)}
          className="mt-6 inline-flex h-control-l items-center justify-center gap-2 rounded-control bg-brand-950 px-5 text-body font-semibold text-brand-100"
        >
          {cta.label}
          <Icon icon={ArrowUpRight} size={18} className="text-pulse-500" />
        </Link>
      </nav>
    </Sheet>
  );
}
