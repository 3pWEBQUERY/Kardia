'use client';

import { Toast as ToastPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { cx } from './cx.ts';
import { Icon } from './Icon.tsx';

interface ToastItem {
  id: number;
  message: ReactNode;
  tone: 'neutral' | 'critical';
  /** "Rückgängig" nur bei umkehrbaren Aktionen (PRD 8.5). */
  undo?: { label: string; onUndo: () => void };
}

type ShowToast = (toast: Omit<ToastItem, 'id'>) => void;

const ToastContext = createContext<ShowToast | null>(null);

export function useToast(): ShowToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast ausserhalb von <ToastProvider>');
  return ctx;
}

/** Toast unten links, 6 s, mit Rückgängig bei umkehrbaren Aktionen. */
export function ToastProvider({ children, closeLabel = 'Schliessen', regionLabel = 'Benachrichtigungen' }: { children: ReactNode; closeLabel?: string; regionLabel?: string }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = useCallback<ShowToast>((toast) => {
    setItems((prev) => [...prev.slice(-2), { ...toast, id: Date.now() + Math.random() }]);
  }, []);
  const value = useMemo(() => show, [show]);
  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider duration={6000} swipeDirection="left" label={regionLabel}>
        {children}
        {items.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            onOpenChange={(open) => {
              if (!open) setItems((prev) => prev.filter((i) => i.id !== t.id));
            }}
            className={cx(
              'flex items-center gap-3 rounded-card border bg-surface-0 py-2 pr-2 pl-4',
              t.tone === 'critical' ? 'border-critical-600' : 'border-line-300',
            )}
          >
            <ToastPrimitive.Description className="flex-1 text-body-s text-ink-900">{t.message}</ToastPrimitive.Description>
            {t.undo ? (
              <ToastPrimitive.Action altText={t.undo.label} asChild>
                <button
                  type="button"
                  onClick={t.undo.onUndo}
                  className="h-control-s rounded-control px-3 text-body-s font-medium text-accent-600 hover:bg-surface-100"
                >
                  {t.undo.label}
                </button>
              </ToastPrimitive.Action>
            ) : null}
            <ToastPrimitive.Close aria-label={closeLabel} className="inline-flex size-touch items-center justify-center rounded-control text-ink-500 hover:bg-surface-100">
              <Icon icon={X} size={16} />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 left-4 z-50 flex w-[min(400px,calc(100vw-32px))] flex-col gap-2 outline-none max-md:bottom-20" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
