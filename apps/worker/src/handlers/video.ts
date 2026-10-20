import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { MAX_VIDEO_SECONDS } from '@kardia/core';

import { db, log } from '../context.ts';
import { deleteObject, putObject, readObject } from '../lib/s3.ts';

const run = promisify(execFile);

/**
 * Stationsvideos (Modul G): max. 60 Sekunden, serverseitig transkodiert (H.264, 720p,
 * Poster-Bild) mit ffmpeg im Worker. Ohne geprüfte WebVTT-Datei keine Veröffentlichung
 * (AK-G3); die Freigabe erfolgt in der Moderation.
 */
export async function probeDurationSec(path: string): Promise<number> {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path]);
  const sec = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(sec)) throw new Error('Videodauer nicht lesbar');
  return sec;
}

export async function handleVideoTranscode(job: { videoId: string }): Promise<{ status: string }> {
  const video = await db().wardVideo.findUnique({ where: { id: job.videoId }, include: { file: true, captions: true } });
  if (!video) return { status: 'missing' };
  if (video.file.status !== 'READY' || video.captions.status !== 'READY') throw new Error('Video oder Untertitel noch nicht geprüft – später erneut.');
  if (video.file.mimeType === 'video/mp4' && video.posterId && video.file.bucketKey.endsWith('-720p.mp4')) return { status: 'done' };

  const dir = join(tmpdir(), `kardia-video-${randomUUID()}`);
  const input = `${dir}-in`;
  const output = `${dir}-720p.mp4`;
  const poster = `${dir}-poster.jpg`;
  try {
    await writeFile(input, await readObject(video.file.bucketKey));
    const duration = await probeDurationSec(input);
    if (duration > MAX_VIDEO_SECONDS + 0.5) {
      await db().wardVideo.update({ where: { id: video.id }, data: { moderation: 'REJECTED', durationSec: Math.ceil(duration) } });
      return { status: 'tooLong' };
    }
    await run('ffmpeg', ['-y', '-i', input, '-vf', 'scale=-2:720', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', output], { maxBuffer: 1 << 24 });
    await run('ffmpeg', ['-y', '-ss', String(Math.min(1, duration / 2)), '-i', output, '-frames:v', '1', '-q:v', '3', poster]);
    const [mp4, jpg] = await Promise.all([readFile(output), readFile(poster)]);
    const mp4Id = randomUUID().replace(/-/g, '');
    const jpgId = randomUUID().replace(/-/g, '');
    const mp4Key = `video/${mp4Id}-720p.mp4`;
    const jpgKey = `video/${jpgId}-poster.jpg`;
    await putObject(mp4Key, mp4, 'video/mp4', mp4.length);
    await putObject(jpgKey, jpg, 'image/jpeg', jpg.length);
    const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
    const original = video.file;
    await db().$transaction(async (tx) => {
      const f = await tx.file.create({ data: { bucketKey: mp4Key, mimeType: 'video/mp4', sizeBytes: mp4.length, sha256: sha(mp4), status: 'READY', ownerId: original.ownerId } });
      const p = await tx.file.create({ data: { bucketKey: jpgKey, mimeType: 'image/jpeg', sizeBytes: jpg.length, sha256: sha(jpg), status: 'READY', ownerId: original.ownerId } });
      await tx.wardVideo.update({ where: { id: video.id }, data: { fileId: f.id, posterId: p.id, durationSec: Math.round(duration) } });
      await tx.file.delete({ where: { id: original.id } });
    });
    await deleteObject(original.bucketKey).catch(() => undefined);
    log.info('Video transkodiert', { videoId: video.id, seconds: Math.round(duration) });
    return { status: 'done' };
  } finally {
    await Promise.all([input, output, poster].map((p) => rm(p, { force: true })));
  }
}
