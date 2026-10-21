import { formatDateTime } from '@kardia/core';

import { log } from '../context.ts';
import { EMAIL_TEXT, emailLocale, type EmailLocale } from '../emails/strings.ts';
import { isTemplate, renderEmail, type Audience } from '../emails/templates.tsx';
import { sendMail } from '../lib/mail.ts';
import { pushToUser, type PushMessage } from '../lib/push.ts';
import { localeForEmail, orgRecipients, userContact } from '../lib/recipients.ts';

export interface EmailJob {
  template: string;
  to?: string;
  userId?: string;
  orgId?: string;
  data: Record<string, unknown>;
}

/** E-Mail an Adresse, Person oder Organisation (Owner + Recruiter), je in der Sprache der Person. */
export async function handleEmail(job: EmailJob): Promise<{ sent: number }> {
  if (!isTemplate(job.template)) {
    log.warn('Unbekannte E-Mail-Vorlage', { template: job.template });
    return { sent: 0 };
  }
  const targets: { email: string; audience: Audience; locale: EmailLocale }[] = [];
  if (job.to)
    targets.push({
      email: job.to,
      audience: 'any',
      locale: emailLocale(await localeForEmail(job.to)),
    });
  if (job.userId) {
    const u = await userContact(job.userId);
    if (u) targets.push({ email: u.email, audience: 'candidate', locale: emailLocale(u.locale) });
  }
  if (job.orgId)
    for (const r of await orgRecipients(job.orgId))
      targets.push({ email: r.email, audience: 'employer', locale: emailLocale(r.locale) });
  let sent = 0;
  for (const t of targets) {
    const mail = await renderEmail(job.template, job.data, t.audience, t.locale);
    await sendMail(t.email, mail.subject, mail.html, mail.text);
    sent++;
  }
  return { sent };
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const when = (v: unknown) => (typeof v === 'string' || v instanceof Date ? formatDateTime(v) : '');

/** Kurztexte für Web Push je Ereignis (PRD 13.3), in der Sprache der Person. */
export function pushMessageFor(
  kind: string,
  data: Record<string, unknown>,
  locale: EmailLocale = 'de',
): PushMessage | null {
  const P = EMAIL_TEXT[locale].push;
  switch (kind) {
    case 'application.status':
      return {
        title: P.applicationStatus,
        body: str(data.jobTitle),
        url: `/me/applications/${str(data.applicationId)}`,
        tag: `app-${str(data.applicationId)}`,
      };
    case 'application.message':
      return {
        title: P.applicationMessage,
        body: str(data.jobTitle),
        url: `/me/applications/${str(data.applicationId)}`,
      };
    case 'offer.new':
      return {
        title: P.offerNew(str(data.orgName)),
        body: str(data.jobTitle),
        url: `/offers/${str(data.offerId)}`,
      };
    case 'offer.withdrawn':
      return {
        title: P.offerWithdrawn(str(data.orgName)),
        body: str(data.jobTitle),
        url: '/me/marketplace',
        tag: `offer-${str(data.offerId)}`,
      };
    case 'shift.new':
      return {
        title: P.shiftNew,
        body: `${str(data.wardName)} · ${when(data.startsAt)}`,
        url: '/me/shifts',
      };
    case 'shift.booked':
      return {
        title: P.shiftBooked,
        body: `${str(data.wardName)} · ${when(data.startsAt)}`,
        url: '/me/shifts',
      };
    case 'shift.cancelled':
      return { title: P.shiftCancelled, body: when(data.startsAt), url: '/me/shifts' };
    case 'shift.reminder':
      return {
        title: P.shiftReminder,
        body: `${str(data.wardName)} · ${when(data.startsAt)}`,
        url: '/me/shifts',
        tag: `shift-${str(data.shiftId)}`,
      };
    case 'credential.reviewed':
      return {
        title: data.verified ? P.credentialOk : P.credentialNo,
        body: str(data.title),
        url: '/me/pass',
      };
    case 'search.alert':
      return {
        title: P.searchAlert,
        body: str(data.searchName),
        url: str(data.searchUrl) || '/search',
      };
    case 'offer.expired':
      return {
        title: P.offerExpired,
        body: `${str(data.orgName)} · ${str(data.jobTitle)}`,
        url: '/me/marketplace',
      };
    case 'credential.expired':
      return { title: P.credentialExpired, body: str(data.title), url: '/me/pass' };
    default:
      return null;
  }
}

export async function handlePush(job: {
  kind: string;
  userId: string;
  data: Record<string, unknown>;
}): Promise<{ sent: number }> {
  const u = await userContact(job.userId);
  const msg = pushMessageFor(job.kind, job.data, emailLocale(u?.locale));
  if (!msg) return { sent: 0 };
  return { sent: await pushToUser(job.userId, msg) };
}
