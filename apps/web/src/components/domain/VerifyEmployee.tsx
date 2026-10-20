'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button, Callout } from '@kardia/ui';

import { verifyEmployee } from '@/app/actions/candidate';
import { useActionMessage } from '@/lib/useActionError';

export function VerifyEmployee({ wardId }: { wardId: string }) {
  const t = useTranslations('common.team');
  const router = useRouter();
  const message = useActionMessage();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-s text-ink-700">{t('verifyDomain')}</p>
      <Button
        variant="primary"
        onClick={() =>
          void verifyEmployee(wardId).then((r) => {
            if (!r.ok) setError(message(r));
            else router.refresh();
          })
        }
      >
        {t('verifyAction')}
      </Button>
      {error ? <Callout tone="critical">{error}</Callout> : null}
    </div>
  );
}
