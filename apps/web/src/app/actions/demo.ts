'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/server/auth';
import { db } from '@/server/db';
import { DEMO_PERSONAS, withCapturedLink } from '@/server/demoLogin';
import { env } from '@/server/env';

/** Ein-Klick-Anmeldung als Seed-Persona; nur mit DEMO_LOGIN=1 und nur für die festen Demo-Adressen. */
export async function demoSignIn(formData: FormData): Promise<void> {
  const email = formData.get('email');
  const persona = DEMO_PERSONAS.find((p) => p.email === email);
  if (!env().DEMO_LOGIN || !persona) redirect('/sign-in');
  if (!(await db.user.findUnique({ where: { email: persona.email }, select: { id: true } }))) redirect('/sign-in?demo=missing');
  const h = await headers();
  const url = await withCapturedLink(persona.email, () =>
    auth().api.signInMagicLink({ body: { email: persona.email, callbackURL: persona.next }, headers: h }),
  );
  const token = url ? new URL(url).searchParams.get('token') : null;
  if (!token) redirect('/sign-in?demo=failed');
  // Token direkt hier einlösen: ohne callbackURL setzt Better Auth das Sitzungs-Cookie und
  // antwortet mit JSON; nextCookies() überträgt das Cookie in die Antwort der Server Action.
  // (Ein redirect() auf den Verify-Endpunkt würde Next serverseitig auflösen – ohne Cookie.)
  await auth().api.magicLinkVerify({ query: { token }, headers: h });
  redirect(persona.next);
}
