import { api, requireUserPrincipal } from '@/server/api';
import { bookShift } from '@/server/services/pool';

/** POST /api/v1/shifts/:id/book – bedingtes UPDATE; 409 `shiftTaken`, wenn bereits vergeben (AK-C2). */
export const POST = api<{ id: string }>(async ({ params, who }) => {
  const userId = requireUserPrincipal(who);
  return bookShift(userId, params.id);
});
