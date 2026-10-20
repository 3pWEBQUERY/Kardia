import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

/**
 * Feldverschlüsselung (PRD 14.1): `phone`, `registryNumber`, Nachrichtentexte und
 * Webhook-Secrets mit AES-256-GCM auf Anwendungsebene. Format `v1:<kid>:<iv>:<tag>:<ct>`
 * (base64url). Schlüssel als Railway-Secret `FIELD_ENCRYPTION_KEYS` = "kid:base64,…";
 * der erste ist aktiv, ältere bleiben zum Entschlüsseln (jährliche Rotation).
 */

interface Keyring {
  active: { id: string; key: Buffer };
  all: Map<string, Buffer>;
}

let cached: { source: string; ring: Keyring } | undefined;

function keyring(): Keyring {
  const source = process.env.FIELD_ENCRYPTION_KEYS ?? '';
  if (cached?.source === source) return cached.ring;
  const entries = source
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [id, b64] = entry.split(':');
      if (!id || !b64) throw new Error('FIELD_ENCRYPTION_KEYS: Format "kid:base64" erwartet.');
      const key = Buffer.from(b64, 'base64');
      if (key.length !== 32) throw new Error(`Schlüssel ${id} muss 32 Byte lang sein.`);
      return [id, key] as const;
    });
  const first = entries[0];
  if (!first) throw new Error('FIELD_ENCRYPTION_KEYS ist nicht gesetzt.');
  const ring = { active: { id: first[0], key: first[1] }, all: new Map(entries) };
  cached = { source, ring };
  return ring;
}

export function encryptField(plain: string): string {
  const { active } = keyring();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', active.key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    'v1',
    active.id,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ct.toString('base64url'),
  ].join(':');
}

export function decryptField(value: string): string {
  const [version, kid, iv, tag, ct] = value.split(':');
  if (version !== 'v1' || !kid || !iv || !tag || ct === undefined) {
    throw new Error('Unbekanntes Format eines verschlüsselten Felds.');
  }
  const key = keyring().all.get(kid);
  if (!key) throw new Error(`Schlüssel ${kid} ist nicht mehr vorhanden.`);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]).toString(
    'utf8',
  );
}

export function encryptOptional(plain: string | null | undefined): string | null {
  return plain == null || plain === '' ? null : encryptField(plain);
}

export function decryptOptional(value: string | null | undefined): string | null {
  return value == null ? null : decryptField(value);
}

/** Ist ein Wert bereits verschlüsselt? (für die Schlüsselrotation im Worker) */
export function isEncrypted(value: string): boolean {
  return value.startsWith('v1:');
}

export function needsReencryption(value: string): boolean {
  return isEncrypted(value) && value.split(':')[1] !== keyring().active.id;
}

export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

export function hmacSha256Hex(secret: string, input: string): string {
  return createHmac('sha256', secret).update(input).digest('hex');
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Realitäts-Check (AK-G1): Stimmen werden nur über einen HMAC aus Person und Station
 * gespeichert. Gleiche Person → gleicher Hash (eine Stimme je Feld), aber ohne
 * Secret ist keine Rückrechnung auf die Person möglich.
 */
export function voterHash(userId: string, wardId: string): string {
  const secret = process.env.VOTER_HASH_SECRET;
  if (!secret) throw new Error('VOTER_HASH_SECRET ist nicht gesetzt.');
  return hmacSha256Hex(secret, `${wardId}:${userId}`);
}

/** API-Schlüssel (PRD 12.1): Klartext nur einmal anzeigen, gespeichert wird der SHA-256. */
export function generateApiKey(): { plain: string; prefix: string; hash: string } {
  const plain = `kdk_${randomToken(30)}`;
  return { plain, prefix: plain.slice(0, 8), hash: sha256Hex(plain) };
}

/** Webhook-Signatur (PRD 12.2): `t=<unix>,v1=<hmac(t.body)>` im Header `Kardia-Signature`. */
export function signWebhook(
  secret: string,
  body: string,
  timestamp = Math.floor(Date.now() / 1000),
): string {
  return `t=${timestamp},v1=${hmacSha256Hex(secret, `${timestamp}.${body}`)}`;
}

export function verifyWebhookSignature(
  secret: string,
  body: string,
  header: string,
  toleranceSec = 300,
): boolean {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const t = Number(parts.t);
  if (!Number.isFinite(t) || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  return safeEqualHex(hmacSha256Hex(secret, `${t}.${body}`), parts.v1);
}

/**
 * Marktplatz-Referenz (AK-E1): deterministisch pro Organisation (gleiches Profil →
 * gleiche Ref für denselben Arbeitgeber), über Organisationen hinweg nicht verknüpfbar
 * und nur serverseitig auflösbar. IV = HMAC(org, kandidat), damit die Ref stabil bleibt.
 */
export function marketplaceRef(organizationId: string, candidateId: string): string {
  const { active } = keyring();
  const iv = Buffer.from(
    hmacSha256Hex(active.key.toString('hex'), `${organizationId}:${candidateId}`),
    'hex',
  ).subarray(0, 12);
  const cipher = createCipheriv('aes-256-gcm', active.key, iv);
  cipher.setAAD(Buffer.from(organizationId));
  const ct = Buffer.concat([cipher.update(candidateId, 'utf8'), cipher.final()]);
  return `${active.id}.${Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64url')}`;
}

export function resolveMarketplaceRef(organizationId: string, ref: string): string | null {
  const [kid, payload] = ref.split('.');
  const key = kid ? keyring().all.get(kid) : undefined;
  if (!key || !payload) return null;
  try {
    const buf = Buffer.from(payload, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
    decipher.setAAD(Buffer.from(organizationId));
    decipher.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
