import { api, requireUserPrincipal } from '@/server/api';
import { listMyApplications } from '@/server/services/applications';

/** GET /api/v1/me/applications – eigene Bewerbungen mit Status. */
export const GET = api(async ({ who }) => {
  const userId = requireUserPrincipal(who);
  const apps = await listMyApplications(userId);
  return {
    data: apps.map((a) => ({
      id: a.id,
      status: a.status,
      rejectionReason: a.rejectionReason,
      documentsShared: a.documentsShared,
      createdAt: a.createdAt,
      statusChangedAt: a.statusChangedAt,
      messages: a._count.messages,
      job: { id: a.job.id, title: a.job.title, ward: a.job.ward.name, organization: a.job.ward.location.organization.name, city: a.job.ward.location.city },
    })),
  };
});
