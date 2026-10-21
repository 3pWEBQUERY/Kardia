import { type Readable } from 'node:stream';

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import { config } from '../env.ts';

/** Railway Bucket (S3-kompatibel, privat). Zweiter Bucket für die Replikation (PRD 10.2). */
let primary: S3Client | undefined;
let replica: S3Client | undefined;

function makeClient(endpoint: string | undefined, accessKeyId: string | undefined, secretAccessKey: string | undefined): S3Client {
  return new S3Client({
    region: config.s3.region,
    ...(endpoint ? { endpoint, forcePathStyle: config.s3.forcePathStyle } : {}),
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  });
}

export function s3(): S3Client {
  primary ??= makeClient(config.s3.endpoint, config.s3.accessKeyId, config.s3.secretAccessKey);
  return primary;
}

/**
 * Browser laden direkt per signierter PUT-URL hoch (PRD 10.3); dafür braucht der Bucket
 * eine CORS-Regel für die App-Origin. Idempotent beim Start, Fehler nicht fatal.
 */
export async function ensureBucketCors(): Promise<void> {
  if (!config.s3.endpoint) return;
  await s3().send(
    new PutBucketCorsCommand({
      Bucket: config.s3.bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: [config.appOrigin],
            AllowedMethods: ['GET', 'PUT', 'HEAD'],
            AllowedHeaders: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );
}

export function s3Replica(): S3Client {
  replica ??= makeClient(
    config.s3.replicaEndpoint ?? config.s3.endpoint,
    config.s3.replicaAccessKeyId ?? config.s3.accessKeyId,
    config.s3.replicaSecretAccessKey ?? config.s3.secretAccessKey,
  );
  return replica;
}

export async function headObject(key: string) {
  return s3().send(new HeadObjectCommand({ Bucket: config.s3.bucket, Key: key, ChecksumMode: 'ENABLED' }));
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

/** Erste Bytes einer Datei (für die Magic-Byte-Prüfung). */
export async function readHead(key: string, bytes = 4100): Promise<Buffer> {
  const res = await s3().send(new GetObjectCommand({ Bucket: config.s3.bucket, Key: key, Range: `bytes=0-${bytes - 1}` }));
  return bodyToBuffer(res.Body);
}

export async function readObject(key: string): Promise<Buffer> {
  const res = await s3().send(new GetObjectCommand({ Bucket: config.s3.bucket, Key: key }));
  return bodyToBuffer(res.Body);
}

export async function readStream(key: string): Promise<Readable> {
  const res = await s3().send(new GetObjectCommand({ Bucket: config.s3.bucket, Key: key }));
  return res.Body as Readable;
}

export async function putObject(key: string, body: Buffer | Readable, contentType: string, contentLength?: number): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ...(contentLength !== undefined ? { ContentLength: contentLength } : {}),
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: key }));
}

export async function listKeys(prefix: string, client = s3(), bucket = config.s3.bucket): Promise<{ key: string; lastModified: Date | undefined; etag: string | undefined }[]> {
  const out: { key: string; lastModified: Date | undefined; etag: string | undefined }[] = [];
  let token: string | undefined;
  do {
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ...(token ? { ContinuationToken: token } : {}) }));
    for (const o of res.Contents ?? []) if (o.Key) out.push({ key: o.Key, lastModified: o.LastModified, etag: o.ETag });
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

/** Kopie in den Replika-Bucket; serverseitig, wenn beide Buckets im selben Konto liegen. */
export async function copyToReplica(key: string): Promise<void> {
  const target = config.s3.replicaBucket;
  if (!target) throw new Error('S3_REPLICA_BUCKET ist nicht gesetzt.');
  if (!config.s3.replicaEndpoint || config.s3.replicaEndpoint === config.s3.endpoint) {
    await s3Replica().send(new CopyObjectCommand({ Bucket: target, Key: key, CopySource: `${config.s3.bucket}/${encodeURIComponent(key)}` }));
    return;
  }
  const data = await readObject(key);
  await s3Replica().send(new PutObjectCommand({ Bucket: target, Key: key, Body: data }));
}
