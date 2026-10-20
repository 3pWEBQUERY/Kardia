import { createSerwistRoute } from '@serwist/turbopack';

// Service Worker über einen Route Handler (Turbopack-kompatibel), Precache der App-Shell je Build.
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: 'src/app/sw.ts',
  useNativeEsbuild: true,
  additionalPrecacheEntries: [{ url: '/offline', revision: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'dev' }],
});
