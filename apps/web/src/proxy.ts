import { NextResponse, type NextRequest } from 'next/server';

/**
 * Pro Anfrage: CSP mit Nonce, `frame-ancestors 'none'` (PRD 14.2). Next.js liest die
 * Nonce aus dem CSP-Header der Anfrage und setzt sie auf eigene Skripte.
 */
export function proxy(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const dev = process.env.NODE_ENV !== 'production';
  const s3 = process.env.S3_PUBLIC_ORIGIN ?? process.env.S3_ENDPOINT ?? '';
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://*.geo.admin.ch ${s3}`.trim(),
    `media-src 'self' blob: ${s3}`.trim(),
    `font-src 'self'`,
    `connect-src 'self' https://*.geo.admin.ch https://*.ingest.de.sentry.io ${s3}${dev ? ' ws:' : ''}`.trim(),
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self' https://checkout.stripe.com`,
    `object-src 'none'`,
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

export const config = {
  matcher: [
    // Keine CSP für statische Dateien, die API und den Service Worker.
    { source: '/((?!_next/static|_next/image|api/|serwist/|icons/|favicon.ico|manifest.webmanifest|.well-known).*)' },
  ],
};
