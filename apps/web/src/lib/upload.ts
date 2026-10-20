'use client';

import { finishUpload, requestUpload } from '@/app/actions/candidate';

export type UploadPurpose = 'pass' | 'import' | 'video' | 'captions' | 'logo';

export type UploadError = 'tooLarge' | 'type' | 'failed' | 'rejected';

export class UploadFailure extends Error {
  constructor(
    readonly reason: UploadError,
    message?: string,
  ) {
    super(message ?? reason);
    this.name = 'UploadFailure';
  }
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Dateityp aus Endung, falls der Browser keinen liefert (z. B. .vtt, .mov). */
function mimeOf(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = { vtt: 'text/vtt', mov: 'video/quicktime', mp4: 'video/mp4', pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', txt: 'text/plain' };
  return (ext && map[ext]) || 'application/octet-stream';
}

/**
 * Upload in den privaten Bucket (PRD 10.3): SHA-256 im Browser berechnen, signierte
 * PUT-URL anfordern (10 min gültig), direkt hochladen, dann "fertig" melden – der
 * Worker prüft Magic Bytes und scannt, bevor die Datei verfügbar ist.
 */
export async function uploadFile(file: File, purpose: UploadPurpose): Promise<{ fileId: string }> {
  const mimeType = mimeOf(file);
  const sha256 = await sha256Hex(file);
  const req = await requestUpload({ purpose, mimeType, sizeBytes: file.size, sha256 });
  if (!req.ok) {
    const m = req.error.message;
    if (/gross/i.test(m)) throw new UploadFailure('tooLarge', m);
    if (/Dateityp/i.test(m)) throw new UploadFailure('type', m);
    throw new UploadFailure('rejected', m);
  }
  const put = await fetch(req.data.uploadUrl, { method: 'PUT', headers: req.data.headers, body: file });
  if (!put.ok) throw new UploadFailure('failed');
  const done = await finishUpload(req.data.fileId);
  if (!done.ok) throw new UploadFailure('failed', done.error.message);
  return { fileId: req.data.fileId };
}
