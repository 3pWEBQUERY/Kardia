import { z } from 'zod';

import { ProblemError, parseOrThrow } from '@kardia/core';

import { api, readJson, requireUserPrincipal } from '@/server/api';
import { db } from '@/server/db';
import { deleteMyAccount } from '@/server/services/account';

/** DELETE /api/v1/me/account – Konto löschen; Bestätigung mit der eigenen E-Mail-Adresse {"confirmEmail"}. */
export const DELETE = api(async ({ req, who }) => {
  const userId = requireUserPrincipal(who);
  const { confirmEmail } = parseOrThrow(z.object({ confirmEmail: z.string() }), await readJson(req));
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    throw new ProblemError('validation', 'Zur Bestätigung bitte die eigene E-Mail-Adresse angeben.');
  }
  await deleteMyAccount(userId);
  return new Response(null, { status: 204 });
});
