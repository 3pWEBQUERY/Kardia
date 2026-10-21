import type { MetadataRoute } from 'next';

/** Öffentliche, indexierbare Seiten ohne Datenbank (Suche selbst ist noindex). */
export const STATIC_PUBLIC_PATHS = ['/', '/employers', '/pricing', '/guide/recognition', '/legal/terms', '/legal/terms-employers', '/legal/privacy', '/legal/imprint'] as const;

export interface SitemapData {
  jobs: { id: string; updatedAt: Date }[];
  wards: { id: string; confirmedAt: Date }[];
  organizations: { id: string; createdAt: Date }[];
  guides: { id: string; reviewedAt: Date }[];
}

/** Sitemap (PRD 16): Stellen, Stationen mit offenen Stellen, Organisationen, Ratgeber. */
export function buildSitemap(origin: string, data: SitemapData): MetadataRoute.Sitemap {
  const base = origin.replace(/\/$/, '');
  return [
    ...STATIC_PUBLIC_PATHS.map((path) => ({ url: path === '/' ? `${base}/` : `${base}${path}`, changeFrequency: 'weekly' as const, priority: path === '/' ? 1 : 0.5 })),
    ...data.jobs.map((j) => ({ url: `${base}/jobs/${j.id}`, lastModified: j.updatedAt, changeFrequency: 'daily' as const, priority: 0.9 })),
    ...data.wards.map((w) => ({ url: `${base}/wards/${w.id}`, lastModified: w.confirmedAt, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...data.organizations.map((o) => ({ url: `${base}/organizations/${o.id}`, lastModified: o.createdAt, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...data.guides.map((g) => ({ url: `${base}/guide/recognition/${g.id}`, lastModified: g.reviewedAt, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
