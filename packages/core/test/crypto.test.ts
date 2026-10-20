import { randomBytes } from 'node:crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  decryptField,
  encryptField,
  marketplaceRef,
  resolveMarketplaceRef,
  signWebhook,
  verifyWebhookSignature,
  voterHash,
} from '../src/crypto.ts';

beforeAll(() => {
  process.env.FIELD_ENCRYPTION_KEYS = `k2:${randomBytes(32).toString('base64')},k1:${randomBytes(32).toString('base64')}`;
  process.env.VOTER_HASH_SECRET = 'test-secret';
});

describe('Feldverschlüsselung', () => {
  it('verschlüsselt mit AES-256-GCM und entschlüsselt wieder', () => {
    const enc = encryptField('+41 79 123 45 67');
    expect(enc.startsWith('v1:k2:')).toBe(true);
    expect(enc).not.toContain('123');
    expect(decryptField(enc)).toBe('+41 79 123 45 67');
  });

  it('erkennt Manipulation', () => {
    const enc = encryptField('geheim');
    const parts = enc.split(':');
    parts[4] = Buffer.from('anders').toString('base64url');
    expect(() => decryptField(parts.join(':'))).toThrow();
  });

  it('Marktplatz-Refs sind pro Organisation stabil und nicht übertragbar', () => {
    const a = marketplaceRef('org-a', 'cand-1');
    expect(marketplaceRef('org-a', 'cand-1')).toBe(a);
    expect(marketplaceRef('org-b', 'cand-1')).not.toBe(a);
    expect(resolveMarketplaceRef('org-a', a)).toBe('cand-1');
    expect(resolveMarketplaceRef('org-b', a)).toBeNull();
  });

  it('Voter-Hash ist deterministisch, aber nicht die User-ID', () => {
    expect(voterHash('u1', 'w1')).toBe(voterHash('u1', 'w1'));
    expect(voterHash('u1', 'w1')).not.toContain('u1');
    expect(voterHash('u1', 'w1')).not.toBe(voterHash('u1', 'w2'));
  });

  it('Webhook-Signatur', () => {
    const header = signWebhook('s3cret', '{"a":1}');
    expect(verifyWebhookSignature('s3cret', '{"a":1}', header)).toBe(true);
    expect(verifyWebhookSignature('s3cret', '{"a":2}', header)).toBe(false);
  });
});
