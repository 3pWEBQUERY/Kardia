import path from 'node:path';

import { withSentryConfig } from '@sentry/nextjs/config';
import { withSerwist } from '@serwist/turbopack';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Sicherheits-Header (PRD 14.2). Die CSP mit Nonce setzt `src/proxy.ts` pro Anfrage;
 * hier stehen die statischen Header.
 */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const config: NextConfig = {
  output: 'standalone',
  // Monorepo: Standalone-Tracing ab Repo-Wurzel, damit packages/* mitkommen.
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@kardia/ui', '@kardia/core', '@kardia/ai', '@kardia/db'],
  serverExternalPackages: ['pg', 'pg-boss', '@prisma/client', '@prisma/adapter-pg'],
  typedRoutes: false,
  agentRules: false,
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ];
  },
};

const withPlugins = withSerwist(withNextIntl(config));

export default process.env.SENTRY_DSN
  ? withSentryConfig(withPlugins, {
      silent: true,
      telemetry: false,
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
    })
  : withPlugins;
