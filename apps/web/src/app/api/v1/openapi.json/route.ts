import { NextResponse } from 'next/server';

import { openApiDocument } from '@/server/openapi';

/** GET /api/v1/openapi.json – OpenAPI 3.1, generiert aus den Zod-Schemas. */
export function GET() {
  return NextResponse.json(openApiDocument(process.env.APP_ORIGIN ?? 'http://localhost:3000'), {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}
