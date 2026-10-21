import {
  Activity,
  Armchair,
  Baby,
  Brain,
  Building2,
  FlaskConical,
  HeartPulse,
  House,
  Milk,
  Ribbon,
  ScanLine,
  Scissors,
  Siren,
  Stethoscope,
  Syringe,
  BedDouble,
  Footprints,
  type LucideIcon,
} from 'lucide-react';

import type { Department } from '@kardia/db/enums';

/** Ein Icon je Fachbereich – Kacheln auf der Startseite, Filter und Stationsköpfe. */
export const DEPARTMENT_ICONS: Record<Department, LucideIcon> = {
  ICU: HeartPulse,
  EMERGENCY: Siren,
  SURGERY: Scissors,
  INTERNAL_MEDICINE: Stethoscope,
  GERIATRICS: Armchair,
  PSYCHIATRY: Brain,
  PEDIATRICS: Baby,
  ONCOLOGY: Ribbon,
  OPERATING_ROOM: BedDouble,
  ANESTHESIA: Syringe,
  LONG_TERM_CARE: House,
  HOME_CARE: Footprints,
  REHABILITATION: Activity,
  MATERNITY: Milk,
  RADIOLOGY: ScanLine,
  LABORATORY: FlaskConical,
  PRACTICE: Building2,
};
