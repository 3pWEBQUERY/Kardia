import 'server-only';

import { z } from 'zod';

import { ProblemError, parseOrThrow } from '@kardia/core';

import { audit } from '../audit.ts';
import { db } from '../db.ts';

import { deleteMyAccount, exportMyData } from './account.ts';

import type { CurrentSession } from '../session.ts';

/**
 * Betroffenenanfragen (revDSG Art. 25/32: Auskunft innert 30 Tagen, Löschung): Admin
 * sucht die Person per E-Mail, erstellt den gleichen JSON-Export wie die Selbstauskunft
 * und löscht das Konto mit derselben Logik wie die Selbstlöschung. Alles im Audit-Log.
 */

export interface DataSubject {
  id: string;
  email: string;
  createdAt: Date;
  lastActiveAt: Date;
  deletedAt: Date | null;
  isAdmin: boolean;
  candidate: { applications: number; credentials: number } | null;
  memberships: { organization: string; role: string }[];
}

export async function findDataSubject(s: CurrentSession, email: string): Promise<DataSubject | null> {
  const parsed = parseOrThrow(z.object({ email: z.email() }), { email: email.trim().toLowerCase() });
  const user = await db.user.findUnique({
    where: { email: parsed.email },
    select: {
      id: true,
      email: true,
      createdAt: true,
      lastActiveAt: true,
      deletedAt: true,
      isAdmin: true,
      candidate: { select: { _count: { select: { applications: true, credentials: true } } } },
      memberships: { select: { role: true, organization: { select: { name: true } } } },
    },
  });
  // Auch die Suche selbst ist Zugriff auf Personendaten.
  await audit({ actorId: s.user.id, action: 'privacy.lookup', entity: 'User', entityId: user?.id ?? 'none', after: { found: !!user } });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    lastActiveAt: user.lastActiveAt,
    deletedAt: user.deletedAt,
    isAdmin: user.isAdmin,
    candidate: user.candidate ? { applications: user.candidate._count.applications, credentials: user.candidate._count.credentials } : null,
    memberships: user.memberships.map((m) => ({ organization: m.organization.name, role: m.role })),
  };
}

export async function exportDataSubject(s: CurrentSession, userId: string) {
  const data = await exportMyData(userId);
  await audit({ actorId: s.user.id, action: 'privacy.export', entity: 'User', entityId: userId });
  return data;
}

export async function deleteDataSubject(s: CurrentSession, userId: string, confirmEmail: string): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, isAdmin: true, deletedAt: true } });
  if (!user || user.deletedAt) throw new ProblemError('notFound');
  if (user.isAdmin || userId === s.user.id) throw new ProblemError('forbidden', 'Admin-Konten werden nicht über die Betroffenenanfrage gelöscht.');
  if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    throw new ProblemError('validation', 'Zur Bestätigung die E-Mail-Adresse der Person eingeben.');
  }
  await deleteMyAccount(userId);
  await audit({ actorId: s.user.id, action: 'privacy.delete', entity: 'User', entityId: userId });
}
