'use client';

import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { CANTONS, locationInputSchema, type LocationInput } from '@kardia/core';
import { Button, Callout, Checkbox, Icon, Input, Select } from '@kardia/ui';

import { saveLocation } from '@/app/actions/employer';
import { useActionMessage } from '@/lib/useActionError';

type Draft = Omit<LocationInput, 'lat' | 'lng' | 'canton'> & {
  lat: string;
  lng: string;
  canton: string;
};

/**
 * Arbeitsort (Pflicht, Modul A): Adresse, Koordinaten, Parkplatz. Koordinaten aus der
 * Adresse über die swisstopo-Suche; ohne Adresse ist kein Inserat möglich (Modul C).
 */
export type LocationPrefill = Partial<Pick<LocationInput, 'street' | 'postalCode' | 'city' | 'hasParking'>>;

export function LocationForm({
  initial,
  prefill,
  onSaved,
}: {
  initial?: (LocationInput & { id: string }) | undefined;
  /** Vorschlag aus dem KI-Import; Koordinaten kommen weiterhin aus der Adresssuche. */
  prefill?: LocationPrefill | undefined;
  onSaved: (id: string) => void;
}) {
  const t = useTranslations('employer.location');
  const tc = useTranslations('employer.form');
  const message = useActionMessage();
  const [d, setD] = useState<Draft>(() => ({
    name: initial?.name ?? '',
    street: initial?.street ?? prefill?.street ?? '',
    postalCode: initial?.postalCode ?? prefill?.postalCode ?? '',
    city: initial?.city ?? prefill?.city ?? '',
    canton: initial?.canton ?? 'ZH',
    lat: initial ? String(initial.lat) : '',
    lng: initial ? String(initial.lng) : '',
    hasParking: initial?.hasParking ?? prefill?.hasParking ?? false,
  }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const geocode = async () => {
    setError(null);
    const q = `${d.street} ${d.postalCode} ${d.city}`.trim();
    try {
      const res = await fetch(
        `https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(q)}&type=locations&origins=address&sr=4326&limit=1`,
      );
      const json = (await res.json()) as { results?: { attrs: { lat: number; lon: number } }[] };
      const hit = json.results?.[0]?.attrs;
      if (!hit) throw new Error('none');
      setD((x) => ({ ...x, lat: hit.lat.toFixed(6), lng: hit.lon.toFixed(6) }));
    } catch {
      setError(t('geocodeFailed'));
    }
  };

  const save = async () => {
    setError(null);
    const input = { ...d, lat: Number(d.lat), lng: Number(d.lng) };
    const parsed = locationInputSchema.safeParse(input);
    if (!parsed.success) {
      setError(t('invalid'));
      return;
    }
    setBusy(true);
    const r = await saveLocation({ ...parsed.data, ...(initial ? { id: initial.id } : {}) });
    setBusy(false);
    if (!r.ok) setError(message(r));
    else onSaved(r.data.id);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t('name')}
          required
          requiredLabel={tc('required')}
          value={d.name}
          onChange={(e) => setD({ ...d, name: e.target.value })}
        />
        <Input
          label={t('street')}
          required
          requiredLabel={tc('required')}
          value={d.street}
          onChange={(e) => setD({ ...d, street: e.target.value })}
        />
        <Input
          label={t('postalCode')}
          required
          requiredLabel={tc('required')}
          inputMode="numeric"
          maxLength={4}
          value={d.postalCode}
          onChange={(e) => setD({ ...d, postalCode: e.target.value })}
        />
        <Input
          label={t('city')}
          required
          requiredLabel={tc('required')}
          value={d.city}
          onChange={(e) => setD({ ...d, city: e.target.value })}
        />
        <Select
          label={t('canton')}
          value={d.canton}
          onChange={(e) => setD({ ...d, canton: e.target.value })}
          options={CANTONS.map((c) => ({ value: c, label: c }))}
        />
        <div className="flex items-end">
          <Checkbox
            label={t('parking')}
            checked={d.hasParking}
            onCheckedChange={(on) => setD({ ...d, hasParking: on })}
          />
        </div>
        <Input
          label={t('lat')}
          inputMode="decimal"
          value={d.lat}
          onChange={(e) => setD({ ...d, lat: e.target.value })}
        />
        <Input
          label={t('lng')}
          inputMode="decimal"
          value={d.lng}
          onChange={(e) => setD({ ...d, lng: e.target.value })}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void geocode()}>
          <Icon icon={MapPin} size={16} />
          {t('geocode')}
        </Button>
        <Button variant="primary" onClick={() => void save()} disabled={busy}>
          {t('save')}
        </Button>
      </div>
      {error ? <Callout tone="critical">{error}</Callout> : null}
    </div>
  );
}
