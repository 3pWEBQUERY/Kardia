import { ProblemError, parseOrThrow, passInputSchema } from '@kardia/core';

import { api, readJson, requireUserPrincipal } from '@/server/api';
import { getPass, upsertPass } from '@/server/services/pass';

function view(p: NonNullable<Awaited<ReturnType<typeof getPass>>>) {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    phone: p.phone,
    profession: p.profession,
    yearsExperience: p.yearsExperience,
    workAuthorizedCh: p.workAuthorizedCh,
    experiences: p.experiences.map((e) => ({ department: e.department, years: e.years })),
    languages: p.languages.map((l) => ({ language: l.language, level: l.level })),
    credentials: p.credentials.map((c) => ({
      id: c.id,
      type: c.type,
      title: c.title,
      issuer: c.issuer,
      issuedAt: c.issuedAt,
      validUntil: c.validUntil,
      registry: c.registry,
      registryNumber: c.registryNumber,
      status: c.status,
      rejectReason: c.rejectReason,
      file: c.file ? { id: c.file.id, status: c.file.status, mimeType: c.file.mimeType } : null,
    })),
  };
}

/** GET /api/v1/me/pass – Qualifikations-Pass der angemeldeten Person. */
export const GET = api(async ({ who }) => {
  const userId = requireUserPrincipal(who);
  const pass = await getPass(userId);
  if (!pass) throw new ProblemError('notFound', 'Noch kein Qualifikations-Pass angelegt. Mit PUT anlegen.');
  return view(pass);
});

/** PUT /api/v1/me/pass – Stammdaten, Erfahrung, Sprachen setzen (Nachweise über die Web-App). */
export const PUT = api(async ({ req, who }) => {
  const userId = requireUserPrincipal(who);
  await upsertPass(userId, parseOrThrow(passInputSchema, await readJson(req)));
  const pass = await getPass(userId);
  if (!pass) throw new ProblemError('internal');
  return view(pass);
});
