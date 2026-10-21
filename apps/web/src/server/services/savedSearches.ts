import 'server-only';

import { ProblemError, parseOrThrow, savedSearchInputSchema } from '@kardia/core';

import { db } from '../db.ts';

/** Suchabos und Merkliste der Fachperson (Web-App und REST-API, PRD 13.4). */

async function candidateId(userId: string): Promise<string> {
  const c = await db.candidateProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!c) throw new ProblemError('conflict', 'Bitte zuerst den Qualifikations-Pass anlegen.');
  return c.id;
}

export async function listSavedSearches(userId: string) {
  return db.savedSearch.findMany({ where: { candidate: { userId } }, orderBy: { name: 'asc' } });
}

export async function createSavedSearch(userId: string, input: unknown) {
  const data = parseOrThrow(savedSearchInputSchema, input);
  return db.savedSearch.create({ data: { candidateId: await candidateId(userId), name: data.name, filters: data.filters, frequency: data.frequency, channel: data.channel } });
}

export async function deleteSavedSearch(userId: string, id: string): Promise<void> {
  const res = await db.savedSearch.deleteMany({ where: { id, candidate: { userId } } });
  if (res.count === 0) throw new ProblemError('notFound');
}

export async function listSavedJobs(userId: string) {
  return db.savedJob.findMany({
    where: { candidate: { userId } },
    include: { job: { include: { ward: { include: { location: { include: { organization: { select: { id: true, name: true } } } } } } } } },
    orderBy: { createdAt: 'desc' },
  });
}
