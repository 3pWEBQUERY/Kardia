/// <reference lib="webworker" />
import { defaultCache } from '@serwist/turbopack/worker';
import { BackgroundSyncPlugin, CacheFirst, ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const DAY = 24 * 3600;

/**
 * Caching-Strategien (PRD 13.2):
 *  - JS, CSS, Schriften, Icons: Cache First (versioniert, Precache)
 *  - Öffentliche Seiten (Suche, Station, Stelle): Network First, 24 h
 *  - Eigene Bewerbungen, Schichten, Merkliste: Network First, 7 Tage
 *  - Signierte Bucket-URLs, Pass-Dokumente: nie cachen
 *  - Ohne Netz und ohne Cache: Offline-Seite
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Hintergrund-Synchronisation nur für "Merken" (PRD 13.2): offline vorgemerkt, später gesendet.
    {
      matcher: ({ url, request }) => url.pathname.startsWith('/api/v1/me/saved/') && (request.method === 'PUT' || request.method === 'DELETE'),
      method: 'PUT',
      handler: new NetworkOnly({ plugins: [new BackgroundSyncPlugin('kardia-saved', { maxRetentionTime: 7 * 24 * 60 })] }),
    },
    {
      matcher: ({ url, request }) => url.pathname.startsWith('/api/v1/me/saved/') && request.method === 'DELETE',
      method: 'DELETE',
      handler: new NetworkOnly({ plugins: [new BackgroundSyncPlugin('kardia-saved-delete', { maxRetentionTime: 7 * 24 * 60 })] }),
    },
    { matcher: ({ url }) => url.pathname.startsWith('/api/files/') || url.searchParams.has('X-Amz-Signature'), handler: new NetworkOnly() },
    { matcher: ({ url }) => url.pathname.startsWith('/api/auth/'), handler: new NetworkOnly() },
    {
      matcher: ({ url, request }) =>
        request.method === 'GET' && (/^\/me\/(applications|shifts|saved)/.test(url.pathname) || /^\/api\/v1\/me\/(applications|shifts)/.test(url.pathname)),
      handler: new NetworkFirst({ cacheName: 'kardia-me', networkTimeoutSeconds: 4, plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * DAY })] }),
    },
    {
      matcher: ({ url, request }) => request.method === 'GET' && /^\/(search|jobs|wards|organizations)(\/|$)/.test(url.pathname),
      handler: new NetworkFirst({ cacheName: 'pages', networkTimeoutSeconds: 4, plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: DAY })] }),
    },
    { matcher: ({ request }) => ['font', 'style', 'script', 'image'].includes(request.destination) && new URL(request.url).origin === self.location.origin, handler: new CacheFirst({ cacheName: 'assets', plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 365 * DAY })] }) },
    ...defaultCache,
  ],
  fallbacks: { entries: [{ url: '/offline', matcher: ({ request }) => request.destination === 'document' }] },
});

serwist.addEventListeners();

/** Web Push (PRD 13.3): Titel, Text und Ziel-URL kommen vom Worker. */
self.addEventListener('push', (event) => {
  const data = (event.data?.json() ?? {}) as { title?: string; body?: string; url?: string; tag?: string };
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Kardia', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      ...(data.tag ? { tag: data.tag } : {}),
      data: { url: data.url ?? '/me' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | null)?.url ?? '/me';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => new URL(c.url).pathname === url);
      return existing ? existing.focus() : self.clients.openWindow(url);
    }),
  );
});
