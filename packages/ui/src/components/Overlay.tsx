'use client';

import { Dialog as DialogPrimitive, DropdownMenu as MenuPrimitive, Popover as PopoverPrimitive, Tabs as TabsPrimitive, Tooltip as TooltipPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cx } from './cx.ts';
import { Icon } from './Icon.tsx';

/** Elevation = surface-0 + 1 px Rand line-300 + bei Dialogen Abdeckung overlay (PRD 8.1). */
const ELEVATED = 'border border-line-300 bg-surface-0';

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  trigger,
  closeLabel = 'Schliessen',
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  trigger?: ReactNode;
  closeLabel?: string;
}) {
  return (
    <DialogPrimitive.Root {...(open !== undefined ? { open } : {})} {...(onOpenChange ? { onOpenChange } : {})}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <DialogPrimitive.Content
          className={cx(
            ELEVATED,
            'fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-card',
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line-200 px-5 py-4">
            <div className="flex flex-col gap-1">
              <DialogPrimitive.Title className="text-h3 text-ink-900">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-body-s text-ink-700">{description}</DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label={closeLabel}
              className="inline-flex size-touch shrink-0 items-center justify-center rounded-control text-ink-700 hover:bg-surface-100"
            >
              <Icon icon={X} />
            </DialogPrimitive.Close>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="flex justify-end gap-2 border-t border-line-200 px-5 py-3">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Sheet von rechts (Desktop) bzw. unten (Mobile). */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  trigger,
  closeLabel = 'Schliessen',
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  trigger?: ReactNode;
  closeLabel?: string;
}) {
  return (
    <DialogPrimitive.Root {...(open !== undefined ? { open } : {})} {...(onOpenChange ? { onOpenChange } : {})}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <DialogPrimitive.Content
          className={cx(
            ELEVATED,
            'fixed z-50 flex flex-col',
            'inset-x-0 bottom-0 max-h-[90vh] rounded-t-card',
            'md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[480px] md:rounded-none md:border-y-0 md:border-r-0',
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line-200 px-5 py-4">
            <div className="flex flex-col gap-1">
              <DialogPrimitive.Title className="text-h3 text-ink-900">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-body-s text-ink-700">{description}</DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label={closeLabel}
              className="inline-flex size-touch shrink-0 items-center justify-center rounded-control text-ink-700 hover:bg-surface-100"
            >
              <Icon icon={X} />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="flex justify-end gap-2 border-t border-line-200 px-5 py-3">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Popover({ trigger, children, align = 'start' }: { trigger: ReactNode; children: ReactNode; align?: 'start' | 'center' | 'end' }) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content align={align} sideOffset={6} className={cx(ELEVATED, 'z-50 w-72 rounded-card p-4')}>
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export function Menu({
  trigger,
  items,
  label,
}: {
  trigger: ReactNode;
  label?: string;
  items: { key: string; label: ReactNode; onSelect: () => void; danger?: boolean; disabled?: boolean }[];
}) {
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger asChild>{trigger}</MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          align="end"
          sideOffset={6}
          aria-label={label}
          className={cx(ELEVATED, 'z-50 min-w-48 rounded-card py-1')}
        >
          {items.map((item) => (
            <MenuPrimitive.Item
              key={item.key}
              {...(item.disabled ? { disabled: true } : {})}
              onSelect={item.onSelect}
              className={cx(
                'flex h-row cursor-default items-center px-3 text-body-s outline-none data-[highlighted]:bg-surface-100 data-[disabled]:opacity-50',
                item.danger ? 'text-critical-600' : 'text-ink-900',
              )}
            >
              {item.label}
            </MenuPrimitive.Item>
          ))}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content sideOffset={6} className={cx(ELEVATED, 'z-50 max-w-64 rounded-control px-2.5 py-1.5 text-micro text-ink-900')}>
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

/** Reiter: aktiver Reiter mit 2 px Linie (einzige 2-px-Verwendung neben Fokus). */
export function Tabs({
  tabs,
  value,
  onValueChange,
  defaultValue,
  label,
}: {
  tabs: { value: string; label: ReactNode; content: ReactNode }[];
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  label: string;
}) {
  return (
    <TabsPrimitive.Root
      {...(value !== undefined ? { value } : {})}
      {...(onValueChange ? { onValueChange } : {})}
      defaultValue={defaultValue ?? tabs[0]?.value}
    >
      <TabsPrimitive.List aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line-200">
        {tabs.map((t) => (
          <TabsPrimitive.Trigger
            key={t.value}
            value={t.value}
            className="-mb-px h-control-m border-b-2 border-transparent px-3 text-body-s whitespace-nowrap text-ink-700 hover:text-ink-900 data-[state=active]:border-accent-600 data-[state=active]:text-ink-900"
          >
            {t.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((t) => (
        <TabsPrimitive.Content key={t.value} value={t.value} className="pt-4">
          {t.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
