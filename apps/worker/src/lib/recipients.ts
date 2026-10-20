import { db } from '../context.ts';

/** Empfänger auflösen: einzelne Person (nicht gelöscht) oder Owner/Recruiter einer Organisation. */
export async function userEmail(userId: string): Promise<string | null> {
  const u = await db().user.findUnique({ where: { id: userId }, select: { email: true, deletedAt: true } });
  return u && !u.deletedAt ? u.email : null;
}

export async function orgRecipients(orgId: string): Promise<{ userId: string; email: string }[]> {
  const members = await db().orgMember.findMany({
    where: { organizationId: orgId, role: { in: ['OWNER', 'RECRUITER'] }, user: { deletedAt: null } },
    include: { user: { select: { id: true, email: true } } },
  });
  return members.map((m) => ({ userId: m.user.id, email: m.user.email }));
}
