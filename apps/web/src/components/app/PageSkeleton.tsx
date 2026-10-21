import { Skeleton } from '@kardia/ui';

/**
 * Ladezustand der App-Seiten in Endform (PRD 7.4): Seitenkopf mit Kennzahlen, danach
 * Listenzeilen. Kein Spinner; Bewegung respektiert prefers-reduced-motion (Skeleton).
 */
export function PageSkeleton({ label, rows = 5, stats = 3 }: { label: string; rows?: number; stats?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">{label}</span>
      <div className="overflow-hidden rounded-card border border-line-200 bg-surface-0">
        <div className="flex flex-col gap-3 px-5 py-6 md:px-8 md:py-7">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        {stats ? (
          <div className="grid grid-cols-2 border-t border-line-200 md:grid-cols-4">
            {Array.from({ length: stats }, (_, i) => (
              <div key={i} className="flex flex-col gap-2 px-5 py-4 md:px-8">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <ul className="flex flex-col gap-2" aria-hidden>
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center gap-4 rounded-card border border-line-200 bg-surface-0 px-4 py-3.5">
            <Skeleton className="size-10 shrink-0" />
            <span className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3 max-w-sm" />
              <Skeleton className="h-3 w-1/2 max-w-xs" />
            </span>
            <Skeleton className="hidden h-6 w-20 sm:block" />
          </li>
        ))}
      </ul>
    </div>
  );
}
