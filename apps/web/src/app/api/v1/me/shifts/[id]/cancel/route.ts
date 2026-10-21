import { api, requireUserPrincipal } from '@/server/api';
import { cancelShiftAsCandidate } from '@/server/services/pool';

/** POST /api/v1/me/shifts/:id/cancel – gebuchte Schicht absagen (bis zur Absagefrist des Pools). */
export const POST = api<{ id: string }>(async ({ params, who }) => {
  await cancelShiftAsCandidate(requireUserPrincipal(who), params.id);
  return { id: params.id, status: 'OPEN' as const };
});
