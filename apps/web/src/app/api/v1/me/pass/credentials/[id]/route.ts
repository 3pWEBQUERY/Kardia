import { credentialInputSchema, parseOrThrow } from '@kardia/core';

import { api, readJson, requireUserPrincipal } from '@/server/api';
import { deleteCredential, updateCredential } from '@/server/services/pass';

import { credentialView } from '../view.ts';

/** PUT /api/v1/me/pass/credentials/:id – Nachweis ändern (AK-D2: verifizierte Angaben setzen den Status zurück). */
export const PUT = api<{ id: string }>(async ({ req, params, who }) => {
  const userId = requireUserPrincipal(who);
  return credentialView(await updateCredential(userId, params.id, parseOrThrow(credentialInputSchema, await readJson(req))));
});

/** DELETE /api/v1/me/pass/credentials/:id – Nachweis samt Dokument löschen. */
export const DELETE = api<{ id: string }>(async ({ params, who }) => {
  await deleteCredential(requireUserPrincipal(who), params.id);
  return new Response(null, { status: 204 });
});
