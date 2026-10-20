import { api, requireUserPrincipal } from '@/server/api';
import { myShifts } from '@/server/services/pool';

type Shifts = Awaited<ReturnType<typeof myShifts>>;
type Shift = Shifts['open'][number];

function view(s: Shift) {
  return {
    id: s.id,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    code: s.code,
    hourlyRateChf: s.hourlyRateChf,
    requirements: s.requirements,
    status: s.status,
    interestSent: s.interests.length > 0,
    pool: { id: s.pool.id, name: s.pool.name, bookingMode: s.pool.bookingMode, cancelDeadlineHours: s.pool.cancelDeadlineHours, organization: s.pool.organization.name },
    ward: { id: s.ward.id, name: s.ward.name, street: s.ward.location.street, postalCode: s.ward.location.postalCode, city: s.ward.location.city },
  };
}

/** GET /api/v1/me/shifts – offene Schichten der eigenen Pools und gebuchte Schichten. */
export const GET = api(async ({ who }) => {
  const userId = requireUserPrincipal(who);
  const shifts = await myShifts(userId);
  return { open: shifts.open.map(view), booked: shifts.booked.map(view) };
});
