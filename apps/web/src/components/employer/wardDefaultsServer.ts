import 'server-only';

import { getTranslations } from 'next-intl/server';

import { OVERRIDABLE_FIELDS } from '@kardia/core';

import { formatFieldValue } from '@/lib/fieldValue';

/** Stationswerte als lesbare Platzhalter für die Überschreibungen einer Stelle. */
export async function wardDefaultsFor(wards: Record<string, unknown>[]): Promise<Record<string, Partial<Record<string, string>>>> {
  const [tf, te, tc] = await Promise.all([getTranslations('fields'), getTranslations('enums'), getTranslations('common')]);
  return Object.fromEntries(
    wards.map((w) => [
      String(w.id),
      Object.fromEntries(OVERRIDABLE_FIELDS.map((k) => [k, formatFieldValue(k, w[k], { fields: tf, enums: te, common: tc })])),
    ]),
  );
}
