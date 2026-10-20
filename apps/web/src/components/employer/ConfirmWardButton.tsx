'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, useToast } from '@kardia/ui';

import { confirmWardProfile } from '@/app/actions/employer';
import { useActionMessage } from '@/lib/useActionError';

/** AK-A3: Stationsprofil ohne Änderung bestätigen. */
export function ConfirmWardButton({
  wardId,
  label,
  done,
}: {
  wardId: string;
  label: string;
  done: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const message = useActionMessage();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="s"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void confirmWardProfile(wardId).then((r) => {
          setBusy(false);
          toast(
            r.ok ? { tone: 'neutral', message: done } : { tone: 'critical', message: message(r) },
          );
          if (r.ok) router.refresh();
        });
      }}
    >
      {label}
    </Button>
  );
}
