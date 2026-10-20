import { NextResponse } from 'next/server';

import { isGeohash } from '@kardia/core';

import { api } from '@/server/api';
import { commuteFor } from '@/server/services/commute';

/** Pendelzeit nachladen (Cache oder Job). Start nur als Geohash (~150 m). */
export const GET = api(async ({ req }) => {
  const origin = req.nextUrl.searchParams.get('origin') ?? '';
  const wards = (req.nextUrl.searchParams.get('wards') ?? '').split(',').filter(Boolean).slice(0, 100);
  if (!isGeohash(origin)) return NextResponse.json({ minutes: {}, pending: [] });
  return commuteFor(origin, wards);
});
