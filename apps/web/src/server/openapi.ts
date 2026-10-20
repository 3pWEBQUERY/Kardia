import 'server-only';

import { z } from 'zod';
import { createDocument } from 'zod-openapi';

import {
  applicationInputSchema,
  conditionSchema,
  jobInputSchema,
  jobPatchSchema,
  offerResponseSchema,
  passInputSchema,
  searchFilterSchema,
  uploadRequestSchema,
} from '@kardia/core';
import { ApplicationStatus, CredentialStatus, Department, OfferStatus, Profession, RosterCode, ShiftStatus } from '@kardia/db/enums';

/**
 * OpenAPI 3.1 aus denselben Zod-Schemas wie Web und Server (PRD 12.1, 13.4). Dient der
 * Generierung des Swift-Clients der späteren iOS-App.
 */

const problem = z
  .object({
    type: z.string().meta({ examples: ['https://kardia.ch/problems/validation'] }),
    title: z.string(),
    status: z.number().int(),
    detail: z.string().optional(),
    instance: z.string().optional(),
    errors: z.array(z.object({ path: z.string(), code: z.string(), message: z.string() })).optional(),
  })
  .meta({ id: 'Problem', description: 'RFC 9457 Problem Details' });

const problemResponse = (description: string) => ({
  description,
  content: { 'application/problem+json': { schema: problem } },
});

const errors = {
  '401': problemResponse('Anmeldung erforderlich'),
  '403': problemResponse('Keine Berechtigung'),
  '404': problemResponse('Nicht gefunden'),
  '422': problemResponse('Ungültige Eingabe'),
  '429': problemResponse('Rate Limit überschritten (60/min öffentlich, 300/min angemeldet, 1000/min Org-API)'),
};

const json = <T extends z.ZodType>(schema: T, description = 'OK') => ({ description, content: { 'application/json': { schema } } });

const id = z.string().meta({ description: 'cuid', examples: ['cm0abc123def456ghi789jkl'] });
const profile = z.record(z.string(), z.unknown()).meta({ id: 'WardProfile', description: 'Felder des Stationsprofils (Modul A), aufgelöst inkl. Überschreibungen der Stelle' });
const conditionResult = z.object({ condition: conditionSchema, state: z.enum(['met', 'unmet', 'unknown']), actual: z.unknown() }).meta({ id: 'ConditionResult' });

const jobHit = z
  .object({
    id,
    title: z.string(),
    profession: z.enum(Profession),
    workloadMinPct: z.number().int(),
    workloadMaxPct: z.number().int(),
    startDate: z.string().nullable(),
    publishedAt: z.string().nullable(),
    allowsPendingRecog: z.boolean(),
    specialtyTitle: z.string().nullable(),
    trainingCategory: z.string().nullable(),
    ward: z.object({ id, name: z.string(), department: z.enum(Department), rosterPattern: z.array(z.enum(RosterCode)), confirmedAt: z.string() }),
    organization: z.object({ id, name: z.string() }),
    location: z.object({ city: z.string(), canton: z.string(), lat: z.number(), lng: z.number(), hasParking: z.boolean() }),
    profile,
    commuteMinutes: z.object({ PT: z.number().optional(), CAR: z.number().optional() }),
    conditions: z.array(conditionResult),
    stale: z.boolean(),
  })
  .meta({ id: 'JobHit' });

const realityAggregate = z.object({ field: z.string(), votes: z.number().int(), agreeShare: z.number(), teamValue: z.number().nullable(), deviates: z.boolean() }).meta({ id: 'RealityAggregate' });

