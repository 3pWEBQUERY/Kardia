'use client';

import { passkeyClient } from '@better-auth/passkey/client';
import { ssoClient } from '@better-auth/sso/client';
import { magicLinkClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/** Better-Auth-Client: Passkey, E-Mail-Link und Firmen-Login (SSO), kein Passwort (PRD 7.3). */
export const authClient = createAuthClient({ plugins: [magicLinkClient(), passkeyClient(), ssoClient()] });
