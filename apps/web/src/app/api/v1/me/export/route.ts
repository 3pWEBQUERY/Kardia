import { NextResponse } from 'next/server';

import { api, requireUserPrincipal } from '@/server/api';
import { audit } from '@/server/audit';
import { exportMyData } from '@/server/services/account';

/** GET /api/v1/me/export – alle eigenen Daten als JSON (revDSG Art. 25/28, PRD 14.1). */
export const GET = api(async ({ who }) => {
  const userId = requireUserPrincipal(who);
  const data = await exportMyData(userId);
  await audit({ actorId: userId, action: 'account.export', entity: 'User', entityId: userId });
  return NextResponse.json(data, { headers: { 'Content-Disposition': 'attachment; filename="kardia-export.json"' } });
});
