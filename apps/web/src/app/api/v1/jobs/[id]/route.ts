import { ProblemError } from '@kardia/core';

import { api } from '@/server/api';
import { jobView } from '@/server/apiViews';
import { getJobPublic } from '@/server/services/jobs';

/** GET /api/v1/jobs/:id – Stelle inkl. aufgelöstem Stationsprofil und Realitäts-Check (≥ 5 Stimmen). */
export const GET = api<{ id: string }>(async ({ params }) => {
  const view = await getJobPublic(params.id);
  if (!view) throw new ProblemError('notFound', 'Diese Stelle ist nicht (mehr) ausgeschrieben.');
  return jobView(view);
});
