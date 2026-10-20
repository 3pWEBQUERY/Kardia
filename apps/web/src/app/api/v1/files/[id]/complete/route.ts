import { api, requireUserPrincipal } from '@/server/api';
import { completeUpload } from '@/server/services/files';

/** POST /api/v1/files/:id/complete – Upload fertig → Prüfung (Magic Bytes, ClamAV) im Worker. */
export const POST = api<{ id: string }>(async ({ params, who }) => {
  const userId = requireUserPrincipal(who);
  const file = await completeUpload(userId, params.id);
  return { id: file.id, status: file.status };
});
