'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button, EmptyState } from '@kardia/ui';

const CACHES = ['pages', 'pages-rsc', 'kardia-me'];

/** Listet zwischengespeicherte Seiten (gemerkte Stellen, Bewerbungen, Schichten). */
export function OfflineList() {
  const t = useTranslations('common.offline');
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    void (async () => {
      if (!('caches' in window)) return;
      const found = new Set<string>();
      for (const name of CACHES) {
        const cache = await caches.open(name);
        for (const req of await cache.keys()) {
          const u = new URL(req.url);
          if (/^\/(jobs|me\/(applications|shifts|saved))/.test(u.pathname)) found.add(u.pathname);
        }
      }
      setUrls([...found].sort());
    })();
  }, []);
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-h3">{t('available')}</h2>
      {urls.length === 0 ? <EmptyState>{t('body')}</EmptyState> : null}
      <ul className="flex flex-col gap-1">
        {urls.map((u) => (
          <li key={u}><a className="text-body-s text-accent-600" href={u}>{u}</a></li>
        ))}
      </ul>
      <div><Button onClick={() => window.location.reload()}>{t('retry')}</Button></div>
    </div>
  );
}
