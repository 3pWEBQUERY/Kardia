import { NextResponse } from 'next/server';

import { api, readJson, requireUserPrincipal } from '@/server/api';
import { getMyApplication, markMessagesRead, postMessage } from '@/server/services/applications';

/** GET /api/v1/me/applications/:id/messages – Chat-Verlauf; markiert Nachrichten des Arbeitgebers als gelesen. */
export const GET = api<{ id: string }>(async ({ params, who }) => {
  const userId = requireUserPrincipal(who);
  const app = await getMyApplication(userId, params.id);
  await markMessagesRead(app.id, userId);
  return { data: app.messages.map((m) => ({ id: m.id, body: m.body, mine: m.mine, createdAt: m.createdAt, readAt: m.readAt })) };
});

/** POST /api/v1/me/applications/:id/messages – {"body": "…"} */
export const POST = api<{ id: string }>(async ({ req, params, who }) => {
  const userId = requireUserPrincipal(who);
  const body = (await readJson(req)) as { body?: unknown };
  const msg = await postMessage({ userId }, params.id, { body: typeof body.body === 'string' ? body.body : '' });
  return NextResponse.json({ id: msg.id, body: msg.body, mine: true, createdAt: msg.createdAt, readAt: null }, { status: 201 });
});
