import 'server-only';

/**
 * Demo-Anmeldung (nur mit DEMO_LOGIN=1): Ein Klick meldet als eine der fiktiven
 * Seed-Personas an. Der Ablauf nutzt den echten E-Mail-Link-Flow; der Link wird
 * nur abgefangen statt verschickt. Andere Adressen sind ausgeschlossen.
 */
export const DEMO_PERSONAS = [
  { email: 'lea@example.ch', role: 'candidate', next: '/me' },
  { email: 'marco@example.ch', role: 'candidate', next: '/me' },
  { email: 'leitung@seefeld-ost.example', role: 'owner', next: '/employer' },
  { email: 'recruiting@seefeld-ost.example', role: 'recruiter', next: '/employer' },
  { email: 'leitung@praxis-keller.example', role: 'practice', next: '/employer' },
  // Admin-Konsole der Demo (SEED_ADMIN_EMAIL wie im Seed); requireAdmin akzeptiert dafür
  // im Demo-Modus eine E-Mail-Link-Sitzung statt Passkey.
  { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@kardia.local', role: 'admin', next: '/admin' },
] as const;

export type DemoPersona = (typeof DEMO_PERSONAS)[number];

const captured = new Map<string, string>();

export function isDemoPersona(email: string): boolean {
  return DEMO_PERSONAS.some((p) => p.email === email);
}

/** Vom sendMagicLink-Hook aufgerufen: true, wenn der Link abgefangen wurde (kein Versand). */
export function captureDemoLink(email: string, url: string): boolean {
  if (!captured.has(email)) return false;
  captured.set(email, url);
  return true;
}

export async function withCapturedLink(email: string, request: () => Promise<unknown>): Promise<string | null> {
  captured.set(email, '');
  try {
    await request();
    return captured.get(email) || null;
  } finally {
    captured.delete(email);
  }
}
