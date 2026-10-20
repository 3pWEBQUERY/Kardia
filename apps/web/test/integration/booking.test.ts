import { describe, expect, it } from 'vitest';

import { ProblemError } from '@kardia/core';

import { db } from '@/server/db';
import { bookShift } from '@/server/services/pool';

import { makeCandidate, makeOrg, makeWard } from './fixtures';

/** AK-C2: Eine Schicht kann nie von zwei Personen gleichzeitig gebucht werden. */
describe('AK-C2 Schichtbuchung', () => {
  it('10 gleichzeitige Buchungen → genau eine gewinnt, neun erhalten "bereits vergeben"', async () => {
    const { org, location } = await makeOrg();
    const ward = await makeWard(location.id);
    const pool = await db.flexPool.create({ data: { organizationId: org.id, name: 'Springerpool', bookingMode: 'FIRST_CONFIRMS' } });
    const members = await Promise.all(Array.from({ length: 10 }, () => makeCandidate()));
    await db.poolMember.createMany({ data: members.map((m) => ({ poolId: pool.id, candidateId: m.candidate.id })) });
    const start = new Date(Date.now() + 3 * 86400_000);
    const shift = await db.shift.create({
      data: { poolId: pool.id, wardId: ward.id, startsAt: start, endsAt: new Date(start.getTime() + 8.5 * 3600_000), code: 'F', hourlyRateChf: 55 },
    });

    const results = await Promise.allSettled(members.map((m) => bookShift(m.user.id, shift.id)));
    const won = results.filter((r) => r.status === 'fulfilled');
    const lost = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(9);
    for (const l of lost) {
      expect(l.reason).toBeInstanceOf(ProblemError);
      expect((l.reason as ProblemError).kind).toBe('shiftTaken');
    }
    const saved = await db.shift.findUniqueOrThrow({ where: { id: shift.id } });
    expect(saved.status).toBe('BOOKED');
    expect(members.map((m) => m.candidate.id)).toContain(saved.bookedByCandidateId);
  });

  it('Nicht-Mitglieder können nicht buchen', async () => {
    const { org, location } = await makeOrg();
    const ward = await makeWard(location.id);
    const pool = await db.flexPool.create({ data: { organizationId: org.id, name: 'Pool' } });
    const outsider = await makeCandidate();
    const start = new Date(Date.now() + 86400_000);
    const shift = await db.shift.create({ data: { poolId: pool.id, wardId: ward.id, startsAt: start, endsAt: new Date(start.getTime() + 8 * 3600_000), code: 'S', hourlyRateChf: 55 } });
    await expect(bookShift(outsider.user.id, shift.id)).rejects.toMatchObject({ kind: 'forbidden' });
  });
});
