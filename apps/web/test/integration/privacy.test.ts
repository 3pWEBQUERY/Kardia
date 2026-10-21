import { describe, expect, it } from 'vitest';

import { db } from '@/server/db';
import { kpis } from '@/server/services/admin';
import { deleteDataSubject, exportDataSubject, findDataSubject } from '@/server/services/adminPrivacy';

import { makeCandidate, makeJob, makeOrg, makeWard } from './fixtures';

import type { CurrentSession } from '@/server/session';

async function makeAdmin(): Promise<CurrentSession> {
  const user = await db.user.create({ data: { email: `admin-${Date.now()}@kardia.example`, name: 'Admin', emailVerified: true, isAdmin: true } });
  return { user: { id: user.id, email: user.email, name: user.name, isAdmin: true, locale: 'DE_CH' }, session: { id: 'test', createdAt: new Date(), authMethod: 'passkey' } };
}

describe('Betroffenenanfragen (revDSG)', () => {
  it('Suche, Export und Löschung laufen über dieselbe Logik wie die Selbstauskunft und stehen im Audit-Log', async () => {
    const admin = await makeAdmin();
    const { user, candidate } = await makeCandidate();
    await db.candidateProfile.update({ where: { id: candidate.id }, data: { phone: null } });

    const found = await findDataSubject(admin, user.email.toUpperCase());
    expect(found).toMatchObject({ id: user.id, candidate: { applications: 0, credentials: 1 } });
    expect(await findDataSubject(admin, 'niemand@kardia.example')).toBeNull();

    const data = await exportDataSubject(admin, user.id);
    expect(data.user.email).toBe(user.email);
    expect(data.candidate?.credentials).toHaveLength(1);

    await expect(deleteDataSubject(admin, user.id, 'falsch@kardia.example')).rejects.toMatchObject({ kind: 'validation' });
    await expect(deleteDataSubject(admin, admin.user.id, admin.user.email)).rejects.toMatchObject({ kind: 'forbidden' });
    await deleteDataSubject(admin, user.id, user.email);
    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.deletedAt).not.toBeNull();
    expect(await db.candidateProfile.findUnique({ where: { id: candidate.id } })).toBeNull();

    const actions = (await db.auditLog.findMany({ where: { actorId: admin.user.id }, select: { action: true } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['privacy.lookup', 'privacy.export', 'privacy.delete']));
  });

  it('KPI Ein-Klick-Quote zählt Bewerbungen mit dem Pass, WAU nur Fachpersonen', async () => {
    const { location } = await makeOrg();
    const ward = await makeWard(location.id);
    const job = await makeJob(ward.id);
    const before = await kpis();
    const a = await makeCandidate();
    const b = await makeCandidate();
    await db.application.create({ data: { jobId: job.id, candidateId: a.candidate.id, viaPass: true } });
    await db.application.create({ data: { jobId: job.id, candidateId: b.candidate.id, viaPass: false } });
    // Arbeitgeber-Konto ohne Pass zählt nicht zu den WAU.
    await db.user.create({ data: { email: `employer-${Date.now()}@kardia.example`, name: 'HR', lastActiveAt: new Date() } });
    const after = await kpis();
    expect(after.weeklyActiveUsers).toBe(before.weeklyActiveUsers + 2);
    expect(after.oneClickShare).not.toBeNull();
    expect(after.oneClickShare).toBeLessThan(1);
  });
});
