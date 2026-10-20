import { api, requireUserPrincipal } from '@/server/api';
import { myShiftsIcs } from '@/server/services/pool';

/** GET /api/v1/me/shifts.ics – Kalender-Export der gebuchten Schichten (RFC 5545). */
export const GET = api(async ({ who }) => {
  const userId = requireUserPrincipal(who);
  return new Response(await myShiftsIcs(userId), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="kardia-schichten.ics"',
      'Cache-Control': 'private, no-store',
    },
  });
});
