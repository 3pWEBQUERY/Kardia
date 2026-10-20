import { NextResponse } from 'next/server';

import { api } from '@/server/api';
import { db } from '@/server/db';
import { authorizeDownload } from '@/server/services/files';

/**
 * Datei-Download (PRD 10.3): Berechtigung prüfen, dann Weiterleitung auf eine signierte
 * GET-URL mit 60 s Gültigkeit. Zugriffe auf `pass/` protokolliert der Service im Audit-Log.
 */
export const GET = api<{ id: string }>(async ({ params, who }) => {
  const user = who.userId ? await db.user.findUnique({ where: { id: who.userId }, select: { isAdmin: true } }) : null;
  const url = await authorizeDownload(params.id, { userId: who.userId, isAdmin: !!user?.isAdmin });
  return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
});
