import { ProblemError } from '@kardia/core';

import { api, requireUserPrincipal } from '@/server/api';
import { db } from '@/server/db';

/**
 * Merken per REST (PUT = merken, DELETE = entfernen). Idempotent, damit der Service
 * Worker offline vorgemerkte Anfragen später nachreichen kann (Hintergrund-Sync, PRD 13.2).
 */
async function candidateId(userId: string): Promise<string> {
  const c = await db.candidateProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!c) throw new ProblemError('conflict', 'Bitte zuerst den Qualifikations-Pass anlegen.');
  return c.id;
}

export const PUT = api<{ jobId: string }>(async ({ params, who }) => {
  const cid = await candidateId(requireUserPrincipal(who));
  await db.savedJob.upsert({ where: { candidateId_jobId: { candidateId: cid, jobId: params.jobId } }, create: { candidateId: cid, jobId: params.jobId }, update: {} });
  return { saved: true };
});

export const DELETE = api<{ jobId: string }>(async ({ params, who }) => {
  const cid = await candidateId(requireUserPrincipal(who));
  await db.savedJob.deleteMany({ where: { candidateId: cid, jobId: params.jobId } });
  return { saved: false };
});
