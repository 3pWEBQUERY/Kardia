import { NextResponse } from 'next/server';

import { api, readJson, requireUserPrincipal } from '@/server/api';
import { createSavedSearch, listSavedSearches } from '@/server/services/savedSearches';

import type { SavedSearch } from '@kardia/db';

function savedSearchView(s: SavedSearch) {
  return { id: s.id, name: s.name, filters: s.filters, frequency: s.frequency, lastSentAt: s.lastSentAt };
}

/** GET /api/v1/me/saved-searches – Suchabos. */
export const GET = api(async ({ who }) => ({ data: (await listSavedSearches(requireUserPrincipal(who))).map(savedSearchView) }));

/** POST /api/v1/me/saved-searches – {"name","filters":SearchFilter,"frequency"} */
export const POST = api(async ({ req, who }) => {
  const created = await createSavedSearch(requireUserPrincipal(who), await readJson(req));
  return NextResponse.json(savedSearchView(created), { status: 201 });
});
