'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, Callout } from '@kardia/ui';

import { startPlanCheckout } from '@/app/actions/employer';
import { useActionMessage } from '@/lib/useActionError';

import type { PlanTier } from '@kardia/db/enums';

/** Abo per Stripe Checkout (Karte); leitet auf die Stripe-Seite weiter. */
export function PlanCheckoutButton({ plan, current, label }: { plan: PlanTier; current: boolean; label: string }) {
  const t = useTranslations('employer.billing');
  const message = useActionMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={current ? 'secondary' : 'primary'}
        disabled={busy || current}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const r = await startPlanCheckout(plan);
          if (r.ok) {
            window.location.assign(r.data.url);
            return;
          }
          setBusy(false);
          setError(message(r));
        }}
      >
        {current ? t('currentPlan') : label}
      </Button>
      {error ? <Callout tone="critical">{error}</Callout> : null}
    </div>
  );
}

export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="primary" onClick={() => window.print()} className="print:hidden">
      {label}
    </Button>
  );
}
