import 'server-only';

import { decryptOptional } from '@kardia/core/crypto';

import type { Credential } from '@kardia/db';

/** Nachweis in der API-Darstellung (Registernummer entschlüsselt, nur für die eigene Person). */
export function credentialView(c: Credential) {
  return {
    id: c.id,
    type: c.type,
    title: c.title,
    issuer: c.issuer,
    issuedAt: c.issuedAt,
    validUntil: c.validUntil,
    registry: c.registry,
    registryNumber: decryptOptional(c.registryNumber),
    status: c.status,
    rejectReason: c.rejectReason,
    fileId: c.fileId,
  };
}
