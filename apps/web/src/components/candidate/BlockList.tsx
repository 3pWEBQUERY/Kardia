'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Button, Checkbox, Input, useToast } from '@kardia/ui';

import { saveBlocks } from '@/app/actions/candidate';
import { useActionMessage } from '@/lib/useActionError';

/** Sperrliste: gesperrte Institutionen (z. B. der aktuelle Arbeitgeber) sehen das Profil nicht. */
export function BlockList({ orgs, blocked }: { orgs: { id: string; name: string }[]; blocked: string[] }) {
  const t = useTranslations('candidate.marketplace');
  const c = useTranslations('common');
  const toast = useToast();
  const message = useActionMessage();
  const [q, setQ] = useState('');
  const [set, setSet] = useState(() => new Set(blocked));
  const filtered = useMemo(() => orgs.filter((o) => set.has(o.id) || (q.length >= 2 && o.name.toLowerCase().includes(q.toLowerCase()))), [orgs, q, set]);
  return (
    <div className="flex flex-col gap-3">
      <Input label={t('blockSearch')} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('blockPlaceholder')} />
      <div className="flex flex-col">
        {filtered.map((o) => (
          <Checkbox
            key={o.id}
            label={o.name}
            checked={set.has(o.id)}
            onCheckedChange={(on) =>
              setSet((p) => {
                const n = new Set(p);
                if (on) n.add(o.id);
                else n.delete(o.id);
                return n;
              })
            }
          />
        ))}
      </div>
      <div>
        <Button onClick={() => void saveBlocks([...set]).then((r) => toast(r.ok ? { tone: 'neutral', message: t('blocksSaved') } : { tone: 'critical', message: message(r) }))}>
          {c('actions.save')}
        </Button>
      </div>
    </div>
  );
}
