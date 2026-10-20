import { spawn } from 'node:child_process';
import { createWriteStream, createReadStream  } from 'node:fs';
import { rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';

import { RETENTION } from '@kardia/core';

import { log } from '../context.ts';
import { config } from '../env.ts';
import { BACKUP_PREFIX, backupKey, encryptingStream, isExpiredBackup } from '../lib/backup.ts';
import { copyToReplica, deleteObject, listKeys, putObject } from '../lib/s3.ts';

/**
 * Nächtlicher verschlüsselter `pg_dump` in den Bucket (zusätzlich zu den täglichen
 * Railway-Backups, PRD 10.2), Aufbewahrung 30 Tage rollierend. RPO 24 h.
 */
export async function handleBackup(now = new Date()): Promise<{ key: string; bytes: number; deleted: number }> {
  if (!config.databaseUrl) throw new Error('DATABASE_URL fehlt.');
  if (!config.backupKey) throw new Error('BACKUP_ENCRYPTION_KEY fehlt – unverschlüsselte Backups sind nicht erlaubt.');
  const key = backupKey(now);
  const tmp = join(tmpdir(), `kardia-backup-${process.pid}-${now.getTime()}.enc`);
  try {
    const dump = spawn('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', config.databaseUrl], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    dump.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
    const exited = new Promise<number>((resolve) => dump.on('close', (code) => resolve(code ?? 1)));
    await pipeline(dump.stdout, encryptingStream(Buffer.from(config.backupKey, 'base64')), createWriteStream(tmp));
    const code = await exited;
    if (code !== 0) throw new Error(`pg_dump beendet mit ${code}: ${stderr.slice(0, 500)}`);
    const { size } = await stat(tmp);
    await putObject(key, createReadStream(tmp), 'application/octet-stream', size);
    let deleted = 0;
    for (const obj of await listKeys(BACKUP_PREFIX)) {
      if (isExpiredBackup(obj.key, RETENTION.backupDays, now)) {
        await deleteObject(obj.key);
        deleted++;
      }
    }
    log.info('Backup erstellt', { key, bytes: size, deleted });
    return { key, bytes: size, deleted };
  } finally {
    await rm(tmp, { force: true });
  }
}

/**
 * Railway Buckets haben keine automatischen Backups oder Snapshots: `pass/` und
 * `backup/` werden nächtlich in einen zweiten Bucket kopiert (PRD 10.2).
 */
export async function handleBucketReplication(): Promise<{ copied: number }> {
  if (!config.s3.replicaBucket) {
    if (config.isProduction) throw new Error('S3_REPLICA_BUCKET ist nicht gesetzt.');
    log.warn('Replikation übersprungen: S3_REPLICA_BUCKET nicht gesetzt');
    return { copied: 0 };
  }
  const { s3Replica } = await import('../lib/s3.ts');
  let copied = 0;
  for (const prefix of ['pass/', BACKUP_PREFIX]) {
    const [source, target] = await Promise.all([listKeys(prefix), listKeys(prefix, s3Replica(), config.s3.replicaBucket)]);
    const existing = new Map(target.map((t) => [t.key, t.etag]));
    for (const obj of source) {
      if (existing.get(obj.key) === obj.etag) continue;
      await copyToReplica(obj.key);
      copied++;
    }
  }
  return { copied };
}
