import { z } from 'zod';

/** Datei-Upload (PRD 10.3): Prefix, erlaubte Typen und Grössenlimits je Zweck. */

export const UPLOAD_PURPOSES = {
  pass: {
    prefix: 'pass',
    maxBytes: 15 * 1024 * 1024,
    mime: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  video: { prefix: 'video', maxBytes: 200 * 1024 * 1024, mime: ['video/mp4', 'video/quicktime'] },
  captions: { prefix: 'video', maxBytes: 512 * 1024, mime: ['text/vtt'] },
  logo: {
    prefix: 'logo',
    maxBytes: 2 * 1024 * 1024,
    mime: ['image/png', 'image/jpeg', 'image/svg+xml'],
  },
  import: { prefix: 'import', maxBytes: 15 * 1024 * 1024, mime: ['application/pdf', 'text/plain'] },
} as const;

export type UploadPurpose = keyof typeof UPLOAD_PURPOSES;

export const UPLOAD_URL_TTL_SEC = 10 * 60;
export const DOWNLOAD_URL_TTL_SEC = 60;

export const uploadRequestSchema = z.object({
  purpose: z.enum(Object.keys(UPLOAD_PURPOSES) as [UploadPurpose, ...UploadPurpose[]]),
  mimeType: z.string().max(100),
  sizeBytes: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  fileName: z.string().max(200).optional(),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;

export type UploadIssue = 'mimeNotAllowed' | 'tooLarge';

export function uploadIssues(
  req: Pick<UploadRequest, 'purpose' | 'mimeType' | 'sizeBytes'>,
): UploadIssue[] {
  const rule = UPLOAD_PURPOSES[req.purpose];
  const issues: UploadIssue[] = [];
  if (!(rule.mime as readonly string[]).includes(req.mimeType)) issues.push('mimeNotAllowed');
  if (req.sizeBytes > rule.maxBytes) issues.push('tooLarge');
  return issues;
}

const EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'text/vtt': 'vtt',
  'text/plain': 'txt',
};

export function bucketKeyFor(purpose: UploadPurpose, id: string, mimeType: string): string {
  return `${UPLOAD_PURPOSES[purpose].prefix}/${id}.${EXT[mimeType] ?? 'bin'}`;
}

/**
 * MIME-Prüfung per Magic Bytes (Worker). Gibt den erkannten Typ zurück oder null.
 * Bewusst klein gehalten: nur die Typen, die Kardia annimmt.
 */
export function sniffMime(head: Uint8Array): string | null {
  const starts = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  const ascii = (offset: number, text: string) =>
    Array.from({ length: text.length }, (_, i) => i).every((i) => head[offset + i] === text.charCodeAt(i));
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return 'application/pdf'; // %PDF-
  if (starts(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  if (ascii(4, 'ftyp')) return ascii(8, 'qt  ') ? 'video/quicktime' : 'video/mp4';
  const text = new TextDecoder('utf-8', { fatal: false })
    .decode(head.slice(0, 256))
    .replace(/^\uFEFF/, '');
  if (text.startsWith('WEBVTT')) return 'text/vtt';
  if (/^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(text)) return 'image/svg+xml';
  return null;
}

/** Erlaubte Abweichung zwischen deklariertem und erkanntem Typ (MOV wird oft als MP4 erkannt). */
export function mimeCompatible(declared: string, sniffed: string | null): boolean {
  if (sniffed === declared) return true;
  if (declared === 'text/plain') return sniffed === null;
  const video = ['video/mp4', 'video/quicktime'];
  return video.includes(declared) && sniffed != null && video.includes(sniffed);
}
