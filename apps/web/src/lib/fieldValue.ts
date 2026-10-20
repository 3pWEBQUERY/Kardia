import { WARD_FIELDS, formatChf, formatNumber } from '@kardia/core';

type T = (key: string, values?: Record<string, string | number>) => string;

/** Anzeige eines Stationsprofil-Werts mit Einheit, Schweizer Formatierung (PRD 7.4). */
export function formatFieldValue(key: string, value: unknown, t: { fields: T; enums: T; common: T }): string {
  if (value == null || value === '') return t.common('states.notSpecified');
  const meta = WARD_FIELDS.find((f) => f.key === key);
  if (typeof value === 'boolean') return value ? t.common('states.yes') : t.common('states.no');
  const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : JSON.stringify(v));
  if (key === 'department') return t.enums(`Department.${str(value)}`);
  if (key === 'childcare') return t.enums(`ChildcareType.${str(value)}`);
  if (key === 'shiftTypes' && Array.isArray(value)) return (value as unknown[]).map((v) => t.enums(`ShiftType.${str(v)}`)).join(', ');
  if (typeof value === 'number') {
    switch (meta?.unit) {
      case 'chf':
        return formatChf(value);
      case 'chfHour':
        return `CHF ${formatNumber(value)}/h`;
      case 'chfDay':
        return `CHF ${formatNumber(value)}/Tag`;
      case 'chfMonth':
        return `CHF ${formatNumber(value)}/Mt.`;
      case 'pct':
        return `${formatNumber(value)} %`;
      case 'weeks':
        return `${formatNumber(value, Number.isInteger(value) ? 0 : 1)} ${t.fields('units.weeks')}`;
      case 'days':
        return `${formatNumber(value)} ${t.fields('units.days')}`;
      case 'ratio':
        return `1 : ${formatNumber(value, Number.isInteger(value) ? 0 : 1)}`;
      case 'count':
      case undefined:
      default:
        return formatNumber(value, Number.isInteger(value) ? 0 : 1);
    }
  }
  if (Array.isArray(value)) return (value as unknown[]).map(str).join(', ');
  return str(value);
}
