import 'server-only';

import {
  ProblemError,
  QUEUES,
  bucketKeyFor,
  parseOrThrow,
  uploadIssues,
  uploadRequestSchema,
  type UploadRequest,
} from '@kardia/core';

import { audit } from '../audit.ts';
import { db } from '../db.ts';
import { enqueue } from '../queue.ts';
import { signedDownloadUrl, signedUploadUrl } from '../storage.ts';

/**
 * Datei-Upload (PRD 10.3): signierte PUT-URL (10 min, Grössenlimit je Typ) → Upload
 * direkt in den Bucket → Worker prüft Magic Bytes, scannt mit ClamAV → READY.
 * Download nur über `authorizeDownload` mit signierter GET-URL (60 s).
 */
export async function createUpload(ownerId: string, input: UploadRequest) {
  const req = parseOrThrow(uploadRequestSchema, input);
  const issues = uploadIssues(req);
  if (issues.includes('tooLarge')) throw new ProblemError('validation', 'Die Datei ist zu gross für diesen Zweck.');
  if (issues.includes('mimeNotAllowed')) throw new ProblemError('validation', 'Dieser Dateityp ist hier nicht erlaubt.');
  const file = await db.file.create({
    data: { bucketKey: `pending/${crypto.randomUUID()}`, mimeType: req.mimeType, sizeBytes: req.sizeBytes, sha256: req.sha256, ownerId },
  });
  const key = bucketKeyFor(req.purpose, file.id, req.mimeType);
  await db.file.update({ where: { id: file.id }, data: { bucketKey: key } });
  const url = await signedUploadUrl(key, req.mimeType, req.sizeBytes, req.sha256);
  return { fileId: file.id, uploadUrl: url, headers: { 'Content-Type': req.mimeType, 'x-amz-checksum-sha256': Buffer.from(req.sha256, 'hex').toString('base64') } };
}

/** Client meldet "hochgeladen" → Prüfung im Worker. */
export async function completeUpload(ownerId: string, fileId: string) {
  const file = await db.file.findFirst({ where: { id: fileId, ownerId } });
  if (!file) throw new ProblemError('notFound');
  if (file.status !== 'UPLOADING') return file;
  const updated = await db.file.update({ where: { id: fileId }, data: { status: 'SCANNING' } });
  await enqueue(QUEUES.fileScan, { fileId }, { singletonKey: fileId });
  return updated;
}

/**
 * Berechtigung für den Download einer Datei:
 *  - eigene Datei; Admin (mit Audit-Log)
 *  - Arbeitgeber: Pass-Dokument nur, wenn die Fachperson es für eine Bewerbung an
 *    diese Organisation ausdrücklich freigegeben hat (AK-D1), mit Audit-Log
 *  - öffentlich: freigegebene Stationsvideos, Logos verifizierter Organisationen
 */
export async function authorizeDownload(fileId: string, viewer: { userId: string | null; isAdmin: boolean }) {
  const file = await db.file.findUnique({
    where: { id: fileId },
    include: {
      credential: { select: { candidateId: true, candidate: { select: { userId: true } } } },
      videoFile: { select: { moderation: true } },
      videoCaptions: { select: { moderation: true } },
      videoPoster: { select: { moderation: true } },
      orgLogo: { select: { verification: true } },
    },
  });
  if (file?.status !== 'READY') throw new ProblemError('notFound');
  const isPass = file.bucketKey.startsWith('pass/');
  const publicVideo = [file.videoFile, file.videoCaptions, file.videoPoster].some((v) => v?.moderation === 'APPROVED');
  if (publicVideo || file.orgLogo?.verification === 'VERIFIED') return signedDownloadUrl(file.bucketKey);
  if (!viewer.userId) throw new ProblemError('unauthorized');

  if (file.ownerId === viewer.userId) return signedDownloadUrl(file.bucketKey);
  if (viewer.isAdmin) {
    if (isPass) await audit({ actorId: viewer.userId, action: 'file.download', entity: 'File', entityId: file.id });
    return signedDownloadUrl(file.bucketKey);
  }
  if (isPass && file.credential) {
    const shared = await db.application.findFirst({
      where: {
        candidateId: file.credential.candidateId,
        documentsShared: true,
        job: { ward: { location: { organization: { members: { some: { userId: viewer.userId } } } } } },
      },
      select: { id: true },
    });
    if (shared) {
      await audit({ actorId: viewer.userId, action: 'file.download', entity: 'File', entityId: file.id, after: { applicationId: shared.id } });
      return signedDownloadUrl(file.bucketKey);
    }
  }
  throw new ProblemError('forbidden', 'Für dieses Dokument liegt keine Freigabe vor.');
}
