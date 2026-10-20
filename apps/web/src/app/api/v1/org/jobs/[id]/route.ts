import { api, readJson } from '@/server/api';
import { orgContextForApi } from '@/server/apiOrg';
import { updateJob } from '@/server/services/jobs';

/**
 * PATCH /api/v1/org/jobs/:id – Stelle ändern; `status: "PUBLISHED"` veröffentlicht nur ohne
 * Blocker (AK-A1, AK-C1), sonst 422 `publishBlocked` mit `errors[]`.
 */
export const PATCH = api<{ id: string }>(async ({ req, params, who }) => {
  const ctx = await orgContextForApi(who, req, { scope: 'jobs:write', permission: 'jobs.edit' });
  const job = await updateJob(ctx, params.id, await readJson(req));
  return { id: job.id, status: job.status, publishedAt: job.publishedAt, updatedAt: job.updatedAt };
});
