import { NextResponse } from 'next/server';

import { applicationInputSchema, parseOrThrow } from '@kardia/core';

import { api, readJson, requireUserPrincipal } from '@/server/api';
import { apply } from '@/server/services/applications';

/** POST /api/v1/applications – Ein-Klick-Bewerbung (Pass + optional 500 Zeichen). */
export const POST = api(async ({ req, who }) => {
  const userId = requireUserPrincipal(who);
  const input = parseOrThrow(applicationInputSchema, await readJson(req));
  const app = await apply(userId, input);
  return NextResponse.json({ id: app.id, status: app.status, createdAt: app.createdAt }, { status: 201 });
});
