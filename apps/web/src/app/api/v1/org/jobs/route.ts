import { NextResponse } from 'next/server';

import { api, readJson } from '@/server/api';
import { orgContextForApi } from '@/server/apiOrg';
import { createJob } from '@/server/services/jobs';

/** POST /api/v1/org/jobs – Stelle als Entwurf anlegen (Scope jobs:write oder Mitglied mit jobs.edit). */
export const POST = api(async ({ req, who }) => {
  const ctx = await orgContextForApi(who, req, { scope: 'jobs:write', permission: 'jobs.edit' });
  const job = await createJob(ctx, await readJson(req));
  return NextResponse.json({ id: job.id, status: job.status, createdAt: job.createdAt }, { status: 201 });
});
