import { api, readJson, requireUserPrincipal } from '@/server/api';
import { getMarketplaceProfile, updateMarketplaceProfile } from '@/server/services/marketplace';

/** GET /api/v1/me/marketplace – eigenes Marktplatz-Profil (Sichtbarkeit, Wunschpensum, Muss-Bedingungen). */
export const GET = api(async ({ who }) => getMarketplaceProfile(requireUserPrincipal(who)));

/** PUT /api/v1/me/marketplace – Profil setzen. */
export const PUT = api(async ({ req, who }) => {
  const userId = requireUserPrincipal(who);
  await updateMarketplaceProfile(userId, await readJson(req));
  return getMarketplaceProfile(userId);
});
