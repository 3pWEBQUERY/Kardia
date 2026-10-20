import { createHash } from 'node:crypto';

import { mimeCompatible, sniffMime, UPLOAD_PURPOSES } from '@kardia/core';

import { db, log } from '../context.ts';
import { config } from '../env.ts';
import { scanStream } from '../lib/clamav.ts';
import { deleteObject, headObject, readHead, readObject, readStream } from '../lib/s3.ts';

/**
 * Datei-Prüfung (PRD 10.3): Grösse und SHA-256 gegen die Angaben, MIME per Magic
 * Bytes, ClamAV-Scan – erst dann READY. Abgelehnte Dateien werden sofort gelöscht.
 */
export async function handleFileScan(job: { fileId: string }): Promise<{ status: string; reason?: string }> {
  const file = await db().file.findUnique({ where: { id: job.fileId } });
  if (!file || file.status === 'READY' || file.status === 'REJECTED') return { status: file?.status ?? 'missing' };

  const reject = async (reason: string) => {
    await db().file.update({ where: { id: file.id }, data: { status: 'REJECTED' } });
    await deleteObject(file.bucketKey).catch(() => undefined);
    log.warn('Datei abgelehnt', { fileId: file.id, reason });
    return { status: 'REJECTED', reason };
  };

  let head;
  try {
    head = await headObject(file.bucketKey);
  } catch {
    return reject('nicht hochgeladen');
  }
  if (head.ContentLength !== file.sizeBytes) return reject('Grösse weicht ab');
  const maxBytes = Math.max(...Object.values(UPLOAD_PURPOSES).map((p) => p.maxBytes));
  if (file.sizeBytes > maxBytes) return reject('zu gross');

  const sniffed = sniffMime(await readHead(file.bucketKey));
  if (!mimeCompatible(file.mimeType, sniffed)) return reject(`Typ ${sniffed ?? 'unbekannt'} statt ${file.mimeType}`);

  // SHA-256: vom Bucket geprüfte Prüfsumme nutzen, sonst selbst berechnen (kleine Dateien).
  const expected = Buffer.from(file.sha256, 'hex').toString('base64');
  if (head.ChecksumSHA256) {
    if (head.ChecksumSHA256 !== expected) return reject('Prüfsumme weicht ab');
  } else if (file.sizeBytes <= 20 * 1024 * 1024) {
    const actual = createHash('sha256').update(await readObject(file.bucketKey)).digest('hex');
    if (actual !== file.sha256) return reject('Prüfsumme weicht ab');
  }

  if (config.clamav.host) {
    const result = await scanStream(await readStream(file.bucketKey), config.clamav.host, config.clamav.port);
    if ('error' in result) throw new Error(`Virenscan fehlgeschlagen: ${result.error}`);
    if (!result.clean) return reject(`Virus: ${result.signature}`);
  } else if (config.isProduction) {
    throw new Error('CLAMAV_HOST ist nicht gesetzt – ohne Scan wird keine Datei freigegeben.');
  } else {
    log.warn('ClamAV nicht konfiguriert – Scan in der Entwicklung übersprungen', { fileId: file.id });
  }

  await db().file.update({ where: { id: file.id }, data: { status: 'READY' } });
  return { status: 'READY' };
}
