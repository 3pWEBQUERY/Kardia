import { NextResponse } from 'next/server';

/** Universal Links ab R1, zunächst ohne App-IDs (PRD 13.4). */
export function GET() {
  const appIds = (process.env.APPLE_APP_IDS ?? '').split(',').filter(Boolean);
  return NextResponse.json({
    applinks: { details: [{ appIDs: appIds, components: [{ '/': '/jobs/*' }, { '/': '/wards/*' }, { '/': '/offers/*' }] }] },
    webcredentials: { apps: appIds },
  });
}
