import { offerResponseSchema, parseOrThrow } from '@kardia/core';

import { api, readJson, requireUserPrincipal } from '@/server/api';
import { respondOffer } from '@/server/services/marketplace';

/** POST /api/v1/me/offers/:id/respond – {"action":"interested"} oder {"action":"decline","reason"?}. */
export const POST = api<{ id: string }>(async ({ req, params, who }) => {
  const userId = requireUserPrincipal(who);
  return respondOffer(userId, params.id, parseOrThrow(offerResponseSchema, await readJson(req)));
});
