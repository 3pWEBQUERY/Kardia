import 'server-only';

import { notFound } from 'next/navigation';

import { ProblemError } from '@kardia/core';

import { env } from './env.ts';

/**
 * Release-Schalter (PRD Roadmap: R1 ohne Marktplatz und Flex-Pool, Q-5). Ausgeschaltet
 * verschwinden die Einträge aus der Navigation; Seiten, Services und API antworten 404.
 */
export type Feature = 'marketplace' | 'flexPool';

export function featureEnabled(feature: Feature): boolean {
  const e = env();
  return feature === 'marketplace' ? e.FEATURE_MARKETPLACE : e.FEATURE_FLEXPOOL;
}

/** Für Services, Actions und API: ProblemError 404. */
export function assertFeature(feature: Feature): void {
  if (!featureEnabled(feature)) throw new ProblemError('notFound', 'Diese Funktion ist noch nicht freigeschaltet.');
}

/** Für Seiten und Route Handler im Cockpit: echte 404-Seite. */
export function requireFeature(feature: Feature): void {
  if (!featureEnabled(feature)) notFound();
}
