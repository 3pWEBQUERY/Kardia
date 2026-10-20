'use client';

import { Command } from 'cmdk';
import { Dialog as DialogPrimitive, VisuallyHidden } from 'radix-ui';
import { useEffect, useState, type ReactNode } from 'react';

export interface CommandItem {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords?: string[];
  icon?: ReactNode;
  onRun: () => void;
}

/**
 * Befehlspalette (Cmd/Ctrl + K, PRD 7.1): Stelle, Bewerbung, Station oder Aktion per
 * Tastatur finden und ausführen. `onQuery` erlaubt serverseitige Suche.
 */
export function CommandPalette({
  items,
  onQuery,
  title = 'Befehlspalette',
  placeholder = 'Stelle, Bewerbung, Station oder Aktion suchen …',
  emptyLabel = 'Nichts gefunden. Anderen Suchbegriff versuchen.',
}: {
  items: CommandItem[];
  onQuery?: (query: string) => void;
  title?: string;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const groups = [...new Set(items.map((i) => i.group))];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <DialogPrimitive.Content className="fixed top-[15vh] left-1/2 z-50 w-[min(640px,calc(100vw-32px))] -translate-x-1/2 rounded-card border border-line-300 bg-surface-0">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <Command label={title} className="flex flex-col">
            <Command.Input
              autoFocus
              placeholder={placeholder}
              {...(onQuery ? { onValueChange: onQuery } : {})}
              className="h-control-l border-b border-line-200 bg-transparent px-4 text-body text-ink-900 outline-none placeholder:text-ink-500"
            />
            <Command.List className="max-h-[50vh] overflow-y-auto p-1">
              <Command.Empty className="px-3 py-4 text-body-s text-ink-700">{emptyLabel}</Command.Empty>
              {groups.map((g) => (
                <Command.Group
                  key={g}
                  heading={g}
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-micro [&_[cmdk-group-heading]]:text-ink-500"
                >
                  {items
                    .filter((i) => i.group === g)
                    .map((i) => (
                      <Command.Item
                        key={i.id}
                        value={`${i.label} ${i.id}`}
                        keywords={i.keywords ?? []}
                        onSelect={() => {
                          setOpen(false);
                          i.onRun();
                        }}
                        className="flex h-row cursor-default items-center gap-3 rounded-control px-3 text-body-s text-ink-900 data-[selected=true]:bg-surface-100"
                      >
                        {i.icon}
                        <span className="flex-1 truncate">{i.label}</span>
                        {i.hint ? <span className="text-micro text-ink-500">{i.hint}</span> : null}
                      </Command.Item>
                    ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
