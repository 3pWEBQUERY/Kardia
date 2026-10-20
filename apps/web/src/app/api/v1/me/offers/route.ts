import { api, requireUserPrincipal } from '@/server/api';
import { listMyOffers } from '@/server/services/marketplace';

/** GET /api/v1/me/offers – Angebote an die Fachperson (Arbeitgeber identifiziert, Fachperson anonym). */
export const GET = api(async ({ who }) => {
  const userId = requireUserPrincipal(who);
  const offers = await listMyOffers(userId);
  const now = new Date();
  return {
    data: offers.map((o) => ({
      id: o.id,
      status: o.status === 'SENT' && o.expiresAt < now ? 'EXPIRED' : o.status,
      salaryChf: o.salaryChf,
      workloadPct: o.workloadPct,
      startDate: o.startDate,
      note: o.note,
      expiresAt: o.expiresAt,
      createdAt: o.createdAt,
      organization: o.organization,
      job: { id: o.job.id, title: o.job.title, ward: { id: o.job.ward.id, name: o.job.ward.name }, city: o.job.ward.location.city },
    })),
  };
});
