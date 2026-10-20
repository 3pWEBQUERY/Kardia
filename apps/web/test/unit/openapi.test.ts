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
        '/me/applications',
        '/me/offers',
        '/me/offers/{id}/respond',
        '/me/pass',
        '/me/shifts',
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
  });
});
