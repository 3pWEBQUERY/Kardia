import { describe, expect, it } from 'vitest';

import { formatFieldValue } from '../../src/lib/fieldValue.ts';

const t = (key: string) => key;
const tt = { fields: t, enums: t, common: t };

describe('Anzeige von Profilwerten (Schweizer Formatierung)', () => {
  it('formatiert Beträge, Einheiten und Enums', () => {
    expect(formatFieldValue('salaryMinChf', 95000, tt)).toBe("CHF 95'000");
    expect(formatFieldValue('nightAllowanceChfHour', 8, tt)).toBe('CHF 8/h');
    expect(formatFieldValue('rosterLeadWeeks', 6, tt)).toBe('6 units.weeks');
    expect(formatFieldValue('patientsPerNurseDay', 2.5, tt)).toBe('1 : 2.5');
    expect(formatFieldValue('department', 'ICU', tt)).toBe('Department.ICU');
    expect(formatFieldValue('shiftTypes', ['EARLY', 'NIGHT'], tt)).toBe('ShiftType.EARLY, ShiftType.NIGHT');
    expect(formatFieldValue('thirteenthSalary', true, tt)).toBe('states.yes');
    expect(formatFieldValue('educationDays', null, tt)).toBe('states.notSpecified');
  });
});
