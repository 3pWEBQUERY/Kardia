/**
 * Seed-Daten für lokale Entwicklung und PR-Umgebungen (PRD 10.2). Alle
 * Institutionen sind frei erfunden und als "(Demo)" gekennzeichnet; Personen
 * entsprechen den Personas aus PRD 4. Idempotent: löscht und erzeugt neu.
 */
import 'dotenv/config';

import { createDb } from '../client.ts';

import type {
  Department,
  Prisma,
  Profession,
  RosterCode,
  ShiftType,
} from '../generated/prisma/client.ts';

const db = createDb();

const DAY = 24 * 3600_000;
const now = new Date();
const daysFromNow = (d: number) => new Date(now.getTime() + d * DAY);
const dateOnly = (d: Date) => new Date(d.toISOString().slice(0, 10));

/** UID mit gültiger Prüfziffer aus 8 Ziffern bilden. */
function uid(eight: string): string {
  const weights = [5, 4, 3, 2, 7, 6, 5, 4];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(eight[i]), 0);
  let check = 11 - (sum % 11);
  if (check === 11) check = 0;
  if (check === 10) return uid(String(Number(eight) + 1).padStart(8, '0'));
  const d = `${eight}${check}`;
  return `CHE-${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
}

const R = (s: string) => s.replace(/\s/g, '').split('') as RosterCode[];
const PATTERNS = {
  threeShift: R('FFSSXXX NNNXXFF SSFXXXX FFFSSXX'),
  noNights: R('FFSSXXF SSXXFFX FFSXXSS XFFSSXX'),
  weekdays: R('FFFFFXX FFFFFXX FFFFFXX FFFFFXX'),
  twelveHour: R('TTXXTTX XTTXXTT TXXTTXX XTTXXTT'),
  longTerm: R('FSXXFFS SXXFFSX XFFSSXX FSSXXFF'),
} satisfies Record<string, RosterCode[]>;

interface WardSeed {
  name: string;
  department: Department;
  salary: [number, number];
  shifts: ShiftType[];
  lead: number;
  weekends: number;
  wish: number;
  ratio?: [number, number];
  pattern: RosterCode[];
  onboarding: number;
  vacation: number;
  gav: string;
  confirmedDaysAgo?: number;
  reentry?: boolean;
  childcare?: 'NONE' | 'INTERNAL_DAYCARE' | 'ALLOWANCE';
  jobs: {
    title: string;
    profession: Profession;
    workload: [number, number];
    pendingRecog?: boolean;
    training?: { title: string; category: string; years: number };
  }[];
}

interface OrgSeed {
  name: string;
  uid: string;
  domain: string;
  plan: 'PRAXIS' | 'INSTITUTION' | 'SPITALGRUPPE';
  location: {
    name: string;
    street: string;
    postalCode: string;
    city: string;
    lat: number;
    lng: number;
    parking: boolean;
  };
  wards: WardSeed[];
}

const icu = (n: number, lead: number, salaryMin: number, confirmedDaysAgo = 20): WardSeed => ({
  name: `Intensivstation ${n}`,
  department: 'ICU',
  salary: [salaryMin, Math.round(salaryMin * 1.32)],
  shifts: ['EARLY', 'LATE', 'NIGHT'],
  lead,
  weekends: 2,
  wish: 3,
  ratio: [2, 2.5],
  pattern: PATTERNS.threeShift,
  onboarding: 8,
  vacation: 5,
  gav: 'GAV Zürcher Spitäler (Demo)',
  confirmedDaysAgo,
  jobs: [
    {
      title: `Dipl. Pflegefachperson HF/FH Intensivpflege (${n})`,
      profession: 'NURSE_HF_FH',
      workload: [60, 100],
    },
  ],
});

const ORGS: OrgSeed[] = [
  {
    name: 'Spital Seefeld-Ost AG (Demo)',
    uid: uid('11223344'),
    domain: 'seefeld-ost.example',
    plan: 'SPITALGRUPPE',
    location: {
      name: 'Hauptstandort',
      street: 'Seestrasse 120',
      postalCode: '8008',
      city: 'Zürich',
      lat: 47.3561,
      lng: 8.5536,
      parking: true,
    },
    wards: [
      icu(1, 6, 90_000),
      {
        name: 'Medizin 3 West',
        department: 'INTERNAL_MEDICINE',
        salary: [82_000, 108_000],
        shifts: ['EARLY', 'LATE'],
        lead: 6,
        weekends: 1.5,
        wish: 4,
        ratio: [5, 12],
        pattern: PATTERNS.noNights,
        onboarding: 6,
        vacation: 5,
        gav: 'GAV Zürcher Spitäler (Demo)',
        reentry: true,
        childcare: 'INTERNAL_DAYCARE',
        jobs: [
          {
            title: 'Dipl. Pflegefachperson HF Medizin – ohne Nachtdienst',
            profession: 'NURSE_HF_FH',
            workload: [60, 90],
            pendingRecog: true,
          },
          {
            title: 'Fachfrau/Fachmann Gesundheit EFZ Medizin',
            profession: 'FAGE',
            workload: [50, 100],
          },
          {
            title: 'Assistenzärztin/Assistenzarzt Allgemeine Innere Medizin',
            profession: 'PHYSICIAN',
            workload: [100, 100],
            training: { title: 'Allgemeine Innere Medizin', category: 'A', years: 3 },
          },
        ],
      },
      {
        name: 'Notfallstation',
        department: 'EMERGENCY',
        salary: [86_000, 114_000],
        shifts: ['EARLY', 'LATE', 'NIGHT', 'DAY_12H'],
        lead: 4,
        weekends: 2.5,
        wish: 2,
        ratio: [3, 4],
        pattern: PATTERNS.twelveHour,
        onboarding: 6,
        vacation: 5,
        gav: 'GAV Zürcher Spitäler (Demo)',
        jobs: [
          {
            title: 'Dipl. Pflegefachperson HF Notfallpflege',
            profession: 'NURSE_HF_FH',
            workload: [80, 100],
          },
        ],
      },
    ],
  },
  {
    name: 'Kantonales Regionalspital Glattal (Demo)',
    uid: uid('22334455'),
    domain: 'rs-glattal.example',
    plan: 'INSTITUTION',
    location: {
      name: 'Regionalspital',
      street: 'Spitalstrasse 4',
      postalCode: '8600',
      city: 'Dübendorf',
      lat: 47.3973,
      lng: 8.6187,
      parking: true,
    },
    wards: [
      icu(2, 3, 86_000),
      {
        name: 'Geriatrie',
        department: 'GERIATRICS',
        salary: [78_000, 102_000],
        shifts: ['EARLY', 'LATE', 'NIGHT'],
        lead: 5,
        weekends: 2,
        wish: 3,
        ratio: [6, 14],
        pattern: PATTERNS.threeShift,
        onboarding: 4,
        vacation: 5,
        gav: 'kein GAV',
        confirmedDaysAgo: 200,
        jobs: [
          {
            title: 'Dipl. Pflegefachperson HF Geriatrie',
            profession: 'NURSE_HF_FH',
            workload: [50, 100],
          },
        ],
      },
    ],
  },
  {
    name: 'Klinik Sonnhalde Uster (Demo)',
    uid: uid('33445566'),
    domain: 'sonnhalde-uster.example',
    plan: 'INSTITUTION',
    location: {
      name: 'Klinik Uster',
      street: 'Brunnenstrasse 18',
      postalCode: '8610',
      city: 'Uster',
      lat: 47.3471,
      lng: 8.7209,
      parking: true,
    },
    wards: [
      icu(3, 5, 88_000),
      {
        name: 'Psychiatrie Akut A',
        department: 'PSYCHIATRY',
        salary: [84_000, 110_000],
        shifts: ['EARLY', 'LATE', 'NIGHT'],
        lead: 6,
        weekends: 2,
        wish: 4,
        ratio: [4, 10],
        pattern: PATTERNS.threeShift,
        onboarding: 8,
        vacation: 6,
        gav: 'GAV Zürcher Spitäler (Demo)',
        jobs: [
          {
            title: 'Dipl. Pflegefachperson HF Psychiatrie',
            profession: 'NURSE_HF_FH',
            workload: [60, 100],
          },
        ],
      },
    ],
  },
  {
    name: 'Stadtspital Limmatbogen (Demo)',
    uid: uid('44556677'),
    domain: 'limmatbogen.example',
    plan: 'INSTITUTION',
    location: {
      name: 'Standort Altstetten',
      street: 'Badenerstrasse 600',
      postalCode: '8048',
      city: 'Zürich',
      lat: 47.3891,
      lng: 8.4859,
      parking: false,
    },
    wards: [icu(4, 6, 92_000), icu(5, 4, 89_000)],
  },
  {
    name: 'Spital Zimmerberg Süd (Demo)',
    uid: uid('55667788'),
    domain: 'zimmerberg-sued.example',
    plan: 'INSTITUTION',
    location: {
      name: 'Spital Horgen',
      street: 'Asylstrasse 10',
      postalCode: '8810',
      city: 'Horgen',
      lat: 47.2604,
      lng: 8.5985,
      parking: true,
    },
    wards: [icu(6, 5, 87_000), icu(7, 6, 90_000, 60), icu(9, 4, 88_000)],
  },
  {
    name: 'Kinderspital Hirslanden-Berg (Demo)',
    uid: uid('66778899'),
    domain: 'kispi-berg.example',
    plan: 'INSTITUTION',
    location: {
      name: 'Kinderspital',
      street: 'Bergstrasse 50',
      postalCode: '8032',
      city: 'Zürich',
      lat: 47.3712,
      lng: 8.5651,
      parking: false,
    },
    wards: [
      icu(8, 7, 91_000),
      {
        name: 'Pädiatrie 2',
        department: 'PEDIATRICS',
        salary: [84_000, 110_000],
        shifts: ['EARLY', 'LATE', 'NIGHT'],
        lead: 6,
        weekends: 2,
        wish: 3,
        ratio: [3, 5],
        pattern: PATTERNS.threeShift,
        onboarding: 6,
        vacation: 5,
        gav: 'GAV Zürcher Spitäler (Demo)',
        jobs: [
          {
            title: 'Dipl. Pflegefachperson HF Kinder- und Jugendmedizin',
            profession: 'NURSE_HF_FH',
            workload: [50, 100],
          },
        ],
      },
    ],
  },
  {
    name: 'Pflegezentrum Rebberg Winterthur (Demo)',
    uid: uid('77889900'),
    domain: 'pz-rebberg.example',
    plan: 'INSTITUTION',
    location: {
      name: 'Pflegezentrum',
      street: 'Rebbergweg 3',
      postalCode: '8400',
      city: 'Winterthur',
      lat: 47.5056,
      lng: 8.7241,
      parking: true,
    },
    wards: [
      {
        name: 'Wohnbereich Lindenblick',
        department: 'LONG_TERM_CARE',
        salary: [68_000, 90_000],
        shifts: ['EARLY', 'LATE'],
        lead: 8,
        weekends: 1,
        wish: 4,
        ratio: [8, 25],
        pattern: PATTERNS.longTerm,
        onboarding: 4,
        vacation: 5,
        gav: 'GAV Langzeitpflege Winterthur (Demo)',
        reentry: true,
        childcare: 'ALLOWANCE',
        jobs: [
          {
            title: 'FaGe Langzeitpflege – fixe Tage möglich',
            profession: 'FAGE',
            workload: [40, 80],
          },
          {
            title: 'Assistent/in Gesundheit und Soziales EBA',
            profession: 'AGS',
            workload: [50, 100],
          },
          { title: 'Pflegehelfer/in SRK', profession: 'NURSING_AID_SRK', workload: [30, 80] },
        ],
      },
    ],
  },
  {
    name: 'Hausarztpraxis Dr. Keller (Demo)',
    uid: uid('88990011'),
    domain: 'praxis-keller.example',
    plan: 'PRAXIS',
    location: {
      name: 'Praxis',
      street: 'Dorfstrasse 7',
      postalCode: '8302',
      city: 'Kloten',
      lat: 47.4515,
      lng: 8.5849,
      parking: true,
    },
    wards: [
      {
        name: 'Praxis',
        department: 'PRACTICE',
        salary: [62_000, 78_000],
        shifts: ['WEEKDAYS_ONLY'],
        lead: 8,
        weekends: 0,
        wish: 2,
        pattern: PATTERNS.weekdays,
        onboarding: 2,
        vacation: 5,
        gav: 'kein GAV',
        jobs: [
          {
            title: 'Medizinische Praxisassistentin MPA 60 %',
            profession: 'MPA',
            workload: [60, 60],
          },
        ],
      },
    ],
  },
];

/** Muss TERMS_VERSION in packages/core/src/privacy.ts entsprechen (kein Import: core hängt von db ab). */
const SEED_TERMS = { termsAcceptedAt: new Date(), termsVersion: '2026-10' };

async function reset(): Promise<void> {
  // Reihenfolge egal dank Cascade; TRUNCATE ist schneller und setzt alles zurück.
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  if (list) await db.$executeRawUnsafe(`TRUNCATE ${list} CASCADE`);
}

async function main(): Promise<void> {
  // Pre-Deploy (SEED_DEMO=1): nur in eine leere Datenbank, nie über echte Daten.
  if (process.argv.includes('--if-empty') && (await db.user.count()) > 0) {
    console.warn('Seed übersprungen: Datenbank enthält bereits Daten.');
    return;
  }
  await reset();

  const admin = await db.user.create({
    data: {
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@kardia.local',
      name: 'Kardia Admin',
      emailVerified: true,
      isAdmin: true,
    },
  });

  const wardIds: { id: string; department: Department; orgId: string }[] = [];
  const jobIds: {
    id: string;
    profession: Profession;
    orgId: string;
    wardId: string;
    salaryMin: number;
  }[] = [];

  for (const [i, o] of ORGS.entries()) {
    const owner = await db.user.create({
      data: {
        email: `leitung@${o.domain}`,
        name: i === 0 ? 'Ursula Brunner' : `Leitung ${o.name}`,
        emailVerified: true,
        ...SEED_TERMS,
      },
    });
    const org = await db.organization.create({
      data: {
        name: o.name,
        uid: o.uid,
        verification: 'VERIFIED',
        emailDomains: [o.domain],
        plan: o.plan,
        planValidUntil: daysFromNow(365),
        foundingPartner: o.plan === 'INSTITUTION',
        employerTermsAcceptedAt: new Date(),
        offerQuotaPerMonth: o.plan === 'SPITALGRUPPE' ? 100 : o.plan === 'INSTITUTION' ? 20 : 0,
        members: { create: [{ userId: owner.id, role: 'OWNER' }] },
      },
    });
    if (i === 0) {
      const recruiter = await db.user.create({
        data: { email: `recruiting@${o.domain}`, name: 'Reto Ammann', emailVerified: true, ...SEED_TERMS },
      });
      await db.orgMember.create({
        data: { organizationId: org.id, userId: recruiter.id, role: 'RECRUITER' },
      });
    }
    const location = await db.location.create({
      data: {
        organizationId: org.id,
        name: o.location.name,
        street: o.location.street,
        postalCode: o.location.postalCode,
        city: o.location.city,
        canton: 'ZH',
        lat: o.location.lat,
        lng: o.location.lng,
        hasParking: o.location.parking,
      },
    });
    for (const w of o.wards) {
      const ward = await db.ward.create({
        data: {
          locationId: location.id,
          name: w.name,
          department: w.department,
          salaryMinChf: w.salary[0],
          salaryMaxChf: w.salary[1],
          thirteenthSalary: true,
          nightAllowanceChfHour: w.shifts.includes('NIGHT') ? 7 + (i % 4) : 0,
          sundayAllowancePct: w.department === 'PRACTICE' ? 0 : 50,
          onCallChfDay: w.department === 'ICU' ? 40 : null,
          shiftTypes: w.shifts,
          rosterLeadWeeks: w.lead,
          weekendsPerMonth: w.weekends,
          guaranteedWishDays: w.wish,
          minWorkloadPct: Math.min(...w.jobs.map((j) => j.workload[0])),
          maxWorkloadPct: 100,
          minShiftsPerWeek: w.department === 'LONG_TERM_CARE' ? 2 : null,
          patientsPerNurseDay: w.ratio?.[0] ?? null,
          patientsPerNurseNight: w.ratio?.[1] ?? null,
          skillMixHfFhPct:
            w.department === 'ICU' ? 85 : w.department === 'LONG_TERM_CARE' ? 25 : 60,
          skillMixFagePct: w.department === 'LONG_TERM_CARE' ? 45 : 30,
          skillMixAidPct: w.department === 'LONG_TERM_CARE' ? 30 : 10,
          onboardingWeeks: w.onboarding,
          vacationWeeks: w.vacation,
          educationBudgetChf: w.department === 'PRACTICE' ? 800 : 2500,
          educationDays: w.department === 'PRACTICE' ? 2 : 5,
          childcare: w.childcare ?? 'NONE',
          childcareAllowanceChf: w.childcare === 'ALLOWANCE' ? 300 : null,
          collectiveAgreement: w.gav,
          rosterPattern: w.pattern,
          reentryFriendly: w.reentry ?? false,
          reentryOnboardingWeeks: w.reentry ? 10 : null,
          reentryAccompaniedShifts: w.reentry ? 15 : null,
          ...(w.reentry
            ? {
                reentryRefresher: [
                  {
                    provider: 'Weiterbildungszentrum Pflege (Demo)',
                    durationDays: 12,
                    costCoveredChf: 2400,
                  },
                ],
              }
            : {}),
          description:
            w.department === 'PRACTICE'
              ? 'Kleine Hausarztpraxis mit drei Ärztinnen und Ärzten, Labor und Röntgen im Haus.'
              : `Station mit festem Team und klarer Dienstplanung. Profil vom Arbeitgeber bestätigt.`,
          confirmedAt: new Date(now.getTime() - (w.confirmedDaysAgo ?? 10) * DAY),
        },
      });
      wardIds.push({ id: ward.id, department: w.department, orgId: org.id });
      for (const [k, j] of w.jobs.entries()) {
        const job = await db.job.create({
          data: {
            wardId: ward.id,
            title: j.title,
            profession: j.profession,
            workloadMinPct: j.workload[0],
            workloadMaxPct: j.workload[1],
            startDate: dateOnly(daysFromNow(30 + k * 20)),
            status: 'PUBLISHED',
            publishedAt: new Date(now.getTime() - (k + i) * 2 * DAY),
            allowsPendingRecog: j.pendingRecog ?? false,
            specialtyTitle: j.training?.title ?? null,
            trainingCategory: j.training?.category ?? null,
            maxCreditableYears: j.training?.years ?? null,
            weeklyHours: j.profession === 'PHYSICIAN' ? 50 : null,
            structuredTrainingHoursWeek: j.profession === 'PHYSICIAN' ? 4 : null,
            rotations: j.profession === 'PHYSICIAN' ? ['Notfall', 'Intensivstation'] : [],
            assistantPositions: j.profession === 'PHYSICIAN' ? 12 : null,
          },
        });
        jobIds.push({
          id: job.id,
          profession: j.profession,
          orgId: org.id,
          wardId: ward.id,
          salaryMin: w.salary[0],
        });
      }
    }
  }

  // Personas (PRD 4)
  const personas: {
    email: string;
    first: string;
    last: string;
    profession: Profession;
    years: number;
    district: string;
    home: [number, number];
    experiences: [Department, number][];
    marketplace?: { workload: number; must: Prisma.InputJsonValue };
    credentials: Prisma.CredentialCreateWithoutCandidateInput[];
  }[] = [
    {
      email: 'lea@example.ch',
      first: 'Lea',
      last: 'Meier',
      profession: 'NURSE_HF_FH',
      years: 6,
      district: 'Bezirk Uster',
      home: [47.3486, 8.7175],
      experiences: [
        ['ICU', 4],
        ['INTERNAL_MEDICINE', 2],
      ],
      marketplace: {
        workload: 80,
        must: [
          { key: 'noNights', mode: 'must' },
          { key: 'minRosterLeadWeeks', mode: 'must', value: 6 },
        ],
      },
      credentials: [
        {
          type: 'DIPLOMA',
          title: 'Dipl. Pflegefachfrau HF',
          issuer: 'Höhere Fachschule Pflege (Demo)',
          issuedAt: new Date('2019-09-30'),
          status: 'VERIFIED',
          reviewedAt: daysFromNow(-200),
          reviewedById: admin.id,
        },
        {
          type: 'REGISTRY_ENTRY',
          title: 'Eintrag GesReg',
          registry: 'GESREG',
          status: 'VERIFIED',
          reviewedAt: daysFromNow(-200),
          reviewedById: admin.id,
        },
        {
          type: 'FURTHER_EDUCATION',
          title: 'NDS HF Intensivpflege',
          issuer: 'Höhere Fachschule (Demo)',
          issuedAt: new Date('2022-06-30'),
          status: 'IN_REVIEW',
        },
      ],
    },
    {
      email: 'marco@example.ch',
      first: 'Marco',
      last: 'Rossi',
      profession: 'FAGE',
      years: 15,
      district: 'Bezirk Winterthur',
      home: [47.4988, 8.7237],
      experiences: [
        ['LONG_TERM_CARE', 12],
        ['HOME_CARE', 3],
      ],
      credentials: [
        {
          type: 'DIPLOMA',
          title: 'Fachmann Gesundheit EFZ',
          issuedAt: new Date('2009-07-01'),
          status: 'VERIFIED',
          reviewedAt: daysFromNow(-90),
          reviewedById: admin.id,
        },
      ],
    },
    {
      email: 'sara@example.ch',
      first: 'Sara',
      last: 'Huber',
      profession: 'PHYSICIAN',
      years: 2,
      district: 'Bezirk Zürich',
      home: [47.3769, 8.5417],
      experiences: [['INTERNAL_MEDICINE', 2]],
      credentials: [
        {
          type: 'DIPLOMA',
          title: 'Eidg. Arztdiplom',
          issuedAt: new Date('2024-09-01'),
          status: 'VERIFIED',
          reviewedAt: daysFromNow(-30),
          reviewedById: admin.id,
        },
        {
          type: 'REGISTRY_ENTRY',
          title: 'MedReg-Eintrag',
          registry: 'MEDREG',
          status: 'SUBMITTED',
        },
      ],
    },
    {
      email: 'nadine@example.ch',
      first: 'Nadine',
      last: 'Keller',
      profession: 'NURSE_HF_FH',
      years: 10,
      district: 'Bezirk Meilen',
      home: [47.2706, 8.6447],
      experiences: [['SURGERY', 10]],
      credentials: [
        {
          type: 'DIPLOMA',
          title: 'Dipl. Pflegefachfrau HF',
          issuedAt: new Date('2008-10-01'),
          status: 'SUBMITTED',
        },
      ],
    },
    {
      email: 'jonas@example.ch',
      first: 'Jonas',
      last: 'Schmidt',
      profession: 'NURSE_HF_FH',
      years: 8,
      district: 'Bezirk Dietikon',
      home: [47.4017, 8.4001],
      experiences: [
        ['EMERGENCY', 5],
        ['ICU', 3],
      ],
      marketplace: { workload: 100, must: [{ key: 'pendingRecognition', mode: 'must' }] },
      credentials: [
        {
          type: 'DIPLOMA',
          title: 'Gesundheits- und Krankenpfleger (DE)',
          issuer: 'Staatliche Prüfung, Deutschland',
          issuedAt: new Date('2017-09-01'),
          status: 'VERIFIED',
          reviewedAt: daysFromNow(-10),
          reviewedById: admin.id,
        },
        {
          type: 'RECOGNITION_SRK',
          title: 'SRK-Anerkennung (Verfahren läuft)',
          status: 'SUBMITTED',
        },
      ],
    },
  ];

  const candidates: { id: string; profession: Profession }[] = [];
  for (const p of personas) {
    const user = await db.user.create({
      data: { email: p.email, name: `${p.first} ${p.last}`, emailVerified: true, ...SEED_TERMS },
    });
    const c = await db.candidateProfile.create({
      data: {
        userId: user.id,
        firstName: p.first,
        lastName: p.last,
        homeLat: p.home[0],
        homeLng: p.home[1],
        homeDistrict: p.district,
        profession: p.profession,
        yearsExperience: p.years,
        workAuthorizedCh: true,
        marketplaceActive: !!p.marketplace,
        desiredWorkloadPct: p.marketplace?.workload ?? null,
        earliestStart: p.marketplace ? dateOnly(daysFromNow(60)) : null,
        ...(p.marketplace ? { mustConditions: p.marketplace.must } : {}),
        experiences: {
          create: p.experiences.map(([department, years]) => ({ department, years })),
        },
        languages: {
          create: [
            { language: 'de', level: 'C2' },
            { language: 'en', level: 'B2' },
          ],
        },
        credentials: { create: p.credentials },
      },
    });
    candidates.push({ id: c.id, profession: p.profession });
  }

  const [lea, marco, sara, , jonas] = candidates;
  const nurseJobs = jobIds.filter((j) => j.profession === 'NURSE_HF_FH');
  if (lea && nurseJobs[0] && nurseJobs[1]) {
    await db.application.create({
      data: {
        jobId: nurseJobs[0].id,
        candidateId: lea.id,
        status: 'INTERVIEW',
        message: 'Ich suche planbare Dienste und freue mich auf ein Gespräch.',
      },
    });
    await db.application.create({
      data: { jobId: nurseJobs[1].id, candidateId: lea.id, status: 'NEW' },
    });
    await db.savedJob.create({
      data: { candidateId: lea.id, jobId: nurseJobs[2]?.id ?? nurseJobs[0].id },
    });
    await db.savedSearch.create({
      data: {
        candidateId: lea.id,
        name: 'IPS ohne Nächte',
        filters: {
          profession: 'NURSE_HF_FH',
          workloadPct: 80,
          conditions: [{ key: 'noNights', mode: 'must' }],
        },
        frequency: 'DAILY',
      },
    });
  }
  const fageJob = jobIds.find((j) => j.profession === 'FAGE');
  if (marco && fageJob) {
    await db.application.create({
      data: { jobId: fageJob.id, candidateId: marco.id, status: 'SCREENED' },
    });
  }
  const docJob = jobIds.find((j) => j.profession === 'PHYSICIAN');
  if (sara && docJob) {
    await db.trainingProgress.createMany({
      data: [
        {
          candidateId: sara.id,
          specialtyTitle: 'Allgemeine Innere Medizin',
          area: 'basis',
          yearsCompleted: 2,
        },
      ],
    });
  }

  // Marktplatz-Angebot an Jonas
  const firstOrgJob = jobIds[0];
  if (jonas && firstOrgJob) {
    await db.offer.create({
      data: {
        organizationId: firstOrgJob.orgId,
        candidateId: jonas.id,
        jobId: firstOrgJob.id,
        salaryChf: firstOrgJob.salaryMin + 6000,
        workloadPct: 100,
        startDate: dateOnly(daysFromNow(75)),
        note: 'Wir begleiten Sie durch das SRK-Verfahren und stellen bis zum Abschluss als Pflegefachperson in Anerkennung an.',
        expiresAt: daysFromNow(14),
      },
    });
  }

  // Flex-Pool der ersten Organisation
  const firstOrg = wardIds[0];
  if (firstOrg && lea) {
    const pool = await db.flexPool.create({
      data: {
        organizationId: firstOrg.orgId,
        name: 'Springerpool Intensiv & Medizin',
        bookingMode: 'FIRST_CONFIRMS',
        cancelDeadlineHours: 48,
        members: { create: [{ candidateId: lea.id }] },
      },
    });
    const codes: [RosterCode, number, number][] = [
      ['F', 7, 15.5],
      ['S', 14.5, 23],
      ['N', 22.5, 31.5],
    ];
    for (let d = 2; d < 16; d += 2) {
      const slot = codes[d % 3];
      if (!slot) continue;
      const [code, from, to] = slot;
      const day = new Date(dateOnly(daysFromNow(d)));
      await db.shift.create({
        data: {
          poolId: pool.id,
          wardId: firstOrg.id,
          startsAt: new Date(day.getTime() + (from - 2) * 3600_000),
          endsAt: new Date(day.getTime() + (to - 2) * 3600_000),
          code,
          hourlyRateChf: code === 'N' ? 62 : 55,
          requirements: 'Erfahrung Intensivpflege, NDS von Vorteil',
          ...(d === 4 ? { status: 'BOOKED', bookedByCandidateId: lea.id, bookedAt: now } : {}),
        },
      });
    }
  }

  // Realitäts-Check: 7 Stimmen zum Dienstplan-Vorlauf der ersten Station (Team sagt 4 Wo)
  if (firstOrg) {
    const votes = [false, false, true, false, false, false, true];
    for (const [i, agrees] of votes.entries()) {
      await db.realityCheck.create({
        data: {
          wardId: firstOrg.id,
          field: 'rosterLeadWeeks',
          agrees,
          proposedValue: agrees ? null : String(i % 2 === 0 ? 4 : 5),
          voterHash: `seed-voter-${i}`,
        },
      });
      await db.realityCheck.create({
        data: {
          wardId: firstOrg.id,
          field: 'weekendsPerMonth',
          agrees: true,
          voterHash: `seed-voter-${i}`,
        },
      });
    }
    await db.teamQuestion.create({
      data: {
        wardId: firstOrg.id,
        askedById: admin.id,
        body: 'Wie werden Wunschfrei-Tage in der Praxis gehandhabt, wenn viele gleichzeitig frei möchten?',
        answer:
          'Wir planen sechs Wochen im Voraus; bei Überschneidungen gilt eine Rotation, die im Team transparent geführt wird.',
        answeredAt: daysFromNow(-3),
        createdAt: daysFromNow(-5),
        moderation: 'APPROVED',
      },
    });
  }

  // Anerkennungs-Tracker (Modul H), redaktionell, mit Prüfdatum
  await db.recognitionGuide.create({
    data: {
      originCountry: 'DE',
      targetProfession: 'NURSE_HF_FH',
      authority: 'SRK',
      reviewedAt: dateOnly(daysFromNow(-30)),
      steps: [
        {
          id: 'unterlagen',
          title: 'Unterlagen zusammenstellen',
          description: 'Diplom, Fächer- und Stundennachweis, Berufserfahrung, Identitätsnachweis.',
          documents: [
            'Diplom/Examensurkunde',
            'Fächer- und Stundenübersicht',
            'Arbeitszeugnisse',
            'Pass oder ID',
          ],
          links: [
            {
              label: 'SRK – Anerkennung ausländischer Ausbildungsabschlüsse',
              url: 'https://www.redcross.ch/de/srk-anerkennung',
            },
          ],
          durationWeeks: 2,
        },
        {
          id: 'gesuch',
          title: 'Gesuch beim SRK einreichen',
          description: 'Online-Gesuch mit allen Unterlagen. Das SRK prüft die Gleichwertigkeit.',
          documents: [],
          links: [],
          durationWeeks: 1,
        },
        {
          id: 'entscheid',
          title: 'Entscheid abwarten',
          description:
            'Bei Unterschieden verfügt das SRK Ausgleichsmassnahmen (Eignungsprüfung oder Anpassungslehrgang).',
          documents: [],
          links: [],
          durationWeeks: 12,
        },
        {
          id: 'ausgleich',
          title: 'Ausgleichsmassnahmen absolvieren',
          description:
            'Falls verfügt. Bis zum Abschluss ist eine Anstellung "in Anerkennung" je nach Arbeitgeber möglich.',
          documents: [],
          links: [],
          durationWeeks: 26,
        },
        {
          id: 'register',
          title: 'Eintrag im GesReg',
          description: 'Nach der Anerkennung erfolgt der Eintrag im Gesundheitsberuferegister.',
          documents: [],
          links: [{ label: 'GesReg', url: 'https://www.healthreg-public.admin.ch/gesreg/search' }],
          durationWeeks: 2,
        },
      ],
    },
  });
  await db.recognitionGuide.create({
    data: {
      originCountry: 'EU',
      targetProfession: 'PHYSICIAN',
      authority: 'MEBEKO',
      reviewedAt: dateOnly(daysFromNow(-30)),
      steps: [
        {
          id: 'diplom',
          title: 'Anerkennung des Arztdiploms (MEBEKO)',
          description: 'EU/EFTA-Diplome werden gemäss Freizügigkeitsabkommen anerkannt.',
          documents: ['Arztdiplom', 'Konformitätsbescheinigung'],
          links: [
            {
              label: 'BAG – MEBEKO',
              url: 'https://www.bag.admin.ch/bag/de/home/berufe-im-gesundheitswesen/medizinalberufe/medizinalberufekommission-mebeko.html',
            },
          ],
          durationWeeks: 8,
        },
        {
          id: 'sprache',
          title: 'Sprachnachweis',
          description: 'Kenntnisse einer Landessprache für die Berufsausübung (meist B2/C1).',
          documents: ['Sprachzertifikat'],
          links: [],
          durationWeeks: null,
        },
        {
          id: 'medreg',
          title: 'Eintrag im MedReg',
          description: 'Nach der Anerkennung wird das Diplom im MedReg eingetragen.',
          documents: [],
          links: [{ label: 'MedReg', url: 'https://www.healthreg-public.admin.ch/medreg/search' }],
          durationWeeks: 1,
        },
      ],
    },
  });

  // Einige Ereignisse für die KPI-Ansicht
  await db.event.createMany({
    data: jobIds.map((j) => ({
      name: 'job.published',
      orgId: j.orgId,
      entityId: j.id,
      createdAt: daysFromNow(-10),
    })),
  });

  console.warn(
    `Seed fertig: ${ORGS.length} Organisationen, ${wardIds.length} Stationen, ${jobIds.length} Stellen, ${candidates.length} Fachpersonen.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void db.$disconnect());
