import { api, requireUserPrincipal } from '@/server/api';
import { listSavedJobs } from '@/server/services/savedSearches';

/** GET /api/v1/me/saved – gemerkte Stellen (Merken/Entfernen über PUT/DELETE /me/saved/:jobId). */
export const GET = api(async ({ who }) => {
  const saved = await listSavedJobs(requireUserPrincipal(who));
  return {
    data: saved.map((s) => ({
      savedAt: s.createdAt,
      job: {
        id: s.job.id,
        title: s.job.title,
        status: s.job.status,
        ward: { id: s.job.ward.id, name: s.job.ward.name },
        organization: s.job.ward.location.organization,
        city: s.job.ward.location.city,
      },
    })),
  };
});
