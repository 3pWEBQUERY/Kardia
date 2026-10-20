import { NextResponse } from 'next/server';

import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

/** Health-Check für Railway (PRD 10.2): prüft die DB-Verbindung. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', db: 'ok', version: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'dev' });
  } catch {
    return NextResponse.json({ status: 'error', db: 'unreachable' }, { status: 503 });
  }
}
