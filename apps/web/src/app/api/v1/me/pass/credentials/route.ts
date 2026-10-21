import { NextResponse } from 'next/server';

import { credentialInputSchema, parseOrThrow } from '@kardia/core';

import { api, readJson, requireUserPrincipal } from '@/server/api';
import { addCredential } from '@/server/services/pass';

import { credentialView } from './view.ts';

/**
 * POST /api/v1/me/pass/credentials – Nachweis anlegen. Dokument vorher über
 * /files/upload-url (purpose "pass") hochladen und `fileId` mitgeben.
 */
export const POST = api(async ({ req, who }) => {
  const userId = requireUserPrincipal(who);
  const created = await addCredential(userId, parseOrThrow(credentialInputSchema, await readJson(req)));
  return NextResponse.json(credentialView(created), { status: 201 });
});
