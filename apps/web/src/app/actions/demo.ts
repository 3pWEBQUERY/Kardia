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
  if (!url) redirect('/sign-in?demo=failed');
  // Nur den Pfad übernehmen: der Verify-Endpunkt liegt immer auf der eigenen Origin.
  const target = new URL(url);
  redirect(`${target.pathname}${target.search}`);
}
