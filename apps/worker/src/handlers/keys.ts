import { decryptField, encryptField, needsReencryption } from '@kardia/core/crypto';

import { db } from '../context.ts';

/**
 * Schlüsselrotation (PRD 14.1, jährlich): Felder, die mit einem älteren Schlüssel
 * verschlüsselt sind, werden mit dem aktiven Schlüssel neu verschlüsselt. Der alte
 * Schlüssel bleibt in FIELD_ENCRYPTION_KEYS, bis dieser Lauf 0 meldet.
 */
const BATCH = 500;

async function rotate<T extends { id: string }>(
  rows: T[],
  get: (row: T) => string | null,
  save: (id: string, value: string) => Promise<unknown>,
): Promise<number> {
  let n = 0;
  for (const row of rows) {
    const value = get(row);
    if (!value || !needsReencryption(value)) continue;
    await save(row.id, encryptField(decryptField(value)));
    n++;
  }
  return n;
}

export async function handleKeyRotation(): Promise<Record<string, number>> {
  const d = db();
  const result = { phone: 0, registryNumber: 0, message: 0, webhookSecret: 0 };
  let cursor: string | undefined;
  do {
    const rows = await d.candidateProfile.findMany({ where: { phone: { not: null } }, select: { id: true, phone: true }, take: BATCH, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), orderBy: { id: 'asc' } });
    result.phone += await rotate(rows, (r) => r.phone, (id, v) => d.candidateProfile.update({ where: { id }, data: { phone: v } }));
    cursor = rows.length === BATCH ? rows.at(-1)?.id : undefined;
  } while (cursor);
  do {
    const rows = await d.credential.findMany({ where: { registryNumber: { not: null } }, select: { id: true, registryNumber: true }, take: BATCH, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), orderBy: { id: 'asc' } });
    result.registryNumber += await rotate(rows, (r) => r.registryNumber, (id, v) => d.credential.update({ where: { id }, data: { registryNumber: v } }));
    cursor = rows.length === BATCH ? rows.at(-1)?.id : undefined;
  } while (cursor);
  do {
    const rows = await d.message.findMany({ select: { id: true, body: true }, take: BATCH, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), orderBy: { id: 'asc' } });
    result.message += await rotate(rows, (r) => r.body, (id, v) => d.message.update({ where: { id }, data: { body: v } }));
    cursor = rows.length === BATCH ? rows.at(-1)?.id : undefined;
  } while (cursor);
  const hooks = await d.webhookEndpoint.findMany({ select: { id: true, secret: true } });
  result.webhookSecret = await rotate(hooks, (r) => r.secret, (id, v) => d.webhookEndpoint.update({ where: { id }, data: { secret: v } }));
  return result;
}
