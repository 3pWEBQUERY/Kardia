'use client';

import { passkeyClient } from '@better-auth/passkey/client';
import { magicLinkClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/** Better-Auth-Client: Passkey und E-Mail-Link, kein Passwort (PRD 7.3). */
export const authClient = createAuthClient({ plugins: [magicLinkClient(), passkeyClient()] });
