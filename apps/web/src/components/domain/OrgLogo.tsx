import { db } from '@/server/db';

/**
 * Logo einer Organisation (PRD Modul A): nur wenn geprüft (READY) und die Organisation
 * verifiziert ist; ausgeliefert über /api/files/[id] mit signierter Kurzzeit-URL.
 */
export async function OrgLogo({ fileId, size = 40 }: { fileId: string | null | undefined; size?: 32 | 40 | 64 }) {
  if (!fileId) return null;
  const file = await db.file.findUnique({ where: { id: fileId }, select: { status: true, orgLogo: { select: { verification: true } } } });
  if (file?.status !== 'READY' || file.orgLogo?.verification !== 'VERIFIED') return null;
  const box = { 32: 'size-8', 40: 'size-10', 64: 'size-16' }[size];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- signierte Kurzzeit-URL aus dem privaten Bucket, nicht optimierbar
    <img src={`/api/files/${fileId}`} alt="" width={size} height={size} className={`${box} shrink-0 rounded-control border border-line-200 bg-surface-0 object-contain`} />
  );
}
