import { z } from 'zod';

import { parseOrThrow, pushSubscriptionSchema } from '@kardia/core';

import { api, readJson, requireUserPrincipal } from '@/server/api';
import { removePushSubscription, savePushSubscription } from '@/server/services/account';

/** POST /api/v1/me/push-subscriptions – Web-Push-Abo (PushSubscription.toJSON()) speichern. */
export const POST = api(async ({ req, who }) => {
  await savePushSubscription(requireUserPrincipal(who), parseOrThrow(pushSubscriptionSchema, await readJson(req)));
  return new Response(null, { status: 204 });
});

/** DELETE /api/v1/me/push-subscriptions – {"endpoint": "…"} */
export const DELETE = api(async ({ req, who }) => {
  const { endpoint } = parseOrThrow(z.object({ endpoint: z.url() }), await readJson(req));
  await removePushSubscription(requireUserPrincipal(who), endpoint);
  return new Response(null, { status: 204 });
});
