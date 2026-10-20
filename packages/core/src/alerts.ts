import { z } from 'zod';

import { AlertFrequency } from '@kardia/db/enums';

import { searchFilterSchema } from './search.ts';

/** Gespeicherte Suchen mit Benachrichtigung per E-Mail oder Web Push. */
export const savedSearchInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  filters: searchFilterSchema,
  frequency: z.enum(AlertFrequency),
});

export type SavedSearchInput = z.infer<typeof savedSearchInputSchema>;

export function alertDue(
  frequency: AlertFrequency,
  lastSentAt: Date | null,
  now = new Date(),
): boolean {
  if (frequency === AlertFrequency.INSTANT) return true;
  if (!lastSentAt) return true;
  const hours = (now.getTime() - lastSentAt.getTime()) / 3600_000;
  return frequency === AlertFrequency.DAILY ? hours >= 23.5 : hours >= 24 * 7 - 0.5;
}

export const pushSubscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(10), auth: z.string().min(8) }),
});
