import { formatDateTime } from '@kardia/core';

import { log } from '../context.ts';
import { isTemplate, renderEmail, type Audience } from '../emails/templates.tsx';
import { sendMail } from '../lib/mail.ts';
import { pushToUser, type PushMessage } from '../lib/push.ts';
import { orgRecipients, userEmail } from '../lib/recipients.ts';

export interface EmailJob {
  template: string;
  to?: string;
  userId?: string;
  orgId?: string;
  data: Record<string, unknown>;
}

/** E-Mail an Adresse, Person oder Organisation (Owner + Recruiter). */
export async function handleEmail(job: EmailJob): Promise<{ sent: number }> {
  if (!isTemplate(job.template)) {
    log.warn('Unbekannte E-Mail-Vorlage', { template: job.template });
    return { sent: 0 };
  }
  const targets: { email: string; audience: Audience }[] = [];
  if (job.to) targets.push({ email: job.to, audience: 'any' });
  if (job.userId) {
    const email = await userEmail(job.userId);
    if (email) targets.push({ email, audience: 'candidate' });
  }
  if (job.orgId) for (const r of await orgRecipients(job.orgId)) targets.push({ email: r.email, audience: 'employer' });
  let sent = 0;
  for (const t of targets) {
    const mail = await renderEmail(job.template, job.data, t.audience);
    await sendMail(t.email, mail.subject, mail.html, mail.text);
    sent++;
  }
  return { sent };
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const when = (v: unknown) => (typeof v === 'string' || v instanceof Date ? formatDateTime(v) : '');

/** Kurztexte für Web Push je Ereignis (PRD 13.3). */
export function pushMessageFor(kind: string, data: Record<string, unknown>): PushMessage | null {
  switch (kind) {
    case 'application.status':
      return { title: 'Bewerbung: neuer Status', body: str(data.jobTitle), url: `/me/applications/${str(data.applicationId)}`, tag: `app-${str(data.applicationId)}` };
    case 'application.message':
      return { title: 'Neue Nachricht', body: str(data.jobTitle), url: `/me/applications/${str(data.applicationId)}` };
    case 'offer.new':
      return { title: `Angebot von ${str(data.orgName)}`, body: str(data.jobTitle), url: `/offers/${str(data.offerId)}` };
    case 'shift.new':
      return { title: 'Neue Schicht im Pool', body: `${str(data.wardName)} · ${when(data.startsAt)}`, url: '/me/shifts' };
    case 'shift.booked':
      return { title: 'Schicht bestätigt', body: `${str(data.wardName)} · ${when(data.startsAt)}`, url: '/me/shifts' };
    case 'shift.cancelled':
      return { title: 'Schicht abgesagt', body: when(data.startsAt), url: '/me/shifts' };
    case 'shift.reminder':
      return { title: 'Schicht in 12 Stunden', body: `${str(data.wardName)} · ${when(data.startsAt)}`, url: '/me/shifts', tag: `shift-${str(data.shiftId)}` };
    case 'credential.reviewed':
      return { title: data.verified ? 'Nachweis verifiziert' : 'Nachweis nicht verifiziert', body: str(data.title), url: '/me/pass' };
    case 'search.alert':
      return { title: 'Neue Treffer', body: str(data.searchName), url: str(data.searchUrl) || '/search' };
    case 'offer.expired':
      return { title: 'Angebot abgelaufen', body: `${str(data.orgName)} · ${str(data.jobTitle)}`, url: '/me/marketplace' };
    case 'credential.expired':
      return { title: 'Nachweis abgelaufen', body: str(data.title), url: '/me/pass' };
    default:
      return null;
  }
}

export async function handlePush(job: { kind: string; userId: string; data: Record<string, unknown> }): Promise<{ sent: number }> {
  const msg = pushMessageFor(job.kind, job.data);
  if (!msg) return { sent: 0 };
  return { sent: await pushToUser(job.userId, msg) };
}
