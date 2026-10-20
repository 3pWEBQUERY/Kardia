import { z } from 'zod';

/**
 * Weiterbildungs-Suche für Ärztinnen und Ärzte (Modul F). Der Katalog ist
 * Redaktionsdaten (Admin-Redaktion "Titel") und wird mit dem SIWF-Register
 * abgeglichen (Q-3). Hier nur die Struktur und eine Auswahl der eidgenössischen
 * Weiterbildungstitel mit Gesamtdauer; Bereiche je Titel stehen in `areas`.
 */
export interface SpecialtyTitle {
  id: string;
  name: string;
  totalYears: number;
  areas: { id: string; name: string; years: number }[];
}

export const SPECIALTY_TITLES: readonly SpecialtyTitle[] = [
  {
    id: 'aim',
    name: 'Allgemeine Innere Medizin',
    totalYears: 5,
    areas: [
      { id: 'basis', name: 'Basisweiterbildung Innere Medizin', years: 3 },
      { id: 'aufbau-stationaer', name: 'Aufbauweiterbildung stationär', years: 1 },
      { id: 'aufbau-ambulant', name: 'Aufbauweiterbildung ambulant', years: 1 },
    ],
  },
  {
    id: 'chirurgie',
    name: 'Chirurgie',
    totalYears: 6,
    areas: [
      { id: 'basis', name: 'Basisweiterbildung Chirurgie', years: 2 },
      { id: 'fachspezifisch', name: 'Fachspezifische Weiterbildung', years: 4 },
    ],
  },
  {
    id: 'anaesthesiologie',
    name: 'Anästhesiologie',
    totalYears: 5,
    areas: [
      { id: 'anaesthesie', name: 'Anästhesiologie', years: 4 },
      { id: 'ips', name: 'Intensivmedizin', years: 0.5 },
      { id: 'nichtfach', name: 'Nicht fachspezifisch', years: 0.5 },
    ],
  },
  {
    id: 'paediatrie',
    name: 'Kinder- und Jugendmedizin',
    totalYears: 5,
    areas: [
      { id: 'basis', name: 'Basisweiterbildung', years: 3 },
      { id: 'aufbau', name: 'Aufbauweiterbildung', years: 2 },
    ],
  },
  {
    id: 'psychiatrie',
    name: 'Psychiatrie und Psychotherapie',
    totalYears: 6,
    areas: [
      { id: 'stationaer', name: 'Stationäre Psychiatrie', years: 2 },
      { id: 'ambulant', name: 'Ambulante Psychiatrie', years: 2 },
      { id: 'frei', name: 'Frei wählbar', years: 2 },
    ],
  },
  {
    id: 'intensivmedizin',
    name: 'Intensivmedizin',
    totalYears: 6,
    areas: [
      { id: 'ips', name: 'Intensivmedizin', years: 3 },
      { id: 'nichtfach', name: 'Nicht fachspezifisch (AIM, Anästhesie, Chirurgie)', years: 3 },
    ],
  },
  {
    id: 'gynaekologie',
    name: 'Gynäkologie und Geburtshilfe',
    totalYears: 5,
    areas: [
      { id: 'fach', name: 'Gynäkologie und Geburtshilfe', years: 4 },
      { id: 'nichtfach', name: 'Nicht fachspezifisch', years: 1 },
    ],
  },
  {
    id: 'radiologie',
    name: 'Radiologie',
    totalYears: 5,
    areas: [{ id: 'fach', name: 'Radiologie', years: 5 }],
  },
];

/** Weiterbildungsstätten-Kategorien (SIWF), z. B. A, B, C für AIM. */
export const TRAINING_CATEGORIES = ['A', 'B', 'C', 'D', '1', '2', '3', '4'] as const;

export const trainingProgressSchema = z.array(
  z.object({
    specialtyTitle: z.string().min(2).max(160),
    area: z.string().min(1).max(80),
    yearsCompleted: z.number().min(0).max(10),
  }),
);

export interface TrainingGap {
  title: SpecialtyTitle;
  remainingYears: number;
  remainingByArea: { area: string; name: string; years: number }[];
}

/** "Was fehlt mir noch?" – verbleibende Jahre je Bereich. */
export function trainingGap(
  titleName: string,
  progress: readonly { specialtyTitle: string; area: string; yearsCompleted: number }[],
): TrainingGap | null {
  const title = SPECIALTY_TITLES.find((t) => t.name === titleName || t.id === titleName);
  if (!title) return null;
  const done = progress.filter(
    (p) => p.specialtyTitle === title.name || p.specialtyTitle === title.id,
  );
  const remainingByArea = title.areas.map((a) => {
    const completed = done.filter((p) => p.area === a.id).reduce((s, p) => s + p.yearsCompleted, 0);
    return { area: a.id, name: a.name, years: Math.max(0, a.years - completed) };
  });
  return {
    title,
    remainingByArea,
    remainingYears: remainingByArea.reduce((s, a) => s + a.years, 0),
  };
}

/** Wie viele der fehlenden Jahre schliesst diese Stelle? */
export function yearsClosedByJob(
  gap: TrainingGap,
  job: { specialtyTitle: string | null; maxCreditableYears: number | null },
): number {
  if (!job.specialtyTitle || job.maxCreditableYears == null) return 0;
  if (job.specialtyTitle !== gap.title.name && job.specialtyTitle !== gap.title.id) return 0;
  return Math.min(gap.remainingYears, job.maxCreditableYears);
}
