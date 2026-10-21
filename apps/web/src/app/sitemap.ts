import { buildSitemap } from '@/lib/sitemap';
import { db } from '@/server/db';

import type { MetadataRoute } from 'next';

// Zur Laufzeit erzeugen: braucht Datenbank und APP_ORIGIN (beim Docker-Build nicht vorhanden).
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const verified = { location: { organization: { verification: 'VERIFIED' as const } } };
  const [jobs, wards, organizations, guides] = await Promise.all([
    db.job.findMany({ where: { status: 'PUBLISHED', ward: verified }, select: { id: true, updatedAt: true }, take: 45_000 }),
    db.ward.findMany({ where: { ...verified, jobs: { some: { status: 'PUBLISHED' } } }, select: { id: true, confirmedAt: true } }),
    db.organization.findMany({ where: { verification: 'VERIFIED' }, select: { id: true, createdAt: true } }),
    db.recognitionGuide.findMany({ select: { id: true, reviewedAt: true } }),
  ]);
  return buildSitemap(process.env.APP_ORIGIN ?? 'http://localhost:3000', { jobs, wards, organizations, guides });
}
