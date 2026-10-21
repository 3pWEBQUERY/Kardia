import { api, requireUserPrincipal } from '@/server/api';
import { deleteSavedSearch } from '@/server/services/savedSearches';

/** DELETE /api/v1/me/saved-searches/:id – Suchabo löschen. */
export const DELETE = api<{ id: string }>(async ({ params, who }) => {
  await deleteSavedSearch(requireUserPrincipal(who), params.id);
  return new Response(null, { status: 204 });
});
