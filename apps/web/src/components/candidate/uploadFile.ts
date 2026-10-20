'use client';

import { finishUpload, requestUpload } from '@/app/actions/candidate';

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Upload direkt in den Bucket über eine signierte PUT-URL (PRD 10.3); danach prüft
 * der Worker Magic Bytes und ClamAV, erst dann ist die Datei verfügbar.
 */
export async function uploadPassFile(file: File, purpose: 'pass' | 'import' = 'pass'): Promise<{ ok: true; fileId: string } | { ok: false; error: string }> {
  const sha256 = await sha256Hex(file);
  const req = await requestUpload({ purpose, mimeType: file.type, sizeBytes: file.size, sha256 });
  if (!req.ok) return { ok: false, error: req.error.message };
  const put = await fetch(req.data.uploadUrl, { method: 'PUT', body: file, headers: req.data.headers });
  if (!put.ok) return { ok: false, error: 'upload' };
  const done = await finishUpload(req.data.fileId);
  if (!done.ok) return { ok: false, error: done.error.message };
  return { ok: true, fileId: req.data.fileId };
}
