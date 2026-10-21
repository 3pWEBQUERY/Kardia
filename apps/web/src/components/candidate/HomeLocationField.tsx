'use client';

import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { homeLocationSchema, type HomeLocation } from '@kardia/core';
import { Button, Callout, Icon, Input } from '@kardia/ui';

/**
 * Wohnort für die Pendelzeit (Modul B, Flow 7.3 Schritt 3): Adresse oder PLZ/Ort über
 * die swisstopo-Suche in Koordinaten umwandeln. Gespeichert wird nur die Zellmitte
 * (~150 m), nie die Adresse.
 */
export function HomeLocationField({
  value,
  onChange,
  hideLegend = false,
}: {
  value: HomeLocation | null | undefined;
  onChange: (home: HomeLocation | null) => void;
  /** Titel und Hilfetext stehen bereits im umgebenden Formularabschnitt. */
  hideLegend?: boolean;
}) {
  const t = useTranslations('candidate.pass.home');
  const [street, setStreet] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocode = async () => {
    setError(null);
    if (!/^\d{4}$/.test(postalCode.trim()) && !city.trim()) {
      setError(t('needPlace'));
      return;
    }
    setBusy(true);
    const q = `${street} ${postalCode} ${city}`.trim();
    // Mit Strasse: Adresssuche; ohne: Mittelpunkt von PLZ bzw. Gemeinde.
    const origins = street.trim() ? 'address' : 'zipcode,gg25';
    try {
      const res = await fetch(
        `https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(q)}&type=locations&origins=${origins}&sr=4326&limit=1`,
      );
      const json = (await res.json()) as { results?: { attrs: { lat: number; lon: number } }[] };
      const hit = json.results?.[0]?.attrs;
      const parsed = hit ? homeLocationSchema.safeParse({ lat: hit.lat, lng: hit.lon }) : null;
      if (!parsed?.success) throw new Error('none');
      onChange(parsed.data);
      setStreet('');
    } catch {
      setError(t('notFound'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className={hideLegend ? 'sr-only' : 'mb-1 text-caption text-ink-700'}>{t('legend')}</legend>
      {hideLegend ? null : <p className="text-micro text-ink-500">{t('hint')}</p>}
      {value ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line-300 bg-surface-0 px-3 py-2">
          <span className="inline-flex items-center gap-2 text-body-s text-ink-900">
            <Icon icon={MapPin} size={16} />
            {t('saved')}
          </span>
          <Button size="s" variant="ghost" onClick={() => onChange(null)}>
            {t('remove')}
          </Button>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)]">
        <Input label={t('street')} value={street} onChange={(e) => setStreet(e.target.value)} autoComplete="street-address" />
        <Input label={t('postalCode')} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} inputMode="numeric" maxLength={4} autoComplete="postal-code" />
        <Input label={t('city')} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
      </div>
      <div>
        <Button size="s" onClick={() => void geocode()} disabled={busy}>
          <Icon icon={MapPin} size={16} />
          {value ? t('replace') : t('use')}
        </Button>
      </div>
      {error ? <Callout tone="critical">{error}</Callout> : null}
    </fieldset>
  );
}
