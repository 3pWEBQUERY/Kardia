import { api } from '@/server/api';
import { orgContextForApi } from '@/server/apiOrg';
import { db } from '@/server/db';

/**
 * GET /api/v1/org/applications?since=&cursor= – Bewerbungen für den ATS-Abgleich (Scope
 * applications:read). Nur Status und Pass-Status; Dokument-IDs nur bei Freigabe (AK-D1),
 * Registernummern nie.
 */
export const GET = api(async ({ req, who }) => {
  const ctx = await orgContextForApi(who, req, { scope: 'applications:read', permission: 'applications.read' });
  const sp = req.nextUrl.searchParams;
  const since = sp.get('since');
  const cursor = sp.get('cursor');
  const rows = await db.application.findMany({
    where: {
      job: { ward: { location: { organizationId: ctx.org.id } } },
      status: { not: 'WITHDRAWN' },
      ...(since && !Number.isNaN(Date.parse(since)) ? { statusChangedAt: { gte: new Date(since) } } : {}),
    },
    include: {
      job: { select: { id: true, title: true, externalRef: true } },
      candidate: { select: { firstName: true, lastName: true, profession: true, user: { select: { email: true } }, credentials: { select: { id: true, type: true, title: true, status: true, fileId: true } } } },
    },
    orderBy: { id: 'asc' },
    take: 101,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, 100);
  return {
    data: page.map((a) => ({
      id: a.id,
      status: a.status,
      rejectionReason: a.rejectionReason,
      createdAt: a.createdAt,
      statusChangedAt: a.statusChangedAt,
      message: a.message,
      documentsShared: a.documentsShared,
      job: a.job,
      candidate: {
        firstName: a.candidate.firstName,
        lastName: a.candidate.lastName,
        email: a.candidate.user.email,
        profession: a.candidate.profession,
        credentials: a.candidate.credentials.map((c) => ({ type: c.type, title: c.title, status: c.status, ...(a.documentsShared && c.fileId ? { fileId: c.fileId } : {}) })),
      },
    })),
    nextCursor: rows.length > 100 ? (page.at(-1)?.id ?? null) : null,
  };
});
