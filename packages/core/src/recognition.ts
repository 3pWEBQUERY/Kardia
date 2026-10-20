import { z } from 'zod';

import { Profession } from '@kardia/db/enums';

/**
 * Anerkennungs-Tracker (Modul H): redaktionell gepflegte Checklisten je Herkunfts-
 * abschluss und Zielberuf, mit Prüfdatum. Keine Rechtsberatung.
 */
export const recognitionStepSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(3).max(160),
  description: z.string().max(1200),
  documents: z.array(z.string().max(200)).max(20).default([]),
  links: z
    .array(z.object({ label: z.string().max(120), url: z.url() }))
    .max(10)
    .default([]),
  durationWeeks: z.number().min(0).max(104).nullable().default(null),
});

export const recognitionGuideSchema = z.object({
  originCountry: z.string().length(2).toUpperCase(),
  targetProfession: z.enum(Profession),
  authority: z.string().min(2).max(40),
  steps: z.array(recognitionStepSchema).min(1).max(30),
  reviewedAt: z.iso.date(),
});

export type RecognitionStep = z.infer<typeof recognitionStepSchema>;
export type RecognitionGuideInput = z.infer<typeof recognitionGuideSchema>;

/** Hinweis bei Inhalten, deren Prüfdatum älter als 12 Monate ist. */
export function guideNeedsReview(reviewedAt: Date, now = new Date()): boolean {
  return now.getTime() - reviewedAt.getTime() > 365 * 24 * 3600_000;
}
