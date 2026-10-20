import { XMLParser } from 'fast-xml-parser';

import { config } from '../env.ts';

/**
 * Pendelzeit (Modul B): Auto über OSRM (selbst gehostet), ÖV über die offene
 * Fahrplan-API (opentransportdata.swiss, OJP 2.0). Startpunkt ist immer das Zentrum
 * der Geohash-Zelle (~150 m) – nie die genaue Adresse (PRD 12.4).
 */
export interface Point {
  lat: number;
  lng: number;
}

/** ISO-8601-Dauer (PT34M, PT1H5M, P0DT0H34M0S) → ganze Minuten, aufgerundet. */
export function parseIsoDurationMinutes(value: string): number | null {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, d = '0', h = '0', min = '0', s = '0'] = m;
  const total = Number(d) * 1440 + Number(h) * 60 + Number(min) + Number(s) / 60;
  return Number.isFinite(total) ? Math.ceil(total) : null;
}

function collectTripDurations(node: unknown, out: number[]): void {
  if (Array.isArray(node)) {
    for (const n of node) collectTripDurations(n, out);
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    if (key === 'Trip') {
      for (const trip of Array.isArray(value) ? value : [value]) {
        const d = trip && typeof trip === 'object' ? (trip as Record<string, unknown>).Duration : undefined;
        const minutes = typeof d === 'string' ? parseIsoDurationMinutes(d) : null;
        if (minutes !== null) out.push(minutes);
      }
    } else {
      collectTripDurations(value, out);
    }
  }
}

/** Kürzeste Reisezeit aller Verbindungen einer OJP-TripDelivery. */
export function parseOjpShortestMinutes(xml: string): number | null {
  const parser = new XMLParser({ removeNSPrefix: true, ignoreAttributes: true, parseTagValue: false });
  const doc: unknown = parser.parse(xml);
  const durations: number[] = [];
  collectTripDurations(doc, durations);
  return durations.length ? Math.min(...durations) : null;
}

/** Repräsentative Abfahrt: nächster Dienstag 07:30 Schweizer Zeit (Werktags-Pendeln). */
export function representativeDeparture(now = new Date()): Date {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + ((9 - d.getUTCDay()) % 7 || 7));
  // 07:30 Europe/Zurich ≈ 05:30/06:30 UTC; Sommerzeit über den Offset bestimmen.
  const probe = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));
  const zurichHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', hourCycle: 'h23' }).format(probe));
  const offset = zurichHour - 12;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 7 - offset, 30));
}

export function buildOjpTripRequest(from: Point, to: Point, departure: Date, now = new Date()): string {
  const ts = now.toISOString();
  const place = (p: Point, name: string) =>
    `<PlaceRef><GeoPosition><siri:Longitude>${p.lng.toFixed(6)}</siri:Longitude><siri:Latitude>${p.lat.toFixed(6)}</siri:Latitude></GeoPosition><Name><Text>${name}</Text></Name></PlaceRef>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<OJP xmlns="http://www.vdv.de/ojp" xmlns:siri="http://www.siri.org.uk/siri" version="2.0">
  <OJPRequest>
    <siri:ServiceRequest>
      <siri:RequestTimestamp>${ts}</siri:RequestTimestamp>
      <siri:RequestorRef>kardia</siri:RequestorRef>
      <OJPTripRequest>
        <siri:RequestTimestamp>${ts}</siri:RequestTimestamp>
        <Origin>${place(from, 'Start')}<DepArrTime>${departure.toISOString()}</DepArrTime></Origin>
        <Destination>${place(to, 'Ziel')}</Destination>
        <Params><NumberOfResults>4</NumberOfResults><IncludeAllRestrictedLines>false</IncludeAllRestrictedLines></Params>
      </OJPTripRequest>
    </siri:ServiceRequest>
  </OJPRequest>
</OJP>`;
}

export async function publicTransportMinutes(from: Point, to: Point): Promise<number | null> {
  if (!config.ojp.apiKey) return null;
  const res = await fetch(config.ojp.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml', Authorization: `Bearer ${config.ojp.apiKey}` },
    body: buildOjpTripRequest(from, to, representativeDeparture()),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`OJP HTTP ${res.status}`);
  return parseOjpShortestMinutes(await res.text());
}

export async function carMinutes(from: Point, to: Point): Promise<number | null> {
  if (!config.osrmUrl) return null;
  const url = `${config.osrmUrl.replace(/\/$/, '')}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const json = (await res.json()) as { code?: string; routes?: { duration: number }[] };
  const seconds = json.code === 'Ok' ? json.routes?.[0]?.duration : undefined;
  return seconds === undefined ? null : Math.ceil(seconds / 60);
}
