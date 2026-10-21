'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, Callout } from '@kardia/ui';

import { openBillingPortal, startPlanCheckout } from '@/app/actions/employer';
import { useActionMessage } from '@/lib/useActionError';

import type { PlanTier } from '@kardia/db/enums';

/** Abo per Stripe Checkout (Karte); leitet auf die Stripe-Seite weiter. */
export function PlanCheckoutButton({
  plan,
  current,
  label,
  disabled = false,
}: {
  plan: PlanTier;
  current: boolean;
  label: string;
  /** Ohne STRIPE_SECRET_KEY: Kartenzahlung nicht verfügbar. */
  disabled?: boolean;
}) {
  const t = useTranslations('employer.billing');
  const message = useActionMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={current ? 'secondary' : 'primary'}
        disabled={busy || current || disabled}
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

/** Stripe-Kundenportal: Zahlungsmittel, Planwechsel, Kündigung. */
export function BillingPortalButton({ label }: { label: string }) {
  const message = useActionMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const r = await openBillingPortal();
          if (r.ok) {
            window.location.assign(r.data.url);
            return;
          }
          setBusy(false);
          setError(message(r));
        }}
      >
        {label}
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
