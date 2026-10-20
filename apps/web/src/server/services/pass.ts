import 'server-only';

import {
  ProblemError,
  QUEUES,
  credentialEditResetsStatus,
  credentialInputSchema,
  parseOrThrow,
  passInputSchema,
  type CredentialInput,
  type PassInput,
} from '@kardia/core';
import { decryptOptional, encryptOptional } from '@kardia/core/crypto';

import { db } from '../db.ts';
import { enqueue } from '../queue.ts';

/** Qualifikations-Pass (Modul D). Telefon und Registernummer verschlüsselt (PRD 14.1). */

export async function getPass(userId: string) {
  const candidate = await db.candidateProfile.findUnique({
    where: { userId },
    include: {
      credentials: { orderBy: { createdAt: 'desc' }, include: { file: { select: { id: true, status: true, mimeType: true } } } },
      experiences: true,
      languages: true,
      trainingYears: true,
    },
  });
  if (!candidate) return null;
  // KI-Vorschlag aus der Dokument-Vorprüfung (KI-3): die Person bestätigt jedes Feld selbst (PRD 7.3).
  const prechecks = await db.event.findMany({
    where: { name: 'credential.precheck', entityId: { in: candidate.credentials.map((c) => c.id) } },
    orderBy: { createdAt: 'desc' },
  });
  return {
    ...candidate,
    phone: decryptOptional(candidate.phone),
    credentials: candidate.credentials.map((c) => ({
      ...c,
      registryNumber: decryptOptional(c.registryNumber),
      suggestion: suggestionFrom(prechecks.find((p) => p.entityId === c.id)?.props),
    })),
  };
}

export interface CredentialSuggestion {
  title: string | null;
  issuer: string | null;
  issuedAt: string | null;
}

function suggestionFrom(props: unknown): CredentialSuggestion | null {
  if (!props || typeof props !== 'object') return null;
  const p = props as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const issuedAt = str(p.issuedAt);
  const s = { title: str(p.title), issuer: str(p.issuer), issuedAt: issuedAt && /^\d{4}-\d{2}-\d{2}$/.test(issuedAt) ? issuedAt : null };
  return s.title || s.issuer || s.issuedAt ? s : null;
}

export async function upsertPass(userId: string, input: PassInput) {
  const data = parseOrThrow(passInputSchema, input);
  const base = {
    firstName: data.firstName,
    lastName: data.lastName,
    phone: encryptOptional(data.phone),
    profession: data.profession,
    yearsExperience: data.yearsExperience,
    workAuthorizedCh: data.workAuthorizedCh,
  };
  return db.$transaction(async (tx) => {
    const candidate = await tx.candidateProfile.upsert({ where: { userId }, create: { userId, ...base }, update: base });
    await tx.experience.deleteMany({ where: { candidateId: candidate.id } });
    await tx.languageSkill.deleteMany({ where: { candidateId: candidate.id } });
    if (data.experiences.length) {
      await tx.experience.createMany({ data: data.experiences.map((e) => ({ ...e, candidateId: candidate.id })) });
    }
    if (data.languages.length) {
      await tx.languageSkill.createMany({ data: data.languages.map((l) => ({ ...l, candidateId: candidate.id })) });
    }
    return candidate;
  });
}

async function candidateFor(userId: string) {
  const c = await db.candidateProfile.findUnique({ where: { userId } });
  if (!c) throw new ProblemError('conflict', 'Bitte zuerst den Qualifikations-Pass anlegen.');
  return c;
}

async function assertOwnFile(userId: string, fileId: string | null) {
  if (!fileId) return;
  const file = await db.file.findFirst({ where: { id: fileId, ownerId: userId, bucketKey: { startsWith: 'pass/' } } });
  if (!file) throw new ProblemError('validation', 'Die Datei gehört nicht zu Ihrem Konto.');
}

export async function addCredential(userId: string, input: CredentialInput) {
  const c = await candidateFor(userId);
  const data = parseOrThrow(credentialInputSchema, input);
  await assertOwnFile(userId, data.fileId);
  const created = await db.credential.create({
    data: {
      candidateId: c.id,
      type: data.type,
      title: data.title,
      issuer: data.issuer,
      issuedAt: data.issuedAt ? new Date(data.issuedAt) : null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      registry: data.registry,
      registryNumber: encryptOptional(data.registryNumber),
      fileId: data.fileId,
      status: 'SUBMITTED',
    },
  });
  if (created.fileId) await enqueue(QUEUES.aiDocumentPrecheck, { credentialId: created.id }, { startAfter: 60 });
  return created;
}

/** AK-D2: Änderung an verifizierten Feldern setzt den Status auf "eingereicht" zurück. */
export async function updateCredential(userId: string, credentialId: string, input: CredentialInput) {
  const c = await candidateFor(userId);
  const current = await db.credential.findFirst({ where: { id: credentialId, candidateId: c.id } });
  if (!current) throw new ProblemError('notFound');
  const data = parseOrThrow(credentialInputSchema, input);
  await assertOwnFile(userId, data.fileId);
  const reset = credentialEditResetsStatus(
    { ...current, registryNumber: decryptOptional(current.registryNumber) },
    { ...data, issuedAt: data.issuedAt },
  );
  return db.credential.update({
    where: { id: credentialId },
    data: {
      type: data.type,
      title: data.title,
      issuer: data.issuer,
      issuedAt: data.issuedAt ? new Date(data.issuedAt) : null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      registry: data.registry,
      registryNumber: encryptOptional(data.registryNumber),
      fileId: data.fileId,
      ...(reset ? { status: 'SUBMITTED', reviewedAt: null, reviewedById: null, rejectReason: null } : {}),
    },
  });
}

/** Pass-Dokumente werden sofort mit dem Nachweis gelöscht (PRD 14.1). */
export async function deleteCredential(userId: string, credentialId: string) {
  const c = await candidateFor(userId);
  const current = await db.credential.findFirst({ where: { id: credentialId, candidateId: c.id } });
  if (!current) throw new ProblemError('notFound');
  await db.credential.delete({ where: { id: credentialId } });
  if (current.fileId) await enqueue(QUEUES.retention, { deleteFileId: current.fileId });
}

export async function saveTrainingProgress(userId: string, rows: { specialtyTitle: string; area: string; yearsCompleted: number }[]) {
  const c = await candidateFor(userId);
  await db.$transaction([
    db.trainingProgress.deleteMany({ where: { candidateId: c.id } }),
    db.trainingProgress.createMany({ data: rows.map((r) => ({ ...r, candidateId: c.id })) }),
  ]);
}
