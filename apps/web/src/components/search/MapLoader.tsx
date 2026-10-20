'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@kardia/ui';

import type { MapPoint } from './MapView.tsx';

// MapLibre nur bei Kartenansicht laden (JS-Budget öffentlicher Seiten, PRD 10.4).
const MapView = dynamic(() => import('./MapView.tsx'), { ssr: false, loading: () => <Skeleton className="h-[60vh] min-h-96 w-full" /> });

export function MapLoader(props: { points: MapPoint[]; label: string }) {
  return <MapView {...props} />;
}
