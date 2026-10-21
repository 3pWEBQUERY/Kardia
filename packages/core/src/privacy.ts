/** Aufbewahrung (PRD 14.1) – zentral, damit Worker und Datenschutzerklärung übereinstimmen. */
export const RETENTION = {
  /** Bewerbung inkl. Nachrichten: 6 Monate nach Abschluss der Stelle. */
  applicationMonthsAfterClose: 6,
  /** Inaktives Fachpersonen-Konto: nach 24 Monaten, Ankündigung 30 Tage vorher. */
  inactiveAccountMonths: 24,
  inactiveAccountNoticeDays: 30,
  /** KI-Rohtexte (AiRun.rawInput / rawOutput). */
  aiRawDays: 30,
  /** Audit-Log: Admin-Aktionen 10 Jahre, sonst 2 Jahre. */
  auditAdminYears: 10,
  auditOtherYears: 2,
  /** Backups rollierend. */
  backupDays: 30,
} as const;

/**
 * Version von AGB und Datenschutzerklärung (PRD 14.3). Bei einer neuen Version
 * erneut zustimmen lassen; gespeichert in User.termsVersion.
 */
export const TERMS_VERSION = '2026-10';

/** Sitzungsdauer (PRD 14.2): 30 Tage, Admin 12 h. */
export const SESSION_MAX_AGE_SEC = 30 * 24 * 3600;
export const ADMIN_SESSION_MAX_AGE_SEC = 12 * 3600;

export function monthsAgo(months: number, now = new Date()): Date {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

export function daysAgo(days: number, now = new Date()): Date {
  return new Date(now.getTime() - days * 24 * 3600_000);
}
