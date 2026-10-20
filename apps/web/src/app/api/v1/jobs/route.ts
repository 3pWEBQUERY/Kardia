import { decodeFilter } from '@kardia/core';

import { api } from '@/server/api';
import { hitView } from '@/server/apiViews';
import { searchJobs } from '@/server/services/search';

/** GET /api/v1/jobs?f=<base64url-Filter>&cursor=&limit= – Suche, Cursor-Paginierung. */
export const GET = api(async ({ req }) => {
  const sp = req.nextUrl.searchParams;
  const filter = decodeFilter(sp.get('f'));
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 20) || 20));
  const result = await searchJobs(filter, { cursor: sp.get('cursor'), limit });
  return {
    data: result.hits.map(hitView),
    total: result.total,
    nextCursor: result.nextCursor,
    suggestion: result.suggestion,
  };
});
