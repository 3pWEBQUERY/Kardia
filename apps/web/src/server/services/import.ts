import 'server-only';

import { assertAiBudget, AiBudgetExceededError, MAX_IMPORT_CHARS } from '@kardia/ai';
import { ProblemError, QUEUES } from '@kardia/core';

import { db } from '../db.ts';
import { enqueue, jobState } from '../queue.ts';
import type { OrgContext } from '../session.ts';

/**
 * Inserat-Import (PRD 12.3, KI-1): Text, PDF oder URL → Worker → Prüfansicht. Die KI
 * läuft nie im Request-Pfad; die UI fragt den Job-Status ab. Kein Scraping fremder
 * Portale: URLs nur von Domains der eigenen Organisation.
 */
export async function startImport(ctx: OrgContext, input: { text?: string; url?: string; fileId?: string }) {
  try {
    await assertAiBudget(db, 'JOB_STRUCTURING', ctx.org.id);
  } catch (error) {
    if (error instanceof AiBudgetExceededError) throw new ProblemError('quotaExceeded', error.message);
    throw error;
  }
  if (input.url) {
    const host = new URL(input.url).hostname.toLowerCase();
    const org = await db.organization.findUniqueOrThrow({ where: { id: ctx.org.id } });
    const own = org.emailDomains.some((d) => host === d || host.endsWith(`.${d}`));
    if (!own) throw new ProblemError('forbidden', 'Kardia übernimmt nur Inserate von Websites Ihrer Organisation (kein Scraping fremder Portale).');
  }
  if (input.fileId) {
    const file = await db.file.findFirst({ where: { id: input.fileId, ownerId: ctx.user.id, bucketKey: { startsWith: 'import/' } } });
    if (!file) throw new ProblemError('notFound');
  }
  const text = input.text?.slice(0, MAX_IMPORT_CHARS);
  if (!text && !input.url && !input.fileId) throw new ProblemError('validation', 'Bitte Text einfügen, eine PDF-Datei wählen oder eine URL angeben.');
  const id = await enqueue(QUEUES.aiJobStructuring, { orgId: ctx.org.id, userId: ctx.user.id, text, url: input.url, fileId: input.fileId }, { retryLimit: 0 });
  if (!id) throw new ProblemError('upstream', 'Die Warteschlange ist nicht erreichbar.');
  return id;
}

export async function importStatus(ctx: OrgContext, id: string) {
  const state = await jobState(QUEUES.aiJobStructuring, id);
  if (!state) throw new ProblemError('notFound');
  const output = state.output as { orgId?: string } | null;
  if (output?.orgId && output.orgId !== ctx.org.id) throw new ProblemError('forbidden');
  return state;
}
