import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import { openApiDocument } from '@/server/openapi';

describe('OpenAPI 3.1 (PRD 12.1)', () => {
  it('beschreibt alle Routen der REST-API v1 mit Problem-Schema und Sicherheitsschemata', () => {
    const doc = openApiDocument('https://kardia.example') as { openapi: string; paths: Record<string, object>; components: { schemas: Record<string, object>; securitySchemes: Record<string, object> } };
    expect(doc.openapi).toBe('3.1.0');
    expect(Object.keys(doc.paths).sort()).toEqual(
      [
        '/applications',
        '/files/upload-url',
        '/files/{id}/complete',
        '/jobs',
        '/jobs/{id}',
        '/me/account',
        '/me/applications',
        '/me/applications/{id}/messages',
        '/me/applications/{id}/withdraw',
        '/me/export',
        '/me/marketplace',
        '/me/marketplace/blocks',
        '/me/offers',
        '/me/offers/{id}/respond',
        '/me/pass',
        '/me/pass/credentials',
        '/me/pass/credentials/{id}',
        '/me/push-subscriptions',
        '/me/saved',
        '/me/saved-searches',
        '/me/saved-searches/{id}',
        '/me/saved/{jobId}',
        '/me/shifts',
        '/me/shifts/{id}/cancel',
        '/me/shifts.ics',
        '/org/applications',
        '/org/jobs',
        '/org/jobs/{id}',
        '/shifts/{id}/book',
        '/wards/{id}',
      ].sort(),
    );
    expect(doc.components.schemas).toHaveProperty('Problem');
    expect(doc.components.schemas).toHaveProperty('SearchFilter');
    expect(Object.keys(doc.components.securitySchemes).sort()).toEqual(['apiKey', 'bearer', 'session']);
    expect(JSON.stringify(doc.paths['/shifts/{id}/book'])).toContain('application/problem+json');
    // API-first (PRD 13.4): jede Route unter /api/v1 ist im Dokument beschrieben.
    expect(doc.components.schemas).toHaveProperty('Credential');
    expect(doc.components.schemas).toHaveProperty('SavedSearch');
  });

  it('enthält jede Route unter src/app/api/v1 (API-first, PRD 13.4)', () => {
    const root = join(__dirname, '../../src/app/api/v1');
    const routes = (readdirSync(root, { recursive: true }) as string[])
      .filter((f) => f.endsWith(`${sep}route.ts`) || f === 'route.ts')
      .map((f) => `/${relative('.', f).split(sep).slice(0, -1).join('/')}`.replace(/\[(\w+)\]/g, '{$1}'))
      .filter((p) => p !== '/openapi.json');
    const doc = openApiDocument('https://kardia.example') as { paths: Record<string, object> };
    expect(routes.filter((r) => !(r in doc.paths))).toEqual([]);
  });
});
