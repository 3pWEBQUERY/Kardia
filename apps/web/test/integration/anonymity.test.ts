import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { IDENTIFYING_KEYS, ProblemError } from '@kardia/core';
import { generateApiKey } from '@kardia/core/crypto';

import { GET as orgApplications } from '@/app/api/v1/org/applications/route';
import { db } from '@/server/db';
import { listOrgOffers, respondOffer, searchMarketplace, sendOffer } from '@/server/services/marketplace';

import { makeCandidate, makeJob, makeOrg, makeWard } from './fixtures';

function allKeys(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => allKeys(v, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      allKeys(v, out);
    }
  }
  return out;
}

function assertAnonymous(payload: unknown, secrets: string[]) {
  const json = JSON.stringify(payload);
  const keys = allKeys(payload);
  for (const key of IDENTIFYING_KEYS) expect(keys.has(key), `Schlüssel ${key}`).toBe(false);
  for (const s of secrets) expect(json.includes(s), `Wert ${s}`).toBe(false);
}

/**
 * AK-E1: Kein Endpunkt liefert identifizierende Daten eines anonymen Profils vor dessen
 * Freigabe. Geprüft für Marktplatz-Suche, Angebotsliste und ATS-API des Arbeitgebers.
 */
describe('AK-E1 Anonymität im Marktplatz', () => {
  it('liefert vor "Interesse" weder Name, Kontakt noch IDs der Person', async () => {
    const { ctx, location, org } = await makeOrg();
    const ward = await makeWard(location.id);
    const job = await makeJob(ward.id);
    const { user, candidate } = await makeCandidate({ marketplace: true, firstName: 'Annelies', lastName: 'Geheimnis' });
    const secrets = [user.id, user.email, candidate.id, 'Annelies', 'Geheimnis', candidate.phone ?? 'x'];

    const profiles = await searchMarketplace(ctx, {});
    const mine = profiles.find((p) => p.district === 'Bezirk Uster' && p.yearsExperience === 7);
    expect(mine).toBeDefined();
    assertAnonymous(profiles, secrets);
    if (!mine) throw new Error('Profil fehlt');
    expect(mine.ref).not.toContain(candidate.id);

    // AK-E2: unter dem Minimum des Lohnbands abgelehnt
    await expect(sendOffer(ctx, { candidateRef: mine.ref, jobId: job.id, salaryChf: 80_000, workloadPct: 80, startDate: '2030-01-01' })).rejects.toMatchObject({
      kind: 'offerRejected',
    });

    const offer = await sendOffer(ctx, { candidateRef: mine.ref, jobId: job.id, salaryChf: 95_000, workloadPct: 80, startDate: '2030-01-01' });
    assertAnonymous(offer, secrets);
    // Max. 1 offenes Angebot pro Arbeitgeber und Person
    await expect(sendOffer(ctx, { candidateRef: mine.ref, jobId: job.id, salaryChf: 96_000, workloadPct: 80, startDate: '2030-01-01' })).rejects.toBeInstanceOf(ProblemError);

    const listed = await listOrgOffers(ctx);
    assertAnonymous(listed, secrets);

    // ATS-API des Arbeitgebers: vor "Interesse" keine Bewerbung dieser Person
    const key = generateApiKey();
    await db.apiKey.create({ data: { organizationId: org.id, name: 'Test', prefix: key.prefix, keyHash: key.hash, scopes: ['applications:read'] } });
    const call = async () => {
      const res = await orgApplications(new NextRequest('http://localhost/api/v1/org/applications', { headers: { authorization: `Bearer ${key.plain}` } }), {
        params: Promise.resolve({}),
      });
      expect(res.status).toBe(200);
      return (await res.json()) as { data: unknown[] };
    };
    const before = await call();
    assertAnonymous(before, secrets);

    // Erst mit "Interesse" werden Name und Kontakt im Bewerbungs-Thread freigegeben.
    await respondOffer(user.id, offer.id, { action: 'interested' });
    const after = await call();
    expect(JSON.stringify(after)).toContain('Annelies');
  });

  it('gesperrte Institutionen sehen das Profil nicht', async () => {
    const { ctx, org } = await makeOrg();
    const { candidate } = await makeCandidate({ marketplace: true, lastName: 'Gesperrt' });
    await db.candidateBlock.create({ data: { candidateId: candidate.id, organizationId: org.id } });
    const profiles = await searchMarketplace(ctx, {});
    const total = await db.candidateProfile.count({ where: { marketplaceActive: true } });
    expect(profiles.length).toBe(total - 1);
  });
});
