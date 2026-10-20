'use server';

import { cookies } from 'next/headers';

import { DB_LOCALE, LOCALE_COOKIE, isLocale } from '@/i18n/config';
import { THEME_COOKIE, parseTheme } from '@/lib/theme';
import { db } from '@/server/db';
import { getSession } from '@/server/session';

const YEAR = 365 * 24 * 3600;

/** Sprache wählen: Cookie (technisch notwendig, kein Banner nötig) + Profil bei Anmeldung. */
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: YEAR, sameSite: 'lax' });
  const s = await getSession();
  if (s) await db.user.update({ where: { id: s.user.id }, data: { locale: DB_LOCALE[locale] } });
}

/** Dunkelmodus folgt prefers-color-scheme und ist manuell umschaltbar (PRD 8.2). */
export async function setTheme(theme: string): Promise<void> {
  const value = parseTheme(theme);
  const jar = await cookies();
  if (value === 'system') jar.delete(THEME_COOKIE);
  else jar.set(THEME_COOKIE, value, { path: '/', maxAge: YEAR, sameSite: 'lax' });
}
