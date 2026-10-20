import { ProblemError } from '@kardia/core';

import { api } from '@/server/api';
import { wardView } from '@/server/apiViews';
import { getWardPublic } from '@/server/services/wards';

/** GET /api/v1/wards/:id – Stationsprofil, Dienstrhythmus, Benchmarks (ab 8 Vergleichsstationen). */
export const GET = api<{ id: string }>(async ({ params }) => {
  const view = await getWardPublic(params.id);
  if (!view) throw new ProblemError('notFound', 'Station nicht gefunden.');
  return wardView(view);
});
