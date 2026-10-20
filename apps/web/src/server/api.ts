import 'server-only';

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { ProblemError, zodProblem, type Problem } from '@kardia/core';
import { safeEqualHex, sha256Hex } from '@kardia/core/crypto';

import { auth } from './auth.ts';
import { db } from './db.ts';
import { consume, LIMITS } from './ratelimit.ts';

/**
 * REST-API v1 (PRD 12.1): JSON, Fehler als RFC 9457 `application/problem+json`,
 * Rate Limits, Auth über Sitzung/Bearer oder Org-API-Schlüssel mit Scopes.
 */

export type ApiScope = 'jobs:write' | 'applications:read';

export interface ApiPrincipal {
  kind: 'anonymous' | 'user' | 'apiKey';
  userId: string | null;
  organizationId: string | null;
  scopes: ApiScope[];
  ip: string;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return fwd?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0.0.0.0';
}

export function problemResponse(problem: Problem, headers?: HeadersInit): NextResponse {
  const h = new Headers(headers);
  h.set('Content-Type', 'application/problem+json');
  return NextResponse.json(problem, { status: problem.status, headers: h });
}

async function principal(req: Request): Promise<ApiPrincipal> {
  const ip = clientIp(req);
  const authz = req.headers.get('authorization') ?? '';
  if (authz.startsWith('Bearer kdk_')) {
    const plain = authz.slice('Bearer '.length).trim();
    const hash = sha256Hex(plain);
    const key = await db.apiKey.findUnique({ where: { keyHash: hash } });
    if (!key || key.revokedAt || !safeEqualHex(key.keyHash, hash)) throw new ProblemError('unauthorized', 'API-Schlüssel ungültig oder widerrufen.');
    void db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
    return { kind: 'apiKey', userId: null, organizationId: key.organizationId, scopes: key.scopes.filter((x): x is ApiScope => x === 'jobs:write' || x === 'applications:read'), ip };
  }
  const session = await auth().api.getSession({ headers: req.headers });
  if (session) return { kind: 'user', userId: session.user.id, organizationId: null, scopes: [], ip };
  return { kind: 'anonymous', userId: null, organizationId: null, scopes: [], ip };
}

type Handler<P> = (ctx: {
  req: NextRequest;
  params: P;
  who: ApiPrincipal;
}) => Promise<unknown>;

/** Einheitlicher Wrapper: Rate Limit, Principal, Problem-Antworten, JSON-Serialisierung. */
export function api<P = Record<string, string>>(handler: Handler<P>) {
  return async (req: NextRequest, ctx: { params: Promise<P> }): Promise<Response> => {
    try {
      const who = await principal(req);
      const limit = who.kind === 'apiKey' ? LIMITS.orgApi : who.kind === 'user' ? LIMITS.user : LIMITS.public;
      const bucket = who.kind === 'apiKey' ? `org:${who.organizationId}` : who.kind === 'user' ? `user:${who.userId}` : `ip:${who.ip}`;
      const rl = await consume(bucket, limit);
      if (!rl.ok) {
        return problemResponse(new ProblemError('rateLimited').toProblem(req.nextUrl.pathname), { 'Retry-After': '60' });
      }
      const result = await handler({ req, params: await ctx.params, who });
      if (result instanceof Response) {
        try {
          result.headers.set('X-RateLimit-Remaining', String(rl.remaining));
        } catch {
          // Unveränderliche Header (z. B. Response.redirect) – Header entfällt.
        }
        return result;
      }
      return NextResponse.json(result, { headers: { 'X-RateLimit-Remaining': String(rl.remaining) } });
    } catch (error) {
      if (error instanceof ProblemError) return problemResponse(error.toProblem(req.nextUrl.pathname));
      if (error instanceof z.ZodError) return problemResponse(zodProblem(error).toProblem(req.nextUrl.pathname));
      console.error(error);
      return problemResponse(new ProblemError('internal').toProblem(req.nextUrl.pathname));
    }
  };
}

export function requireUserPrincipal(who: ApiPrincipal): string {
  if (who.kind !== 'user' || !who.userId) throw new ProblemError('unauthorized');
  return who.userId;
}

export function requireScope(who: ApiPrincipal, scope: ApiScope): string {
  if (who.kind !== 'apiKey' || !who.organizationId || !who.scopes.includes(scope)) {
    throw new ProblemError('forbidden', `Scope ${scope} erforderlich.`);
  }
  return who.organizationId;
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ProblemError('validation', 'Der Anfragekörper ist kein gültiges JSON.');
  }
}
