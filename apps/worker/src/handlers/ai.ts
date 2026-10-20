import {
  dbAiLogger,
  moderateText,
  NotEnoughTextsError,
  precheckDocument,
  structureJobAd,
  summarizeTeamComments,
  translateWardTexts,
  type JobStructuringResult,
} from '@kardia/ai';
import { REALITY_CHECK_MIN_VOTES } from '@kardia/core';


import { db, log } from '../context.ts';
import { fetchText } from '../lib/html.ts';
import { readObject } from '../lib/s3.ts';


/** KI-Funktionen laufen ausschliesslich im Worker (PRD 9.2). */

async function pdfText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

/**
 * KI-1 Inserat-Import: Text, URL (eigene Website) oder PDF aus `import/`. Das Ergebnis
 * ist die Ausgabe des pg-boss-Jobs; die Web-App fragt sie ab und zeigt die Prüfansicht.
 */
export async function handleJobStructuring(job: {
  orgId: string;
  userId: string;
  text?: string;
  url?: string;
  fileId?: string;
}): Promise<{ orgId: string; result: JobStructuringResult; sourceText: string }> {
  let text = job.text ?? '';
  if (!text && job.url) text = await fetchText(job.url);
  if (!text && job.fileId) {
    const file = await db().file.findFirst({ where: { id: job.fileId, ownerId: job.userId, status: 'READY', bucketKey: { startsWith: 'import/' } } });
    if (!file) throw new Error('Importdatei nicht gefunden oder noch nicht geprüft.');
    const buf = await readObject(file.bucketKey);
    text = file.mimeType === 'application/pdf' ? await pdfText(buf) : buf.toString('utf8');
  }
  if (text.trim().length < 40) throw new Error('Zu wenig Text für einen Import.');
  const result = await structureJobAd({ text, orgId: job.orgId, logger: dbAiLogger(db()) });
  return { orgId: job.orgId, result, sourceText: text.slice(0, 20_000) };
}

/**
 * KI-3 Dokument-Vorprüfung: nur Datei + Felder dieses Nachweises (PRD 9.4). Ergebnis
 * als Ereignis `credential.precheck` für die Prüfqueue; Entscheid bleibt beim Admin.
 */
export async function handleDocumentPrecheck(job: { credentialId: string }): Promise<{ stored: boolean }> {
  const cred = await db().credential.findUnique({
    where: { id: job.credentialId },
    include: { file: true, candidate: { select: { firstName: true, lastName: true } } },
  });
  if (!cred?.file) return { stored: false };
  if (cred.file.status !== 'READY') throw new Error('Datei noch nicht geprüft – später erneut.');
  const mime = cred.file.mimeType;
  if (mime !== 'application/pdf' && mime !== 'image/jpeg' && mime !== 'image/png') return { stored: false };
  const buf = await readObject(cred.file.bucketKey);
  const result = await precheckDocument({
    file: { base64: buf.toString('base64'), mimeType: mime },
    claimed: {
      type: cred.type,
      title: cred.title,
      issuer: cred.issuer,
      issuedAt: cred.issuedAt ? cred.issuedAt.toISOString().slice(0, 10) : null,
      holderName: `${cred.candidate.firstName} ${cred.candidate.lastName}`,
    },
    logger: dbAiLogger(db()),
  });
  await db().event.create({ data: { name: 'credential.precheck', entityId: cred.id, props: result } });
  return { stored: true };
}

async function orgOfWard(wardId: string): Promise<string | null> {
  const ward = await db().ward.findUnique({ where: { id: wardId }, select: { location: { select: { organizationId: true } } } });
  return ward?.location.organizationId ?? null;
}

/** KI-4 Moderation: alles ausser "ok" geht an einen Admin (Ereignis `moderation.flag`). */
export async function handleModeration(job: { entity: 'TeamQuestion' | 'RealityCheck'; entityId: string }): Promise<{ category: string }> {
  let text: string | null = null;
  let wardId: string | null = null;
  if (job.entity === 'TeamQuestion') {
    const q = await db().teamQuestion.findUnique({ where: { id: job.entityId } });
    if (!q) return { category: 'missing' };
    text = q.answer ? `Frage: ${q.body}\nAntwort: ${q.answer}` : q.body;
    wardId = q.wardId;
  } else {
    const r = await db().realityCheck.findUnique({ where: { id: job.entityId } });
    if (!r?.comment) return { category: 'empty' };
    text = r.comment;
    wardId = r.wardId;
  }
  const result = await moderateText({ text, logger: dbAiLogger(db()), orgId: await orgOfWard(wardId) });
  if (result.category === 'ok') {
    if (job.entity === 'TeamQuestion') {
      await db().teamQuestion.updateMany({ where: { id: job.entityId, moderation: 'PENDING' }, data: { moderation: 'APPROVED' } });
    }
  } else {
    await db().event.create({
      data: { name: 'moderation.flag', entityId: job.entityId, props: { entity: job.entity, category: result.category, reason: result.reason } },
    });
  }
  return { category: result.category };
}

/** KI-5 Team-Zusammenfassung: erst ab 5 Freitexten, ohne gemeldete Kommentare. */
export async function handleTeamSummary(job: { wardId: string; field: string }): Promise<{ summary: string | null }> {
  const rows = await db().realityCheck.findMany({ where: { wardId: job.wardId, field: job.field, comment: { not: null } }, select: { id: true, comment: true } });
  const flagged = new Set(
    (await db().event.findMany({ where: { name: 'moderation.flag', entityId: { in: rows.map((r) => r.id) } }, select: { entityId: true } })).map((e) => e.entityId),
  );
  const comments = rows.filter((r) => !flagged.has(r.id)).map((r) => r.comment ?? '');
  if (comments.length < REALITY_CHECK_MIN_VOTES) return { summary: null };
  try {
    const summary = await summarizeTeamComments({ field: job.field, comments, logger: dbAiLogger(db()), orgId: await orgOfWard(job.wardId) });
    await db().event.create({ data: { name: 'team.summary', entityId: `${job.wardId}:${job.field}`, props: { summary, basedOn: comments.length } } });
    return { summary };
  } catch (error) {
    if (error instanceof NotEnoughTextsError) return { summary: null };
    throw error;
  }
}

/** KI-6 Übersetzung der Freitexte; der Arbeitgeber kann jede Übersetzung bearbeiten. */
export async function handleTranslation(job: { wardId: string }): Promise<{ translated: boolean }> {
  const ward = await db().ward.findUnique({ where: { id: job.wardId }, select: { description: true, location: { select: { organizationId: true } } } });
  if (!ward?.description) return { translated: false };
  const translations = await translateWardTexts({ fields: { description: ward.description }, orgId: ward.location.organizationId, logger: dbAiLogger(db()) });
  await db().ward.update({ where: { id: job.wardId }, data: { translations: translations } });
  log.info('Übersetzung gespeichert', { wardId: job.wardId });
  return { translated: true };
}
