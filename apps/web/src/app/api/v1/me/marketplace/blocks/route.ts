import { z } from 'zod';

import { parseOrThrow } from '@kardia/core';

import { api, readJson, requireUserPrincipal } from '@/server/api';
import { getMarketplaceProfile, setBlocks } from '@/server/services/marketplace';

/** PUT /api/v1/me/marketplace/blocks – Sperrliste ersetzen {"organizationIds": [...]}. */
export const PUT = api(async ({ req, who }) => {
  const userId = requireUserPrincipal(who);
  const { organizationIds } = parseOrThrow(z.object({ organizationIds: z.array(z.string()).max(200) }), await readJson(req));
  await setBlocks(userId, organizationIds);
  return { blockedOrganizationIds: (await getMarketplaceProfile(userId)).blockedOrganizationIds };
});
