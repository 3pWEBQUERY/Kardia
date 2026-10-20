import { randomUUID } from 'node:crypto';


import { db } from '@/server/db';

import type { OrgContext } from '@/server/session';
import type { Department, OrgVerification, PlanTier, RosterCode } from '@kardia/db';

const uid = () => randomUUID().slice(0, 8);

let uidCounter = 10_000_000 + Math.floor(Math.random() * 80_000_000);
/** Gültige UID mit Prüfziffer (Gewichte 5,4,3,2,7,6,5,4). */
function swissUid(): string {
  for (;;) {
    const eight = String(uidCounter++).padStart(8, '0');
    const sum = [5, 4, 3, 2, 7, 6, 5, 4].reduce((a, w, i) => a + w * Number(eight[i]), 0);
    let check = 11 - (sum % 11);
    if (check === 11) check = 0;
    if (check === 10) continue;
    const d = `${eight}${check}`;
    return `CHE-${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  }
}

export const PATTERN = 'FFSSXXXNNNXXFFSSFXXXXFFFSSXX'.split('') as RosterCode[];

export async function makeOrg(opts: { verification?: OrgVerification; seco?: boolean; plan?: PlanTier | null } = {}) {
  const owner = await db.user.create({ data: { email: `owner-${uid()}@test.example`, name: 'Owner', emailVerified: true } });
  const org = await db.organization.create({
    data: {
      name: `Testspital ${uid()}`,
      uid: swissUid(),
      verification: opts.verification ?? 'VERIFIED',
      secoRegistryMatch: opts.seco ?? false,
      emailDomains: ['test.example'],
      plan: opts.plan === undefined ? 'INSTITUTION' : opts.plan,
      offerQuotaPerMonth: 20,
      members: { create: { userId: owner.id, role: 'OWNER' } },
    },
  });
  const location = await db.location.create({
    data: { organizationId: org.id, name: 'Haupthaus', street: 'Teststrasse 1', postalCode: '8000', city: 'Zürich', canton: 'ZH', lat: 47.37, lng: 8.54, hasParking: true },
  });
  const ctx: OrgContext = {
    user: { id: owner.id, email: owner.email, name: 'Owner', isAdmin: false, locale: 'DE_CH' },
    session: { id: 's', createdAt: new Date(), authMethod: 'passkey' },
    role: 'OWNER',
    org: { id: org.id, name: org.name, plan: org.plan, verification: org.verification, secoRegistryMatch: org.secoRegistryMatch },
  };
  return { org, location, owner, ctx };
}

export async function makeWard(locationId: string, overrides: Partial<{ department: Department; patientsPerNurseDay: number | null; salaryMinChf: number; salaryMaxChf: number }> = {}) {
  return db.ward.create({
    data: {
      locationId,
      name: `Station ${uid()}`,
      department: overrides.department ?? 'ICU',
      salaryMinChf: overrides.salaryMinChf ?? 90_000,
      salaryMaxChf: overrides.salaryMaxChf ?? 115_000,
      thirteenthSalary: true,
      nightAllowanceChfHour: 8,
      sundayAllowancePct: 50,
      shiftTypes: ['EARLY', 'LATE', 'NIGHT'],
      rosterLeadWeeks: 6,
      weekendsPerMonth: 2,
      guaranteedWishDays: 3,
      minWorkloadPct: 60,
      maxWorkloadPct: 100,
      patientsPerNurseDay: overrides.patientsPerNurseDay === undefined ? 2 : overrides.patientsPerNurseDay,
      patientsPerNurseNight: 3,
      onboardingWeeks: 6,
      vacationWeeks: 5,
      collectiveAgreement: 'GAV Test',
      rosterPattern: PATTERN,
      confirmedAt: new Date(),
    },
  });
}

export async function makeJob(wardId: string, status: 'DRAFT' | 'PUBLISHED' = 'PUBLISHED') {
  return db.job.create({
    data: {
      wardId,
      title: `Pflegefachperson ${uid()}`,
      profession: 'NURSE_HF_FH',
      workloadMinPct: 60,
      workloadMaxPct: 100,
      status,
      ...(status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
    },
  });
}

export async function makeCandidate(opts: { marketplace?: boolean; firstName?: string; lastName?: string } = {}) {
  const user = await db.user.create({ data: { email: `cand-${uid()}@person.example`, name: 'Kandidat', emailVerified: true } });
  const candidate = await db.candidateProfile.create({
    data: {
      userId: user.id,
      firstName: opts.firstName ?? 'Vreni',
      lastName: opts.lastName ?? `Muster${uid()}`,
      phone: 'v1:t1:encrypted-placeholder',
      homeLat: 47.35,
      homeLng: 8.72,
      homeDistrict: 'Bezirk Uster',
      profession: 'NURSE_HF_FH',
      yearsExperience: 7,
      workAuthorizedCh: true,
      marketplaceActive: opts.marketplace ?? false,
      desiredWorkloadPct: 80,
      mustConditions: [{ key: 'noNights', mode: 'must' }],
      experiences: { create: [{ department: 'ICU', years: 5 }] },
      languages: { create: [{ language: 'de', level: 'C2' }] },
      credentials: { create: [{ type: 'DIPLOMA', title: 'Dipl. Pflegefachfrau HF', status: 'VERIFIED' }] },
    },
  });
  return { user, candidate };
}
