import { createDecipheriv, randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { renderEmail } from '../src/emails/templates.tsx';
import { isDueNow, zurichClock } from '../src/handlers/alerts.ts';
import { pushMessageFor } from '../src/handlers/notify.ts';
import { normalizeCompanyName, parseUidSoapResponse, uidDigits } from '../src/handlers/org.ts';
import { BACKUP_MAGIC, backupKey, dateFromBackupKey, encryptingStream, isExpiredBackup } from '../src/lib/backup.ts';
import { parseClamdResponse } from '../src/lib/clamav.ts';
import { feedHash, guessProfession, itemHash, normalizeItem, parseFeed, parseWorkload } from '../src/lib/feed.ts';
import { htmlToText } from '../src/lib/html.ts';
import { buildOjpTripRequest, parseIsoDurationMinutes, parseOjpShortestMinutes, representativeDeparture } from '../src/lib/routing.ts';
import { classifyResponse, selectEndpoints, webhookBody } from '../src/lib/webhooks.ts';

describe('ÖV-Reisezeit (OJP 2.0)', () => {
  it('liest ISO-8601-Dauern', () => {
    expect(parseIsoDurationMinutes('PT34M')).toBe(34);
    expect(parseIsoDurationMinutes('PT1H5M')).toBe(65);
    expect(parseIsoDurationMinutes('P0DT0H12M30S')).toBe(13);
    expect(parseIsoDurationMinutes('quatsch')).toBeNull();
  });

  it('nimmt die kürzeste Verbindung einer TripDelivery', () => {
    const xml = `<?xml version="1.0"?>
<OJP xmlns="http://www.vdv.de/ojp" xmlns:siri="http://www.siri.org.uk/siri"><OJPResponse><siri:ServiceDelivery><OJPTripDelivery>
  <TripResult><Id>1</Id><Trip><Id>t1</Id><Duration>PT48M</Duration><TripLeg><TimedLeg><Duration>PT5M</Duration></TimedLeg></TripLeg></Trip></TripResult>
  <TripResult><Id>2</Id><Trip><Id>t2</Id><Duration>PT41M</Duration></Trip></TripResult>
</OJPTripDelivery></siri:ServiceDelivery></OJPResponse></OJP>`;
    expect(parseOjpShortestMinutes(xml)).toBe(41);
    expect(parseOjpShortestMinutes('<OJP></OJP>')).toBeNull();
  });

  it('baut eine Anfrage mit gerundetem Startpunkt und Abfahrt Dienstag 07:30', () => {
    const dep = representativeDeparture(new Date('2026-10-20T12:00:00Z'));
    expect(dep.toISOString()).toBe('2026-10-27T06:30:00.000Z');
    const xml = buildOjpTripRequest({ lat: 47.37689, lng: 8.541694 }, { lat: 47.4, lng: 8.6 }, dep);
    expect(xml).toContain('<siri:Latitude>47.376890</siri:Latitude>');
    expect(xml).toContain('<DepArrTime>2026-10-27T06:30:00.000Z</DepArrTime>');
  });
});

describe('ClamAV', () => {
  it('versteht die clamd-Antworten', () => {
    expect(parseClamdResponse('stream: OK\0')).toEqual({ clean: true });
    expect(parseClamdResponse('stream: Win.Test.EICAR_HDB-1 FOUND\0')).toEqual({ clean: false, signature: 'Win.Test.EICAR_HDB-1' });
    expect(parseClamdResponse('INSTREAM size limit exceeded. ERROR')).toEqual({ error: 'INSTREAM size limit exceeded. ERROR' });
  });
});

describe('Webhooks', () => {
  const eps = [
    { id: 'a', active: true, events: ['application.created'] },
    { id: 'b', active: true, events: [] },
    { id: 'c', active: false, events: ['application.created'] },
    { id: 'd', active: true, events: ['shift.booked'] },
  ];

  it('stellt nur an aktive, abonnierte Endpunkte zu', () => {
    expect(selectEndpoints(eps, 'application.created').map((e) => e.id)).toEqual(['a', 'b']);
    expect(selectEndpoints(eps, 'shift.booked').map((e) => e.id)).toEqual(['b', 'd']);
  });

  it('klassifiziert Antworten', () => {
    expect(classifyResponse(204)).toBe('delivered');
    expect(classifyResponse(410)).toBe('gone');
    expect(classifyResponse(500)).toBe('retry');
    expect(classifyResponse(301)).toBe('retry');
  });

  it('serialisiert stabil', () => {
    const body = webhookBody('shift.booked', { shiftId: 's' }, 'd1', new Date('2026-10-20T08:00:00Z'));
    expect(JSON.parse(body)).toEqual({ id: 'd1', event: 'shift.booked', createdAt: '2026-10-20T08:00:00.000Z', data: { shiftId: 's' } });
  });
});

describe('Backups', () => {
  it('benennt Schlüssel und erkennt abgelaufene', () => {
    const key = backupKey(new Date('2026-10-20T01:17:00Z'));
    expect(key).toBe('backup/db-2026-10-20T01-17-00Z.dump.enc');
    expect(dateFromBackupKey(key)?.toISOString()).toBe('2026-10-20T01:17:00.000Z');
    expect(isExpiredBackup(key, 30, new Date('2026-11-18T00:00:00Z'))).toBe(false);
    expect(isExpiredBackup(key, 30, new Date('2026-11-20T02:00:00Z'))).toBe(true);
    expect(isExpiredBackup('backup/anderes.txt', 30)).toBe(false);
  });

  it('verschlüsselt mit AES-256-GCM und lässt sich wieder entschlüsseln', async () => {
    const key = randomBytes(32);
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      Readable.from([Buffer.from('PGDMP'), Buffer.from(' daten')])
        .pipe(encryptingStream(key))
        .on('data', (c: Buffer) => chunks.push(c))
        .on('end', resolve)
        .on('error', reject);
    });
    const all = Buffer.concat(chunks);
    expect(all.subarray(0, 4).equals(BACKUP_MAGIC)).toBe(true);
    const iv = all.subarray(4, 16);
    const tag = all.subarray(all.length - 16);
    const d = createDecipheriv('aes-256-gcm', key, iv);
    d.setAuthTag(tag);
    expect(Buffer.concat([d.update(all.subarray(16, all.length - 16)), d.final()]).toString()).toBe('PGDMP daten');
  });
});

