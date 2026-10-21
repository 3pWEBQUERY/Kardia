import { Baby, Banknote, CalendarClock, FileSignature, Gauge, GraduationCap, HeartHandshake, MapPin, RotateCcw, type LucideIcon } from 'lucide-react';

import { Icon, cx } from '@kardia/ui';

import type { ReactNode } from 'react';

/** Icons der Profilgruppen – gleiche Zuordnung wie in der öffentlichen Stationsansicht. */
export const FIELD_GROUP_ICONS: Record<string, LucideIcon> = {
  pay: Banknote,
  shifts: CalendarClock,
  workload: Gauge,
  care: HeartHandshake,
  development: GraduationCap,
  family: Baby,
  contract: FileSignature,
  reentry: RotateCcw,
  location: MapPin,
};

/** Formularabschnitt als Karte: Icon, Titel, Hilfetext, Inhalt. */
export function FormSection({
  title,
  description,
  icon,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon | undefined;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx('flex flex-col gap-5 rounded-card border border-line-200 bg-surface-0 p-5 md:p-6', className)}>
      {title ? (
        <header className="flex items-start gap-3">
          {icon ? (
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-control bg-accent-50 text-accent-700">
              <Icon icon={icon} size={18} />
            </span>
          ) : null}
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-h3 text-ink-900">{title}</h2>
            {description ? <p className="text-micro text-ink-500">{description}</p> : null}
          </div>
        </header>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Speicherleiste langer Formulare: klebt am unteren Rand (auf Mobile über der unteren
 * Navigation), flach mit Rahmen – keine Schatten.
 */
export function FormSaveBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-3 rounded-card border border-line-300 bg-surface-0 px-4 py-3 md:bottom-4">
      {children}
    </div>
  );
}
