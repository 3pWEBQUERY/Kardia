import { db } from '../context.ts';

/** Empfänger auflösen: einzelne Person (nicht gelöscht) oder Owner/Recruiter einer Organisation – mit Sprache. */
export interface Recipient {
  userId: string;
  email: string;
  locale: string;
}

export async function userEmail(userId: string): Promise<string | null> {
  return (await userContact(userId))?.email ?? null;
}

export async function userContact(userId: string): Promise<Recipient | null> {
  const u = await db().user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, locale: true, deletedAt: true },
  });
  return u && !u.deletedAt ? { userId: u.id, email: u.email, locale: u.locale } : null;
}

/** Sprache einer Adresse ohne Konto-Bezug (z. B. Anmeldelink); unbekannt → null. */
export async function localeForEmail(email: string): Promise<string | null> {
  const u = await db().user.findUnique({ where: { email }, select: { locale: true } });
  return u?.locale ?? null;
}

export async function orgRecipients(orgId: string): Promise<Recipient[]> {
  const members = await db().orgMember.findMany({
    where: {
      organizationId: orgId,
      role: { in: ['OWNER', 'RECRUITER'] },
      user: { deletedAt: null },
    },
    include: { user: { select: { id: true, email: true, locale: true } } },
  });
  return members.map((m) => ({ userId: m.user.id, email: m.user.email, locale: m.user.locale }));
}
