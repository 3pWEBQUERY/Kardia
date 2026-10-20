'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { switchOrg } from '@/app/actions/employer';

/** Wechsel zwischen Organisationen (z. B. Spitalgruppe mit mehreren Mandanten). */
export function OrgSwitcher({ current, options, label }: { current: string; options: { id: string; name: string }[]; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      aria-busy={pending}
      aria-label={label}
      defaultValue={current}
      onChange={(e) => start(async () => { await switchOrg(e.target.value); router.refresh(); })}
      className="h-control-s w-full rounded-control border border-line-300 bg-surface-0 px-2 text-body-s text-ink-900"
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </select>
  );
}
