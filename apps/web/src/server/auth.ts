import 'server-only';

import { passkey } from '@better-auth/passkey';
import { sso } from '@better-auth/sso';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { bearer, magicLink } from 'better-auth/plugins';

import { QUEUES, SESSION_MAX_AGE_SEC } from '@kardia/core';

import { db } from './db.ts';
import { captureDemoLink } from './demoLogin.ts';
import { env } from './env.ts';
import { enqueue } from './queue.ts';

/**
 * Better Auth (PRD 10.1, 14.2): passwortlos mit Passkeys und E-Mail-Link, Bearer-Tokens
 * für die spätere native App, SAML/OIDC für Spitalgruppen. Sitzungen 30 Tage; Admins
 * nur mit Passkey und höchstens 12 h (geprüft in `requireAdmin`).
 */
function createAuth() {
  const e = env();
  return betterAuth({
    appName: 'Kardia',
    baseURL: e.APP_ORIGIN,
    secret: e.BETTER_AUTH_SECRET,
    database: prismaAdapter(db, { provider: 'postgresql' }),
    emailAndPassword: { enabled: false },
    session: {
      expiresIn: SESSION_MAX_AGE_SEC,
      updateAge: 24 * 3600,
      additionalFields: { authMethod: { type: 'string', required: false, input: false } },
    },
    user: {
      additionalFields: {
        locale: { type: 'string', required: false, input: false, defaultValue: 'DE_CH' },
        isAdmin: { type: 'boolean', required: false, input: false, defaultValue: false },
        // In der Sitzung lesbar, damit getSession das Aktivitätsdatum nur einmal pro Tag schreibt.
        lastActiveAt: { type: 'date', required: false, input: false },
      },
    },
    advanced: {
      cookiePrefix: 'kardia',
      useSecureCookies: e.APP_ORIGIN.startsWith('https://'),
    },
    rateLimit: { enabled: !e.RATE_LIMIT_DISABLED, window: 60, max: 30, storage: 'memory' },
    databaseHooks: {
      session: {
        create: {
          before: async (session, ctx) => {
            const path = ctx?.path ?? '';
            const authMethod = path.startsWith('/passkey')
              ? 'passkey'
              : path.startsWith('/magic-link')
                ? 'magic-link'
                : path.startsWith('/sso')
                  ? 'sso'
                  : null;
            return { data: { ...session, authMethod } };
          },
        },
      },
    },
    plugins: [
      magicLink({
        expiresIn: 15 * 60,
        sendMagicLink: async ({ email, url }) => {
          // Demo-Umgebung: Link für die Ein-Klick-Anmeldung abfangen statt verschicken.
          if (e.DEMO_LOGIN && captureDemoLink(email, url)) return;
          const user = await db.user.findUnique({ where: { email }, include: { passkeys: { select: { id: true } } } });
          // Admins melden sich nur mit Passkey an; der E-Mail-Link dient nur der Ersteinrichtung.
          if (user?.isAdmin && user.passkeys.length > 0) return;
          // Entwicklung und E2E-Tests (nur gegen localhost): Link in eine Datei schreiben.
          const linkFile =
            e.NODE_ENV !== 'production'
              ? (process.env.DEV_MAGIC_LINK_FILE ?? '/tmp/kardia-magic-links.log')
              : e.APP_ORIGIN.startsWith('http://localhost')
                ? process.env.E2E_MAGIC_LINK_FILE
                : undefined;
          if (linkFile) {
            console.warn(`[dev] Anmeldelink für ${email}: ${url}`);
            const { appendFile } = await import('node:fs/promises');
            await appendFile(linkFile, `${email} ${url}\n`).catch(() => undefined);
          }
          await enqueue(QUEUES.emailSend, { template: 'magic-link', to: email, data: { url } });
        },
      }),
      passkey({ rpID: e.PASSKEY_RP_ID, rpName: 'Kardia', origin: e.APP_ORIGIN }),
      // SAML/OIDC nur ab Abo "Spitalgruppe"; Anbieter legt der Owner im Cockpit an.
      sso({
        // Anbieter werden nur über das Cockpit registriert (services/org.ts), einer je Organisation.
        providersLimit: 1,
        provisionUserOnEveryLogin: true,
        // Wer sich per Firmen-Login anmeldet, wird Mitglied mit den geringsten Rechten;
        // die Owner-Person vergibt danach die passende Rolle.
        provisionUser: async ({ user, provider }) => {
          const orgId = (provider as { organizationId?: string | null }).organizationId;
          if (!orgId) return;
          await db.orgMember.upsert({
            where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
            create: { organizationId: orgId, userId: user.id, role: 'VIEWER' },
            update: {},
          });
        },
      }),
      bearer(),
      nextCookies(),
    ],
  });
}

const globalForAuth = globalThis as unknown as { kardiaAuth?: ReturnType<typeof createAuth> };

export function auth(): ReturnType<typeof createAuth> {
  globalForAuth.kardiaAuth ??= createAuth();
  return globalForAuth.kardiaAuth;
}
