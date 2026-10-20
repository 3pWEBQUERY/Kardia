#!/usr/bin/env node
/**
 * Nur Entwicklung: meldet eine Adresse per E-Mail-Link an und schreibt die Cookies
 * in eine Cookie-Datei (curl-Format) bzw. gibt sie für Playwright als JSON aus.
 *   node scripts/dev-login.mjs lea@example.ch [base=http://localhost:3000] [--json]
 */
import { readFileSync } from 'node:fs';

const [email, base = 'http://localhost:3000'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const asJson = process.argv.includes('--json');
const logFile = process.env.DEV_MAGIC_LINK_FILE ?? '/tmp/kardia-magic-links.log';
if (!email) throw new Error('E-Mail fehlt');

const res = await fetch(`${base}/api/auth/sign-in/magic-link`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: base },
  body: JSON.stringify({ email, callbackURL: '/me' }),
});
if (!res.ok) throw new Error(`Magic-Link fehlgeschlagen: ${res.status} ${await res.text()}`);
await new Promise((r) => setTimeout(r, 800));
const line = readFileSync(logFile, 'utf8').trim().split('\n').reverse().find((l) => l.startsWith(`${email} `));
if (!line) throw new Error('Kein Link im Log gefunden');
const url = line.split(' ')[1];
const verify = await fetch(url, { redirect: 'manual', headers: { origin: base } });
const cookies = verify.headers.getSetCookie().map((c) => c.split(';')[0]);
if (!cookies.length) throw new Error(`Keine Cookies erhalten (${verify.status})`);
if (asJson) {
  const host = new URL(base).hostname;
  console.log(JSON.stringify(cookies.map((c) => { const [name, ...v] = c.split('='); return { name, value: v.join('='), domain: host, path: '/' }; })));
} else {
  console.log(cookies.join('; '));
}
