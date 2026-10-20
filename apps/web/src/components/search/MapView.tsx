'use client';

import 'maplibre-gl/dist/maplibre-gl.css';

import * as maplibregl from 'maplibre-gl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { colors } from '@kardia/ui/tokens';

export interface MapPoint {
  jobId: string;
  title: string;
  orgName: string;
  lat: number;
  lng: number;
}

const STYLE = process.env.NEXT_PUBLIC_MAP_STYLE ?? 'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.lightbasemap.vt/style.json';

/** Kartenansicht: Stationen als Punkte; gleicher Filterzustand wie die Liste (AK-B2). */
export default function MapView({ points, label }: { points: MapPoint[]; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!ref.current) return;
    const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const map = new maplibregl.Map({ container: ref.current, style: STYLE, center: [8.55, 47.37], zoom: 9, attributionControl: { compact: true } });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    const accent = dark ? colors['accent-600'].dark : colors['accent-600'].light;
    const ring = dark ? colors['surface-0'].dark : colors['surface-0'].light;
    map.on('load', () => {
      map.addSource('jobs', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: points.map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { jobId: p.jobId, title: p.title, org: p.orgName } })),
        },
        cluster: true,
        clusterRadius: 40,
      });
      map.addLayer({ id: 'clusters', type: 'circle', source: 'jobs', filter: ['has', 'point_count'], paint: { 'circle-color': accent, 'circle-radius': 16, 'circle-stroke-width': 2, 'circle-stroke-color': ring } });
      map.addLayer({ id: 'count', type: 'symbol', source: 'jobs', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': ring } });
      map.addLayer({ id: 'points', type: 'circle', source: 'jobs', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': accent, 'circle-radius': 7, 'circle-stroke-width': 2, 'circle-stroke-color': ring } });
      map.on('click', 'points', (ev) => {
        const f = ev.features?.[0];
        const id = f?.properties?.jobId as string | undefined;
        if (id) router.push(`/jobs/${id}`);
      });
      map.on('mouseenter', 'points', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'points', () => (map.getCanvas().style.cursor = ''));
      if (points.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        for (const p of points) bounds.extend([p.lng, p.lat]);
        map.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 0 });
      }
    });
    return () => map.remove();
  }, [points, router]);

  return (
    <div className="flex flex-col gap-2">
      <div ref={ref} role="region" aria-label={label} className="h-[60vh] min-h-96 w-full overflow-hidden rounded-card border border-line-300" />
      <ul className="sr-only">
        {points.map((p) => (
          <li key={p.jobId}>
            <a href={`/jobs/${p.jobId}`}>{`${p.title}, ${p.orgName}`}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
