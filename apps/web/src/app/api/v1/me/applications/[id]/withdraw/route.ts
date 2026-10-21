import { api, requireUserPrincipal } from '@/server/api';
import { withdrawApplication } from '@/server/services/applications';

/** POST /api/v1/me/applications/:id/withdraw – Bewerbung zurückziehen. */
export const POST = api<{ id: string }>(async ({ params, who }) => {
  const app = await withdrawApplication(requireUserPrincipal(who), params.id);
  return { id: app.id, status: app.status, statusChangedAt: app.statusChangedAt };
});
