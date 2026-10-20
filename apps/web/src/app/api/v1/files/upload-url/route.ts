import { NextResponse } from 'next/server';

import { parseOrThrow, uploadRequestSchema } from '@kardia/core';

import { api, readJson, requireUserPrincipal } from '@/server/api';
import { createUpload } from '@/server/services/files';

/** POST /api/v1/files/upload-url – signierte PUT-URL (10 min) für den privaten Bucket. */
export const POST = api(async ({ req, who }) => {
  const userId = requireUserPrincipal(who);
  const upload = await createUpload(userId, parseOrThrow(uploadRequestSchema, await readJson(req)));
  return NextResponse.json(upload, { status: 201 });
});
