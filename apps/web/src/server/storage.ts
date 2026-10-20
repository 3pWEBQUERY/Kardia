import 'server-only';

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { DOWNLOAD_URL_TTL_SEC, UPLOAD_URL_TTL_SEC } from '@kardia/core';

import { env } from './env.ts';

/** Railway Bucket (S3-kompatibel, privat). Up- und Download nur über signierte URLs (PRD 10.3). */
let client: S3Client | undefined;

function s3(): S3Client {
  const e = env();
  client ??= new S3Client({
    region: e.S3_REGION,
    ...(e.S3_ENDPOINT ? { endpoint: e.S3_ENDPOINT, forcePathStyle: true } : {}),
    ...(e.S3_ACCESS_KEY_ID && e.S3_SECRET_ACCESS_KEY
      ? { credentials: { accessKeyId: e.S3_ACCESS_KEY_ID, secretAccessKey: e.S3_SECRET_ACCESS_KEY } }
      : {}),
  });
  return client;
}

export async function signedUploadUrl(key: string, mimeType: string, sizeBytes: number, sha256Hex: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env().S3_BUCKET,
    Key: key,
    ContentType: mimeType,
    ContentLength: sizeBytes,
    ChecksumSHA256: Buffer.from(sha256Hex, 'hex').toString('base64'),
  });
  return getSignedUrl(s3(), command, {
    expiresIn: UPLOAD_URL_TTL_SEC,
    signableHeaders: new Set(['content-type', 'content-length', 'x-amz-checksum-sha256']),
  });
}

export async function signedDownloadUrl(key: string, fileName?: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env().S3_BUCKET,
    Key: key,
    ...(fileName ? { ResponseContentDisposition: `inline; filename="${fileName.replace(/"/g, '')}"` } : {}),
  });
  return getSignedUrl(s3(), command, { expiresIn: DOWNLOAD_URL_TTL_SEC });
}
