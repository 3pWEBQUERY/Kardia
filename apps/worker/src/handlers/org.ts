import { XMLParser } from 'fast-xml-parser';

import { db, log } from '../context.ts';
import { config } from '../env.ts';

/**
 * Organisationsprüfung (Modul C, agenturfrei): Abgleich mit dem öffentlichen
 * UID-Register (BFS) und dem SECO-Verzeichnis bewilligter Vermittlungs- und
 * Verleihbetriebe. Ein SECO-Treffer führt nie zur automatischen Freigabe (AK-C1):
 * Status AGENCY_REVIEW, Entscheid in der Admin-Konsole. Ohne Treffer bleibt die
 * Organisation PENDING, bis ein Admin sie freigibt.
 */
export interface UidLookup {
  found: boolean;
  name: string | null;
  active: boolean | null;
}

export function uidDigits(uid: string): string {
  return uid.replace(/\D/g, '');
}

export function buildUidSoapRequest(uid: string): string {
  const digits = uidDigits(uid);
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:uid="http://www.uid.admin.ch/xmlns/uid-wse" xmlns:ech="http://www.ech.ch/xmlns/eCH-0097/5">
  <soap:Body>
    <uid:GetByUID>
      <uid:uid>
        <ech:uidOrganisationIdCategorie>CHE</ech:uidOrganisationIdCategorie>
        <ech:uidOrganisationId>${digits}</ech:uidOrganisationId>
      </uid:uid>
    </uid:GetByUID>
  </soap:Body>
</soap:Envelope>`;
}

export function parseUidSoapResponse(xml: string): UidLookup {
  const doc = new XMLParser({ removeNSPrefix: true, ignoreAttributes: true }).parse(xml) as Record<string, unknown>;
  const text = JSON.stringify(doc);
  const name = /"organisationName":"([^"]+)"/.exec(text)?.[1] ?? null;
  const statusMatch = /"uidregStatusEnterpriseDetail":"?(\d)"?/.exec(text)?.[1];
  return { found: !!name, name, active: statusMatch ? statusMatch === '3' : null };
}

/** Normalisierter Firmenname für den Vergleich mit dem SECO-Verzeichnis. */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(ag|gmbh|sa|sarl|sàrl|ltd|genossenschaft|stiftung)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function lookupUid(uid: string): Promise<UidLookup | null> {
  if (!config.uidRegisterUrl) return null;
  const res = await fetch(config.uidRegisterUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: 'http://www.uid.admin.ch/xmlns/uid-wse/IPublicServices/GetByUID' },
    body: buildUidSoapRequest(uid),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`UID-Register HTTP ${res.status}`);
  return parseUidSoapResponse(await res.text());
}

/**
 * SECO-Verzeichnis: erwartet einen Endpunkt, der JSON `[{ name, uid? }]` liefert
 * (z. B. ein nächtlich gespiegelter Export des öffentlichen Verzeichnisses).
 */
async function secoMatch(name: string, uid: string): Promise<boolean | null> {
  if (!config.secoRegistryUrl) return null;
  const url = new URL(config.secoRegistryUrl);
  url.searchParams.set('q', name);
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`SECO-Verzeichnis HTTP ${res.status}`);
  const rows = (await res.json()) as { name?: string; uid?: string }[];
  const target = normalizeCompanyName(name);
  return rows.some((r) => (r.uid && uidDigits(r.uid) === uidDigits(uid)) || (r.name && normalizeCompanyName(r.name) === target));
}

export async function handleOrgCheck(job: { organizationId: string }): Promise<{ uid: UidLookup | null; seco: boolean | null }> {
  const org = await db().organization.findUnique({ where: { id: job.organizationId } });
  if (!org) return { uid: null, seco: null };
  const [uid, seco] = await Promise.all([
    lookupUid(org.uid).catch((e: unknown) => (log.warn('UID-Abgleich fehlgeschlagen', { error: String(e) }), null)),
    secoMatch(org.name, org.uid).catch((e: unknown) => (log.warn('SECO-Abgleich fehlgeschlagen', { error: String(e) }), null)),
  ]);
  await db().organization.update({
    where: { id: org.id },
    data: {
      secoRegistryMatch: seco === true,
      // Nur aus PENDING: eine bereits erteilte Admin-Freigabe trotz Treffer bleibt bestehen.
      ...(seco === true && org.verification === 'PENDING' ? { verification: 'AGENCY_REVIEW' } : {}),
    },
  });
  await db().event.create({
    data: { name: 'organization.checked', orgId: org.id, entityId: org.id, props: { uid: uid ? { ...uid } : null, seco } },
  });
  return { uid, seco };
}
