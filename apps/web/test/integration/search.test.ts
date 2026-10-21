import { describe, expect, it } from 'vitest';

import { evaluateMatch, searchFilterSchema, type Condition } from '@kardia/core';

import { db } from '@/server/db';
import { searchJobs } from '@/server/services/search';

import { makeJob, makeOrg, makeWard } from './fixtures';

/**
 * AK-B1 gegen das echte SQL: Kein Treffer verletzt eine Muss-Bedingung. Das SQL und
 * evaluateMatch müssen dieselbe Entscheidung treffen – inkl. Überschreibungen der Stelle.
 */
describe('Lebensmodell-Suche (SQL)', () => {
  it('AK-B1: Muss-Bedingungen aus allen Feldern von Modul A schliessen im SQL aus', async () => {
    const tag = `Fach-${Date.now()}`;
    const { location } = await makeOrg();
    const a = await makeWard(location.id);
    await db.ward.update({
      where: { id: a.id },
      data: { shiftTypes: ['EARLY', 'LATE'], sundayAllowancePct: 50, onCallChfDay: null, skillMixHfFhPct: 80, educationBudgetChf: 3000, minShiftsPerWeek: 3 },
    });
    const b = await makeWard(location.id);
    await db.ward.update({
      where: { id: b.id },
      data: { shiftTypes: ['DAY_12H', 'NIGHT'], sundayAllowancePct: 30, onCallChfDay: 60, skillMixHfFhPct: 40, educationBudgetChf: null, minShiftsPerWeek: null },
    });
    const jobA = await makeJob(a.id);
    const jobB = await makeJob(b.id);
    // Stelle auf B überschreibt die Sonntagszulage der Station (effektiver Wert 70 %).
    const jobB2 = await makeJob(b.id);
    await db.job.updateMany({ where: { id: { in: [jobA.id, jobB.id, jobB2.id] } }, data: { specialtyTitle: tag } });
    await db.job.update({ where: { id: jobB2.id }, data: { overrides: { sundayAllowancePct: 70 } } });

    const cases: [Condition, string[]][] = [
      [{ key: 'noEarlyShifts', mode: 'must' }, [jobB.id, jobB2.id]],
      [{ key: 'noLateShifts', mode: 'must' }, [jobB.id, jobB2.id]],
      [{ key: 'no12hShifts', mode: 'must' }, [jobA.id]],
      [{ key: 'minSundayAllowancePct', mode: 'must', value: 45 }, [jobA.id, jobB2.id]],
      [{ key: 'minOnCallChfDay', mode: 'must', value: 50 }, [jobA.id, jobB.id, jobB2.id]], // A unbekannt → bleibt
      [{ key: 'minSkillMixHfFhPct', mode: 'must', value: 60 }, [jobA.id]],
      [{ key: 'minEducationBudget', mode: 'must', value: 2000 }, [jobA.id, jobB.id, jobB2.id]], // B unbekannt → bleibt
      [{ key: 'maxRequiredShiftsPerWeek', mode: 'must', value: 2 }, [jobB.id, jobB2.id]],
    ];
    for (const [condition, expected] of cases) {
      const filter = searchFilterSchema.parse({ specialtyTitle: tag, conditions: [condition] });
      const result = await searchJobs(filter, { limit: 50 });
      expect(result.hits.map((h) => h.jobId).sort(), condition.key).toEqual([...expected].sort());
      for (const hit of result.hits) {
        const match = evaluateMatch([condition], { profile: hit.profile, hasParking: hit.location.hasParking, allowsPendingRecog: hit.allowsPendingRecog, trainingCategory: hit.trainingCategory });
        expect(match.excluded, `${condition.key} ${hit.jobId}`).toBe(false);
      }
    }
  });
});
