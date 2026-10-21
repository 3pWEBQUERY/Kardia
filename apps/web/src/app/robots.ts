import type { MetadataRoute } from 'next';

// Origin zur Laufzeit lesen (beim Build ist APP_ORIGIN nicht gesetzt).
export const dynamic = 'force-dynamic';

/** Private Bereiche und API nicht indexieren; Suche selbst ist per Meta-Tag noindex. */
export default function robots(): MetadataRoute.Robots {
  const origin = (process.env.APP_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/me', '/employer', '/admin', '/api', '/sign-in', '/invite'] }],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