const ward = z
  .object({
    id,
    name: z.string(),
    department: z.enum(Department),
    confirmedAt: z.string(),
    stale: z.boolean(),
    organization: z.object({ id, name: z.string() }),
    location: z.object({ name: z.string(), street: z.string(), postalCode: z.string(), city: z.string(), canton: z.string(), lat: z.number(), lng: z.number(), hasParking: z.boolean() }),
    profile,
    rosterPattern: z.array(z.enum(RosterCode)).meta({ description: 'Muster-Dienstplan, 28 Tage, ab Montag' }),
    reality: z.record(z.string(), realityAggregate).meta({ description: 'Nur Felder mit mindestens 5 Stimmen (AK-G1)' }),
    employerComments: z.array(z.object({ field: z.string(), body: z.string() })),
    benchmarks: z.array(z.object({ field: z.string(), wardValue: z.number(), medianValue: z.number(), peerCount: z.number().int() })).meta({ description: 'Nur ab 8 Vergleichsstationen' }),
    jobs: z.array(z.object({ id, title: z.string(), profession: z.enum(Profession), workloadMinPct: z.number(), workloadMaxPct: z.number() })),
    questions: z.array(z.object({ id, body: z.string(), answer: z.string().nullable(), answeredAt: z.string().nullable(), createdAt: z.string() })),
  })
  .meta({ id: 'Ward' });

const jobDetail = z
  .object({
    id,
    title: z.string(),
    profession: z.enum(Profession),
    workloadMinPct: z.number().int(),
    workloadMaxPct: z.number().int(),
    startDate: z.string().nullable(),
    publishedAt: z.string().nullable(),
    allowsPendingRecog: z.boolean(),
    training: z.object({
      recognized: z.boolean(),
      specialtyTitle: z.string().nullable(),
      trainingCategory: z.string().nullable(),
      maxCreditableYears: z.number().nullable(),
      weeklyHours: z.number().nullable(),
      structuredTrainingHoursWeek: z.number().nullable(),
      rotations: z.array(z.string()),
      assistantPositions: z.number().nullable(),
    }),
    profile,
    ward,
  })
  .meta({ id: 'JobDetail' });

const pass = z
  .object({
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().nullable(),
    profession: z.enum(Profession),
    yearsExperience: z.number().int(),
    workAuthorizedCh: z.boolean().nullable(),
    experiences: z.array(z.object({ department: z.enum(Department), years: z.number() })),
    languages: z.array(z.object({ language: z.string(), level: z.string() })),
    credentials: z.array(
      z.object({
        id,
        type: z.string(),
        title: z.string(),
        issuer: z.string().nullable(),
        issuedAt: z.string().nullable(),
        validUntil: z.string().nullable(),
        registry: z.string().nullable(),
        registryNumber: z.string().nullable(),
        status: z.enum(CredentialStatus),
        rejectReason: z.string().nullable(),
        file: z.object({ id, status: z.string(), mimeType: z.string() }).nullable(),
      }),
    ),
  })
  .meta({ id: 'Pass' });

const shift = z
  .object({
    id,
    startsAt: z.string(),
    endsAt: z.string(),
    code: z.enum(RosterCode),
    hourlyRateChf: z.number().int(),
    requirements: z.string().nullable(),
    status: z.enum(ShiftStatus),
    interestSent: z.boolean(),
    pool: z.object({ id, name: z.string(), bookingMode: z.string(), cancelDeadlineHours: z.number().int(), organization: z.string() }),
    ward: z.object({ id, name: z.string(), street: z.string(), postalCode: z.string(), city: z.string() }),
  })
  .meta({ id: 'Shift' });

const offer = z
  .object({
    id,
    status: z.enum(OfferStatus),
    salaryChf: z.number().int(),
    workloadPct: z.number().int(),
    startDate: z.string(),
    note: z.string().nullable(),
    expiresAt: z.string(),
    createdAt: z.string(),
    organization: z.object({ id, name: z.string() }),
    job: z.object({ id, title: z.string(), ward: z.object({ id, name: z.string() }), city: z.string() }),
  })
  .meta({ id: 'Offer' });

const myApplication = z
  .object({
    id,
    status: z.enum(ApplicationStatus),
    rejectionReason: z.string().nullable(),
    documentsShared: z.boolean(),
    createdAt: z.string(),
    statusChangedAt: z.string(),
    messages: z.number().int(),
    job: z.object({ id, title: z.string(), ward: z.string(), organization: z.string(), city: z.string() }),
  })
  .meta({ id: 'MyApplication' });

