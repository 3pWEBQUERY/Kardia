import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, NAMESPACES, isLocale, type AppLocale } from './config.ts';

type Messages = Record<string, unknown>;

function merge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(override)) {
    const b = out[k];
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' ? merge(b as Messages, v as Messages) : v;
  }
  return out;
}

async function load(locale: AppLocale): Promise<Messages> {
  const parts = await Promise.all(
    NAMESPACES.map(async (ns) => {
      try {
        const mod = (await import(`../../messages/${locale}/${ns}.json`)) as { default: Messages };
        return [ns, mod.default] as const;
      } catch {
        return [ns, {}] as const;
      }
    }),
  );
  return Object.fromEntries(parts);
}

function fromAcceptLanguage(header: string | null): AppLocale | null {
  if (!header) return null;
  for (const part of header.split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase() ?? '';
    const hit = LOCALES.find((l) => l.toLowerCase() === tag) ?? LOCALES.find((l) => l.slice(0, 2) === tag.slice(0, 2));
    if (hit) return hit;
  }
  return null;
}

/** Sprache aus Cookie, sonst Accept-Language; fehlende Texte fallen auf de-CH zurück. */
export default getRequestConfig(async () => {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: AppLocale = isLocale(cookie) ? cookie : (fromAcceptLanguage((await headers()).get('accept-language')) ?? DEFAULT_LOCALE);
  const base = await load(DEFAULT_LOCALE);
  const messages = locale === DEFAULT_LOCALE ? base : merge(base, await load(locale));
  return {
    locale,
    messages,
    timeZone: 'Europe/Zurich',
    formats: {
      dateTime: { short: { day: '2-digit', month: '2-digit', year: 'numeric' }, time: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } },
    },
  };
});
