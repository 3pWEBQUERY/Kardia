import { createCipheriv, randomBytes } from 'node:crypto';
import { Transform, type TransformCallback } from 'node:stream';

/**
 * Nächtlicher, verschlüsselter `pg_dump` in den Bucket (PRD 10.2), Aufbewahrung 30 Tage.
 * Format der Datei: 4 Byte Magic "KDB1" | 12 Byte IV | Chiffrat (AES-256-GCM) | 16 Byte Tag.
 */
export const BACKUP_PREFIX = 'backup/';
export const BACKUP_MAGIC = Buffer.from('KDB1');

export function backupKey(date: Date): string {
  const iso = date.toISOString().replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z');
  return `${BACKUP_PREFIX}db-${iso}.dump.enc`;
}

export function dateFromBackupKey(key: string): Date | null {
  const m = /^backup\/db-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})Z\.dump\.enc$/.exec(key);
  if (!m) return null;
  return new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`);
}

export function isExpiredBackup(key: string, retentionDays: number, now = new Date()): boolean {
  const d = dateFromBackupKey(key);
  return d !== null && now.getTime() - d.getTime() > retentionDays * 86400_000;
}

/** Verschlüsselnder Stream: schreibt Magic + IV vorne und das Auth-Tag ans Ende. */
export function encryptingStream(key: Buffer): Transform {
  if (key.length !== 32) throw new Error('BACKUP_ENCRYPTION_KEY muss 32 Byte (base64) lang sein.');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  let headerSent = false;
  return new Transform({
    transform(chunk: Buffer, _enc, cb: TransformCallback) {
      if (!headerSent) {
        this.push(Buffer.concat([BACKUP_MAGIC, iv]));
        headerSent = true;
      }
      cb(null, cipher.update(chunk));
    },
    flush(cb: TransformCallback) {
      if (!headerSent) this.push(Buffer.concat([BACKUP_MAGIC, iv]));
      this.push(cipher.final());
      this.push(cipher.getAuthTag());
      cb();
    },
  });
}