const orgApplication = z
  .object({
    id,
    status: z.enum(ApplicationStatus),
    rejectionReason: z.string().nullable(),
    createdAt: z.string(),
    statusChangedAt: z.string(),
    message: z.string().nullable(),
    documentsShared: z.boolean(),
    job: z.object({ id, title: z.string(), externalRef: z.string().nullable() }),
    candidate: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string(),
      profession: z.enum(Profession),
      credentials: z.array(z.object({ type: z.string(), title: z.string(), status: z.enum(CredentialStatus), fileId: z.string().optional().meta({ description: 'Nur mit Freigabe der Fachperson (AK-D1)' }) })),
    }),
  })
  .meta({ id: 'OrgApplication' });

const filterParam = z
  .string()
  .optional()
  .meta({ description: `Suchfilter als base64url-codiertes JSON nach dem Schema SearchFilter (siehe components). Beispiel: {"profession":"NURSE_HF_FH","conditions":[{"key":"noNights","mode":"must"}]}` });

const session = [{ session: [] }, { bearer: [] }];
const apiKey = (scope: string) => [{ apiKey: [scope] }, { session: [] }, { bearer: [] }];

let cached: ReturnType<typeof createDocument> | undefined;

export function openApiDocument(origin: string) {
  cached ??= createDocument(
    {
      openapi: '3.1.0',
      info: {
        title: 'Kardia API',
        version: '1.0.0',
        description: 'REST-API v1 von Kardia. Fehler als application/problem+json (RFC 9457). Alle Geldbeträge in ganzen CHF, Zeiten in UTC.',
      },
      servers: [{ url: `${origin}/api/v1` }],
      components: {
        schemas: { SearchFilter: searchFilterSchema, Problem: problem },
        securitySchemes: {
          session: { type: 'apiKey', in: 'cookie', name: 'kardia.session_token', description: 'Sitzung der Web-App (Better Auth)' },
          bearer: { type: 'http', scheme: 'bearer', description: 'Better-Auth-Bearer-Token für native Clients' },
          apiKey: { type: 'http', scheme: 'bearer', bearerFormat: 'kdk_…', description: 'Org-API-Schlüssel mit Scopes jobs:write, applications:read (Abo Spitalgruppe)' },
        },
      },
      paths: {
        '/jobs': {
          get: {
            summary: 'Stellen suchen',
            requestParams: { query: z.object({ f: filterParam, cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).optional() }) },
            responses: {
              '200': json(z.object({ data: z.array(jobHit), total: z.number().int(), nextCursor: z.string().nullable(), suggestion: z.object({ removeKey: z.string(), relaxedValue: z.number().nullable(), count: z.number().int() }).nullable() })),
              '429': errors['429'],
            },
          },
        },
        '/jobs/{id}': {
          get: { summary: 'Stelle mit aufgelöstem Stationsprofil', requestParams: { path: z.object({ id }) }, responses: { '200': json(jobDetail), '404': errors['404'] } },
        },
        '/wards/{id}': {
          get: { summary: 'Stationsprofil', requestParams: { path: z.object({ id }) }, responses: { '200': json(ward), '404': errors['404'] } },
        },
        '/applications': {
          post: {
            summary: 'Ein-Klick-Bewerbung',
            security: session,
            requestBody: { content: { 'application/json': { schema: applicationInputSchema } } },
            responses: { '201': json(z.object({ id, status: z.enum(ApplicationStatus), createdAt: z.string() }), 'Erstellt'), '401': errors['401'], '409': problemResponse('Bereits beworben oder Pass fehlt'), '422': errors['422'] },
          },
        },
        '/me/applications': {
          get: { summary: 'Eigene Bewerbungen', security: session, responses: { '200': json(z.object({ data: z.array(myApplication) })), '401': errors['401'] } },
        },
        '/me/pass': {
          get: { summary: 'Qualifikations-Pass', security: session, responses: { '200': json(pass), '401': errors['401'], '404': errors['404'] } },
          put: {
            summary: 'Qualifikations-Pass setzen',
            security: session,
            requestBody: { content: { 'application/json': { schema: passInputSchema } } },
            responses: { '200': json(pass), '401': errors['401'], '422': errors['422'] },
          },
        },
        '/files/upload-url': {
          post: {
            summary: 'Signierte Upload-URL (10 min)',
            security: session,
            requestBody: { content: { 'application/json': { schema: uploadRequestSchema } } },
            responses: { '201': json(z.object({ fileId: id, uploadUrl: z.string(), headers: z.record(z.string(), z.string()) }), 'Erstellt'), '401': errors['401'], '422': errors['422'] },
          },
        },
        '/files/{id}/complete': {
          post: { summary: 'Upload abgeschlossen → Prüfung', security: session, requestParams: { path: z.object({ id }) }, responses: { '200': json(z.object({ id, status: z.string() })), '404': errors['404'] } },
        },
        '/me/offers': {
          get: { summary: 'Angebote an mich', security: session, responses: { '200': json(z.object({ data: z.array(offer) })), '401': errors['401'] } },
        },
        '/me/offers/{id}/respond': {
          post: {
            summary: 'Angebot beantworten',
            security: session,
            requestParams: { path: z.object({ id }) },
            requestBody: { content: { 'application/json': { schema: offerResponseSchema } } },
            responses: { '200': json(z.object({ status: z.enum(['INTERESTED', 'DECLINED']), applicationId: z.string().nullable() })), '409': problemResponse('Angebot nicht mehr offen'), '422': errors['422'] },
          },
        },
        '/me/shifts': {
          get: { summary: 'Offene und gebuchte Flex-Schichten', security: session, responses: { '200': json(z.object({ open: z.array(shift), booked: z.array(shift) })), '401': errors['401'] } },
        },
        '/me/shifts.ics': {
          get: { summary: 'Gebuchte Schichten als Kalender (ICS)', security: session, responses: { '200': { description: 'iCalendar', content: { 'text/calendar': { schema: z.string() } } }, '401': errors['401'] } },
        },
        '/shifts/{id}/book': {
          post: {
            summary: 'Schicht buchen (wer zuerst bestätigt) oder Interesse anmelden',
            security: session,
            requestParams: { path: z.object({ id }) },
            responses: { '200': json(z.object({ status: z.enum(['BOOKED', 'INTEREST']) })), '403': errors['403'], '409': problemResponse('Schicht bereits vergeben (shiftTaken)') },
          },
        },
        '/org/jobs': {
          post: {
            summary: 'Stelle als Entwurf anlegen',
            security: apiKey('jobs:write'),
            requestBody: { content: { 'application/json': { schema: jobInputSchema } } },
            responses: { '201': json(z.object({ id, status: z.string(), createdAt: z.string() }), 'Erstellt'), '403': errors['403'], '422': errors['422'] },
          },
        },
        '/org/jobs/{id}': {
          patch: {
            summary: 'Stelle ändern oder veröffentlichen',
            security: apiKey('jobs:write'),
            requestParams: { path: z.object({ id }) },
            requestBody: { content: { 'application/json': { schema: jobPatchSchema } } },
            responses: { '200': json(z.object({ id, status: z.string(), publishedAt: z.string().nullable(), updatedAt: z.string() })), '404': errors['404'], '422': problemResponse('Ungültig oder Veröffentlichung blockiert (publishBlocked)') },
          },
        },
        '/org/applications': {
          get: {
            summary: 'Bewerbungen für ATS-Abgleich',
            security: apiKey('applications:read'),
            requestParams: { query: z.object({ since: z.string().optional().meta({ description: 'ISO-Zeitpunkt, Statusänderungen ab' }), cursor: z.string().optional() }) },
            responses: { '200': json(z.object({ data: z.array(orgApplication), nextCursor: z.string().nullable() })), '403': errors['403'] },
          },
        },
      },
    },
    { allowEmptySchema: { custom: true, unknown: true } },
  );
  return cached;
}
