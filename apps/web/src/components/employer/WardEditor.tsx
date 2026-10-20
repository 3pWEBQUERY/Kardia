'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { LocationInput } from '@kardia/core';
import { Button, Callout, Select, Sheet, useToast } from '@kardia/ui';

import { saveWard } from '@/app/actions/employer';
import { useActionMessage } from '@/lib/useActionError';

import { LocationForm } from './LocationForm.tsx';
import { WardForm, type Evidence, type WardDraft } from './WardForm.tsx';

/** Station anlegen oder bearbeiten, mit Standortwahl. Speichern gilt als Bestätigung (AK-A2). */
export function WardEditor({
  wardId,
  locationId,
  locations,
  initial,
  evidence,
  onSaved,
  submitLabel,
}: {
  wardId?: string;
  locationId?: string;
  locations: { id: string; name: string; city: string }[];
  initial: WardDraft;
  evidence?: Partial<Record<string, Evidence>>;
  onSaved?: (id: string) => void;
  submitLabel?: string;
}) {
  const t = useTranslations('employer.ward');
  const router = useRouter();
  const toast = useToast();
  const message = useActionMessage();
  const [loc, setLoc] = useState(locationId ?? locations[0]?.id ?? '');
  const [newLoc, setNewLoc] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const submit = async (draft: WardDraft) => {
    if (!loc) {
      setError(t('needLocation'));
      return;
    }
    setBusy(true);
    setError(null);
    const r = await saveWard({ ...(wardId ? { id: wardId } : {}), locationId: loc, profile: draft });
    setBusy(false);
    if (!r.ok) {
      setServerErrors(r.error.fields ?? {});
      setError(message(r));
      return;
    }
    toast({ tone: 'neutral', message: t('saved') });
    if (onSaved) onSaved(r.data.id);
    else if (!wardId) router.push(`/employer/wards/${r.data.id}`);
    else router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      {!wardId ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <Select
              label={t('location')}
              required
              placeholder={t('chooseLocation')}
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              options={locations.map((l) => ({ value: l.id, label: `${l.name}, ${l.city}` }))}
            />
          </div>
          <Sheet
            open={newLoc}
            onOpenChange={setNewLoc}
            title={t('newLocation')}
            trigger={<Button>{t('newLocation')}</Button>}
          >
            <LocationForm
              onSaved={(id) => {
                setNewLoc(false);
                setLoc(id);
                router.refresh();
              }}
            />
          </Sheet>
        </div>
      ) : null}
      {error ? <Callout tone="critical">{error}</Callout> : null}
      <WardForm initial={initial} evidence={evidence ?? {}} serverErrors={serverErrors} busy={busy} submitLabel={submitLabel ?? t('save')} onSubmit={(d) => void submit(d)} />
    </div>
  );
}

export function LocationSheet({ label, initial }: { label: string; initial?: LocationInput & { id: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen} title={label} trigger={<Button size="s">{label}</Button>}>
      <LocationForm
        initial={initial}
        onSaved={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </Sheet>
  );
}
