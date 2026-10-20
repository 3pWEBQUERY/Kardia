import { z } from 'zod';

import { PoolBookingMode, RosterCode } from '@kardia/db/enums';

/** Flex-Pool (Modul C, R2): Einzelschichten für den eigenen Springerpool. */

export const poolInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  bookingMode: z.enum(PoolBookingMode),
  cancelDeadlineHours: z
    .number()
    .int()
    .min(0)
    .max(14 * 24),
});

export const shiftInputSchema = z
  .object({
    poolId: z.string().min(10),
    wardId: z.string().min(10),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    code: z
      .enum(RosterCode)
      .refine((c) => c !== RosterCode.X, { message: 'Freier Tag ist keine Schicht' }),
    hourlyRateChf: z.number().int().min(20).max(300),
    requirements: z.string().trim().max(400).optional(),
  })
  .refine((s) => new Date(s.endsAt) > new Date(s.startsAt), {
    message: 'Ende nach Beginn',
    path: ['endsAt'],
  })
  .refine((s) => new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime() <= 16 * 3600_000, {
    message: 'Höchstens 16 Stunden',
    path: ['endsAt'],
  });

export type ShiftInput = z.infer<typeof shiftInputSchema>;

/** Absage durch die Fachperson nur bis X Stunden vorher (pro Pool), danach über den Arbeitgeber. */
export function canCandidateCancel(
  startsAt: Date,
  cancelDeadlineHours: number,
  now = new Date(),
): boolean {
  return startsAt.getTime() - now.getTime() >= cancelDeadlineHours * 3600_000;
}

export function shiftHours(startsAt: Date, endsAt: Date): number {
  return Math.round(((endsAt.getTime() - startsAt.getTime()) / 3600_000) * 100) / 100;
}

function icsDate(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function icsEscape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Kalender-Export (ICS, RFC 5545) für gebuchte Schichten. */
export function shiftsToIcs(
  shifts: readonly {
    id: string;
    startsAt: Date;
    endsAt: Date;
    title: string;
    location: string;
    description?: string;
  }[],
  now = new Date(),
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kardia//Flex-Pool//DE',
    'CALSCALE:GREGORIAN',
  ];
  for (const s of shifts) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:shift-${s.id}@kardia.ch`,
      `DTSTAMP:${icsDate(now)}`,
      `DTSTART:${icsDate(s.startsAt)}`,
      `DTEND:${icsDate(s.endsAt)}`,
      `SUMMARY:${icsEscape(s.title)}`,
      `LOCATION:${icsEscape(s.location)}`,
      ...(s.description ? [`DESCRIPTION:${icsEscape(s.description)}`] : []),
      'BEGIN:VALARM',
      'TRIGGER:-PT12H',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsEscape(s.title)}`,
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

/** CSV-Export (Flex-Pool-Verwaltung). Semikolon, wie in Schweizer Excel üblich. */
export function toCsv(rows: readonly Record<string, string | number | null>[]): string {
  const first = rows[0];
  if (!first) return '';
  const headers = Object.keys(first);
  const cell = (v: string | number | null) => {
    const s = v == null ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(';'),
    ...rows.map((r) => headers.map((h) => cell(r[h] ?? null)).join(';')),
  ].join('\n');
}
