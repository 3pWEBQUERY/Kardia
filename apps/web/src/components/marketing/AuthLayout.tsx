import { Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Icon } from '@kardia/ui';

import { AlpinePulse } from '@/components/brand/Artwork';
import { KardiaLogo } from '@/components/brand/KardiaLogo';

import type { ReactNode } from 'react';

/** Anmelde- und Einladungsseiten: links Markenpanel mit Grafik, rechts das Formular. */
export async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('auth');
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative isolate hidden overflow-hidden bg-brand-950 lg:flex lg:flex-col">
        <div className="absolute inset-x-0 bottom-0 -z-10 h-3/5">
          <AlpinePulse className="size-full" dots={false} />
        </div>
        <div className="flex flex-col gap-8 p-12 xl:p-16">
          <KardiaLogo inverse />
          <p className="max-w-md text-display-l text-brand-100">{t('panelTitle')}</p>
          <p className="max-w-md text-body text-brand-300">{t('panelBody')}</p>
          <ul className="flex max-w-md flex-col gap-3">
            {(['direct', 'pass', 'privacy'] as const).map((k) => (
              <li key={k} className="flex items-center gap-3 text-body-s text-brand-100">
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-pulse-500 text-brand-950">
                  <Icon icon={Check} size={14} />
                </span>
                {t(`panelPoints.${k}`)}
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <div className="flex justify-center bg-surface-50 px-4 py-12 md:px-8 lg:items-center lg:py-16">
        <div className="flex w-full max-w-md flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}
