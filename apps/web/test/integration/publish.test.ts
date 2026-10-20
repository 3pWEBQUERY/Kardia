import { describe, expect, it } from 'vitest';

import { REALITY_CHECK_MIN_VOTES } from '@kardia/core';

import { db } from '@/server/db';
import { blockersFor, publishJob } from '@/server/services/jobs';
import { castRealityVote } from '@/server/services/team';
import { realityAggregates } from '@/server/services/wards';

import { makeCandidate, makeJob, makeOrg, makeWard } from './fixtures';

describe('Veröffentlichen von Stellen', () => {
  it('AK-A1: mit leerem Pflichtfeld nicht veröffentlichbar', async () => {
    const { ctx, location } = await makeOrg();
    const ward = await makeWard(location.id, { patientsPerNurseDay: null });
    const job = await makeJob(ward.id, 'DRAFT');
    await expect(publishJob(ctx, job.id)).rejects.toMatchObject({ kind: 'publishBlocked' });
    const blockers = await blockersFor(ctx, job.id);
    expect(blockers).toContainEqual({ kind: 'missingField', field: 'patientsPerNurseDay' });

    await db.ward.update({ where: { id: ward.id }, data: { patientsPerNurseDay: 2 } });
    const published = await publishJob(ctx, job.id);
    expect(published.status).toBe('PUBLISHED');
  });

  it('AK-C1: SECO-Treffer ohne Admin-Freigabe blockiert die Veröffentlichung', async () => {
    const { ctx, location, org } = await makeOrg({ verification: 'AGENCY_REVIEW', seco: true });
    const ward = await makeWard(location.id);
    const job = await makeJob(ward.id, 'DRAFT');
    await expect(publishJob(ctx, job.id)).rejects.toMatchObject({ kind: 'publishBlocked' });
    expect(await blockersFor(ctx, job.id)).toContainEqual({ kind: 'agencyReview' });

    await db.organization.update({ where: { id: org.id }, data: { verification: 'VERIFIED' } });
    expect((await publishJob(ctx, job.id)).status).toBe('PUBLISHED');
  });

  it('AK-G1: Realitäts-Check erst ab 5 Stimmen sichtbar, ohne Personenbezug', async () => {
    const { location } = await makeOrg();
    const ward = await makeWard(location.id);
    const voters = await Promise.all(Array.from({ length: REALITY_CHECK_MIN_VOTES }, () => makeCandidate()));
    await db.verifiedEmployee.createMany({ data: voters.map((v) => ({ wardId: ward.id, userId: v.user.id, method: 'EMPLOYER_INVITE' })) });

    for (const [i, v] of voters.entries()) {
      await castRealityVote(v.user.id, ward.id, { field: 'rosterLeadWeeks', agrees: false, proposedValue: '4' });
      const agg = await realityAggregates(ward.id, ward);
      if (i < REALITY_CHECK_MIN_VOTES - 1) expect(agg.rosterLeadWeeks).toBeUndefined();
      else expect(agg.rosterLeadWeeks).toMatchObject({ votes: 5, teamValue: 4, deviates: true });
    }
    const stored = await db.realityCheck.findMany({ where: { wardId: ward.id } });
    const raw = JSON.stringify(stored);
    for (const v of voters) expect(raw.includes(v.user.id)).toBe(false);

    // Nicht verifizierte Personen dürfen nicht abstimmen
    const outsider = await makeCandidate();
    await expect(castRealityVote(outsider.user.id, ward.id, { field: 'rosterLeadWeeks', agrees: true })).rejects.toMatchObject({ kind: 'forbidden' });
  });
});
