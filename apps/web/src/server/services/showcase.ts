import 'server-only';

import { Department } from '@kardia/db/enums';

import { db } from '../db.ts';

/**
 * Kennzahlen und Auswahl für die öffentlichen Einstiegsseiten (Startseite, Arbeitgeber).
 * Nur veröffentlichte Stellen; keine personenbezogenen Daten.
 */
export interface PlatformStats {
  jobs: number;
  wards: number;
  organizations: number;
  departments: { department: Department; jobs: number }[];
}

export async function platformStats(): Promise<PlatformStats> {
  const published = { status: 'PUBLISHED' as const };
  const [jobs, wards, organizations, byWard] = await Promise.all([
    db.job.count({ where: published }),
    db.ward.count({ where: { jobs: { some: published } } }),
    db.organization.count({ where: { locations: { some: { wards: { some: { jobs: { some: published } } } } } } }),
    db.job.findMany({ where: published, select: { ward: { select: { department: true } } } }),
  ]);
  const counts = new Map<Department, number>();
  for (const j of byWard) counts.set(j.ward.department, (counts.get(j.ward.department) ?? 0) + 1);
  const departments = Object.values(Department)
    .map((department) => ({ department, jobs: counts.get(department) ?? 0 }))
    .sort((a, b) => b.jobs - a.jobs);
  return { jobs, wards, organizations, departments };
}
