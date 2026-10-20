import { z } from 'zod';

import {
  ApplicationStatus,
  RejectionReason,
  type ApplicationStatus as ApplicationStatusT,
} from '@kardia/db/enums';

/** Arbeitgeber-Pipeline: Neu → Gesichtet → Gespräch → Angebot → Angestellt | Abgesagt. */
export const PIPELINE_COLUMNS = [
  ApplicationStatus.NEW,
  ApplicationStatus.SCREENED,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
  ApplicationStatus.HIRED,
  ApplicationStatus.REJECTED,
] as const;

/** Tastatur: 1–6 setzt den Status (PRD 7.1). */
export const STATUS_HOTKEYS: Record<string, ApplicationStatusT> = Object.fromEntries(
  PIPELINE_COLUMNS.map((status, i) => [String(i + 1), status]),
);

const TERMINAL: readonly ApplicationStatusT[] = [
  ApplicationStatus.HIRED,
  ApplicationStatus.WITHDRAWN,
];

export function canTransition(from: ApplicationStatusT, to: ApplicationStatusT): boolean {
  if (from === to) return false;
  if (TERMINAL.includes(from)) return false;
  // Fachpersonen ziehen zurück; Arbeitgeber setzen nie WITHDRAWN.
  if (to === ApplicationStatus.WITHDRAWN) return false;
  return true;
}

export const statusChangeSchema = z
  .object({
    status: z.enum(PIPELINE_COLUMNS),
    rejectionReason: z.enum(RejectionReason).optional(),
  })
  .refine((v) => v.status !== ApplicationStatus.REJECTED || v.rejectionReason != null, {
    message: 'Absage braucht einen Grund aus der festen Liste',
    path: ['rejectionReason'],
  });

export type StatusChange = z.infer<typeof statusChangeSchema>;

export const APPLICATION_MESSAGE_MAX = 500;

export const applicationInputSchema = z.object({
  jobId: z.string().min(10),
  message: z.string().trim().max(APPLICATION_MESSAGE_MAX).optional(),
  /** AK-D1: Originaldokumente nur nach ausdrücklicher Freigabe pro Bewerbung. */
  shareDocuments: z.boolean().default(false),
});

export type ApplicationInput = z.infer<typeof applicationInputSchema>;

export const chatMessageSchema = z.object({ body: z.string().trim().min(1).max(4000) });

/** KPI "Antwortquote": Statusänderung innert 5 Arbeitstagen. */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return d;
}

export function businessDaysBetween(from: Date, to: Date): number {
  let days = 0;
  const d = new Date(from);
  while (d < to) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6 && d <= to) days++;
  }
  return days;
}
