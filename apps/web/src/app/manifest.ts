import { colors } from '@kardia/ui/tokens';

import type { MetadataRoute } from 'next';


/** PWA-Manifest (PRD 13.1). Icons flach, ohne Verlauf. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kardia – Stellen im Gesundheitswesen',
    short_name: 'Kardia',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    background_color: colors['surface-50'].light,
    theme_color: colors['surface-0'].light,
    lang: 'de-CH',
    dir: 'ltr',
    categories: ['business', 'medical'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Suche', url: '/search', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Meine Bewerbungen', url: '/me/applications', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Meine Schichten', url: '/me/shifts', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