describe('Feed-Import', () => {
  it('erkennt Beruf und Pensum', () => {
    expect(guessProfession('Dipl. Pflegefachperson HF Intensivpflege')).toBe('NURSE_HF_FH');
    expect(guessProfession('Assistenzärztin Innere Medizin')).toBe('PHYSICIAN');
    expect(guessProfession('FaGe Langzeit')).toBe('FAGE');
    expect(guessProfession('Hauswart')).toBeNull();
    expect(parseWorkload('80–100 %')).toEqual([80, 100]);
    expect(parseWorkload('Pensum 65%')).toEqual([70, 70]);
  });

  it('liest JSON- und XML-Feeds', () => {
    const json = parseFeed(JSON.stringify({ jobs: [{ id: 'A1', title: 'MPA 60 %', startDate: '01.03.2027' }, { title: 'ohne id' }] }), 'JSON');
    expect(json).toEqual([
      { externalRef: 'A1', title: 'MPA 60 %', profession: 'MPA', workloadMinPct: 60, workloadMaxPct: 60, startDate: '2027-03-01', description: null },
    ]);
    const xml = parseFeed('<feed><job><id>7</id><title>Pflegefachfrau HF 80-100%</title></job><job><id>8</id><title>FaGe 50%</title></job></feed>', 'XML');
    expect(xml.map((i) => [i.externalRef, i.profession])).toEqual([
      ['7', 'NURSE_HF_FH'],
      ['8', 'FAGE'],
    ]);
  });

  it('Hash ändert sich nur bei inhaltlichen Änderungen', () => {
    const a = normalizeItem({ id: '1', title: 'MPA 60 %' });
    const b = normalizeItem({ title: 'MPA 60 %', id: '1' });
    const c = normalizeItem({ id: '1', title: 'MPA 80 %' });
    if (!a || !b || !c) throw new Error('Normalisierung fehlgeschlagen');
    expect(itemHash(a)).toBe(itemHash(b));
    expect(itemHash(a)).not.toBe(itemHash(c));
    expect(feedHash([a, c])).toBe(feedHash([c, a]));
  });
});

describe('Verschiedenes', () => {
  it('HTML zu Text ohne Skripte', () => {
    expect(htmlToText('<h1>IPS</h1><script>x()</script><p>Lohn&nbsp;CHF 88&#39;000</p>')).toBe("IPS\n Lohn CHF 88'000");
  });

  it('UID-Register-Antwort und Firmennamen', () => {
    expect(uidDigits('CHE-116.281.710')).toBe('116281710');
    const xml = '<Envelope><Body><GetByUIDResponse><GetByUIDResult><organisation><organisationIdentification><organisationName>Spital Muster AG</organisationName></organisationIdentification><uidregInformation><uidregStatusEnterpriseDetail>3</uidregStatusEnterpriseDetail></uidregInformation></organisation></GetByUIDResult></GetByUIDResponse></Body></Envelope>';
    expect(parseUidSoapResponse(xml)).toEqual({ found: true, name: 'Spital Muster AG', active: true });
    expect(normalizeCompanyName('Personal Plus AG')).toBe(normalizeCompanyName('personal-plus'));
  });

  it('Suchalarme: täglich um 07 Uhr, wöchentlich montags', () => {
    const mon7 = new Date('2026-10-19T05:13:00Z'); // 07:13 in Zürich (Sommerzeit)
    expect(zurichClock(mon7)).toEqual({ hour: 7, weekday: 1 });
    expect(isDueNow('DAILY', null, mon7)).toBe(true);
    expect(isDueNow('WEEKLY', null, mon7)).toBe(true);
    expect(isDueNow('WEEKLY', null, new Date('2026-10-20T05:13:00Z'))).toBe(false);
    expect(isDueNow('INSTANT', new Date(), mon7)).toBe(true);
  });

  it('Push-Texte je Ereignis', () => {
    expect(pushMessageFor('offer.new', { offerId: 'o1', orgName: 'Spital', jobTitle: 'IPS' })).toEqual({ title: 'Angebot von Spital', body: 'IPS', url: '/offers/o1' });
    expect(pushMessageFor('unbekannt', {})).toBeNull();
    expect(pushMessageFor('credential.expired', { title: 'BLS-AED' })).toEqual({ title: 'Nachweis abgelaufen', body: 'BLS-AED', url: '/me/pass' });
  });

  it('Ablauf-Mails: Fachperson und Arbeitgeber erhalten je eigene Texte', async () => {
    const data = { orgName: 'Spital Demo', jobTitle: 'IPS 80 %' };
    const candidate = await renderEmail('offer.expired', data, 'candidate');
    const employer = await renderEmail('offer.expired', data, 'employer');
    expect(candidate.subject).toContain('Spital Demo');
    expect(employer.subject).toContain('IPS 80 %');
    expect(employer.text).toContain('nicht beantwortet');
    const cred = await renderEmail('credential.expired', { title: 'BLS-AED', validUntil: '2026-09-30' });
    expect(cred.text).toContain('30.09.2026');
  });
});
