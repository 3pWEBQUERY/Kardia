import type { ErrorEvent } from '@sentry/nextjs';

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE = /\+?\d[\d\s/-]{7,}\d/g;
const SECRET_PARAMS = /([?&](token|code|X-Amz-Signature|X-Amz-Credential|callbackURL)=)[^&#]+/gi;

function clean(text: string): string {
  return text.replace(EMAIL, '[email]').replace(PHONE, '[telefon]').replace(SECRET_PARAMS, '$1[entfernt]');
}

/** Scrubbing (PRD 12.4): keine Personendaten, keine Cookies, keine Request-Bodies, keine Tokens in URLs. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    if (event.request.headers) {
      const drop = new Set(['cookie', 'authorization', 'x-forwarded-for', 'x-real-ip']);
      event.request.headers = Object.fromEntries(Object.entries(event.request.headers).filter(([k]) => !drop.has(k.toLowerCase())));
    }
    if (event.request.url) event.request.url = clean(event.request.url);
    if (typeof event.request.query_string === 'string') event.request.query_string = clean(event.request.query_string);
  }
  if (event.message) event.message = clean(event.message);
  for (const ex of event.exception?.values ?? []) if (ex.value) ex.value = clean(ex.value);
  for (const b of event.breadcrumbs ?? []) if (b.message) b.message = clean(b.message);
  return event;
}
