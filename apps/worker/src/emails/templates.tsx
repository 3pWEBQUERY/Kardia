import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { render } from '@react-email/render';

import { formatChf, formatDate, formatDateTime } from '@kardia/core';

// Farben aus der einzigen Token-Quelle (PRD 13.4); E-Mail-Clients kennen keine CSS-Variablen.
import { colors } from '../../../../packages/ui/src/tokens.generated.ts';
import { config } from '../env.ts';

import { EMAIL_TEXT, type EmailLocale, type EmailText } from './strings.ts';

import type { ReactNode } from 'react';

/**
 * Transaktions-E-Mails (PRD 10.1: SES + React Email) in vier Sprachen. Flach wie die
 * UI: keine Schatten, keine Verläufe, keine Emoji; Schweizer Formatierung; Link zu den
 * Einstellungen im Fuss. Inhalte enthalten nie Pass-Dokumente. Texte: ./strings.ts.
 */
export const TEMPLATES = [
  'magic-link',
  'application.status',
  'application.message',
  'offer.new',
  'offer.responded',
  'shift.new',
  'shift.booked',
  'shift.cancelled',
  'credential.reviewed',
  'org.invite',
  'employee.invite',
  'pool.invite',
  'search.alert',
  'account.inactive-notice',
  'ward.stale',
  'ops.cost-alarm',
  'plan.expiring',
  'plan.payment-failed',
  'offer.withdrawn',
  'offer.expired',
  'credential.expired',
] as const;

export type TemplateName = (typeof TEMPLATES)[number];
export type Audience = 'candidate' | 'employer' | 'any';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const c = (name: keyof typeof colors) => colors[name].light;

/** Marken-Layout: dunkles Kopfband mit Wortmarke und Pulslinie, darunter flache Karte (PRD 8.1). */
function Layout({
  L,
  preview,
  title,
  children,
  action,
}: {
  L: EmailText;
  preview: string;
  title: string;
  children: ReactNode;
  action?: { label: string; href: string } | undefined;
}) {
  return (
    <Html lang={L.lang}>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: c('sand-100'),
          color: c('ink-900'),
          fontFamily: 'Helvetica, Arial, sans-serif',
          margin: 0,
          padding: '24px 0',
        }}
      >
        <Container style={{ maxWidth: 560 }}>
          <Section
            style={{
              backgroundColor: c('brand-950'),
              borderRadius: '10px 10px 0 0',
              padding: '20px 28px 0',
            }}
          >
            <Text
              style={{
                color: c('brand-100'),
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Kardia<span style={{ color: c('pulse-500') }}>.</span>
            </Text>
            <Text style={{ color: c('brand-300'), fontSize: 12, margin: '2px 0 16px' }}>
              {L.tagline}
            </Text>
            <div style={{ height: 3, width: 72, backgroundColor: c('pulse-500') }} />
          </Section>
          <Section
            style={{
              backgroundColor: c('surface-0'),
              border: `1px solid ${c('sand-200')}`,
              borderTop: 'none',
              borderRadius: '0 0 10px 10px',
              padding: '24px 28px',
            }}
          >
            <Heading
              as="h1"
              style={{
                fontSize: 20,
                lineHeight: '28px',
                fontWeight: 600,
                margin: '0 0 12px',
                color: c('ink-900'),
              }}
            >
              {title}
            </Heading>
            {children}
            {action ? (
              <Section style={{ margin: '20px 0 8px' }}>
                <Button
                  href={action.href}
                  style={{
                    backgroundColor: c('accent-600'),
                    color: c('on-accent'),
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    padding: '10px 16px',
                    textDecoration: 'none',
                  }}
                >
                  {action.label}
                </Button>
              </Section>
            ) : null}
            <Hr style={{ borderColor: c('line-200'), margin: '24px 0 12px' }} />
            <Text style={{ color: c('ink-500'), fontSize: 12, lineHeight: '16px', margin: 0 }}>
              {L.footer}{' '}
              <Link href={url('/me/settings')} style={{ color: c('accent-600') }}>
                {L.manage}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <Text style={{ fontSize: 15, lineHeight: '22px', margin: '0 0 10px', color: c('ink-700') }}>
      {children}
    </Text>
  );
}

/** Links immer absolut auf APP_ORIGIN (Mail-Clients kennen keine relativen Pfade). */
const url = (path: string) => `${config.appOrigin}${path}`;
const s = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback;
const when = (v: unknown) => (v ? formatDateTime(s(v)) : '');
const day = (v: unknown) => (v ? formatDate(s(v)) : '');

interface Built {
  subject: string;
  element: ReactNode;
}

/**
 * Inhalt je Vorlage in der Sprache der empfangenden Person; `audience` unterscheidet
 * Fachperson und Arbeitgeber bei gleichen Ereignissen.
 */
export function buildEmail(
  template: TemplateName,
  data: Record<string, unknown>,
  audience: Audience,
  locale: EmailLocale = 'de',
): Built {
  const L = EMAIL_TEXT[locale];
  const mail = (
    subject: string,
    preview: string,
    title: string,
    body: ReactNode,
    action?: { label: string; href: string },
  ): Built => ({
    subject,
    element: (
      <Layout L={L} preview={preview} title={title} action={action}>
        {body}
      </Layout>
    ),
  });
  switch (template) {
    case 'magic-link': {
      const T = L.magicLink;
      return mail(T.subject, T.preview, T.title, <P>{T.body}</P>, {
        label: T.action,
        href: s(data.url),
      });
    }
    case 'application.status': {
      if (audience === 'employer') {
        const T = L.applicationNew;
        return mail(
          T.subject(s(data.jobTitle)),
          T.preview,
          T.title,
          <P>{T.body(s(data.jobTitle))}</P>,
          { label: T.action, href: url(`/employer/applications/${s(data.applicationId)}`) },
        );
      }
      const T = L.applicationStatus;
      const status = L.status[s(data.status)] ?? s(data.status);
      return mail(
        T.subject(status),
        T.preview(status),
        T.title,
        <P>
          {T.body(s(data.jobTitle))} <strong>{status}</strong>
        </P>,
        { label: T.action, href: url(`/me/applications/${s(data.applicationId)}`) },
      );
    }
    case 'application.message': {
      const T = L.applicationMessage;
      const href = url(
        audience === 'employer'
          ? `/employer/applications/${s(data.applicationId)}`
          : `/me/applications/${s(data.applicationId)}`,
      );
      return mail(T.subject(s(data.jobTitle)), T.preview, T.title, <P>{T.body}</P>, {
        label: T.action,
        href,
      });
    }
    case 'offer.new': {
      const T = L.offerNew;
      return mail(
        T.subject(s(data.orgName)),
        T.preview,
        T.title,
        <P>{T.body(s(data.orgName), s(data.jobTitle))}</P>,
        { label: T.action, href: url(`/offers/${s(data.offerId)}`) },
      );
    }
    case 'offer.responded': {
      const T = L.offerResponded;
      const yes = data.action === 'interested';
      const action =
        yes && data.applicationId
          ? { label: T.actionThread, href: url(`/employer/applications/${s(data.applicationId)}`) }
          : { label: T.actionOffers, href: url('/employer/marketplace') };
      return mail(
        yes ? T.subjectYes : T.subjectNo,
        yes ? T.previewYes : T.previewNo,
        yes ? T.titleYes : T.titleNo,
        <P>{yes ? T.bodyYes : T.bodyNo}</P>,
        action,
      );
    }
    case 'shift.new': {
      const T = L.shiftNew;
      return mail(
        T.subject(s(data.wardName)),
        T.preview,
        T.title,
        <P>{T.body(s(data.wardName), when(data.startsAt))}</P>,
        { label: T.action, href: url('/me/shifts') },
      );
    }
    case 'shift.booked': {
      const T = L.shiftBooked;
      if (audience === 'employer') {
        const interest = Boolean(data.interest);
        return mail(
          interest ? T.subjectInterest : T.subjectBooked,
          T.preview,
          interest ? T.subjectInterest : T.titleBooked,
          <P>{interest ? T.bodyInterest : `${s(data.wardName)}, ${when(data.startsAt)}.`}</P>,
          { label: T.actionPool, href: url('/employer/pool') },
        );
      }
      return mail(
        T.subjectConfirmed,
        T.previewConfirmed,
        T.titleConfirmed,
        <P>{T.bodyConfirmed(s(data.wardName), when(data.startsAt))}</P>,
        {
          label: T.actionIcs,
          href: url('/api/v1/me/shifts.ics'),
        },
      );
    }
    case 'shift.cancelled': {
      const T = L.shiftCancelled;
      return mail(
        T.subject,
        T.preview,
        T.title,
        <P>{audience === 'employer' ? T.bodyEmployer : T.bodyCandidate(when(data.startsAt))}</P>,
        {
          label: T.action,
          href: url(audience === 'employer' ? '/employer/pool' : '/me/shifts'),
        },
      );
    }
    case 'credential.reviewed': {
      const T = L.credentialReviewed;
      const ok = data.verified === true;
      return mail(
        ok ? T.subjectOk : T.subjectNo,
        s(data.title),
        ok ? T.titleOk : T.titleNo,
        <>
          <P>{ok ? T.bodyOk(s(data.title)) : T.bodyNo(s(data.title))}</P>
          {!ok && data.reason ? <P>{T.reason(s(data.reason))}</P> : null}
        </>,
        { label: T.action, href: url('/me/pass') },
      );
    }
    case 'org.invite': {
      if (data.verification) {
        const T = L.orgVerification;
        const ok = data.verification === 'VERIFIED';
        return mail(
          ok ? T.subjectOk : T.subjectNo,
          T.preview,
          ok ? T.titleOk : T.titleNo,
          <P>{ok ? T.bodyOk : T.bodyNo}</P>,
          { label: T.action, href: url('/employer') },
        );
      }
      const T = L.orgInvite;
      return mail(
        T.subject(s(data.orgName)),
        T.preview,
        T.title(s(data.orgName)),
        <P>{T.body}</P>,
        { label: T.action, href: s(data.url) },
      );
    }
    case 'employee.invite': {
      const T = L.employeeInvite;
      return mail(T.subject(s(data.orgName)), T.preview, T.title, <P>{T.body}</P>, {
        label: T.action,
        href: s(data.url),
      });
    }
    case 'pool.invite': {
      const T = L.poolInvite;
      return mail(
        T.subject(s(data.orgName)),
        T.preview,
        T.title,
        <P>{T.body(s(data.orgName))}</P>,
        { label: T.action, href: s(data.url) },
      );
    }
    case 'search.alert': {
      const T = L.searchAlert;
      const jobs = Array.isArray(data.jobs)
        ? (data.jobs as { title: string; orgName: string; url: string; salaryMinChf?: number }[])
        : [];
      return mail(
        T.subject(jobs.length, s(data.searchName)),
        T.preview,
        T.title(s(data.searchName)),
        <>
          {jobs.slice(0, 10).map((j) => (
            <Text key={j.url} style={{ fontSize: 15, lineHeight: '22px', margin: '0 0 8px' }}>
              <Link href={j.url} style={{ color: c('accent-600') }}>
                {j.title}
              </Link>
              <br />
              <span style={{ color: c('ink-500'), fontSize: 13 }}>
                {j.orgName}
                {j.salaryMinChf ? ` · ${T.from(formatChf(j.salaryMinChf))}` : ''}
              </span>
            </Text>
          ))}
          <Text style={{ fontSize: 13, margin: '12px 0 0' }}>
            <Link href={url('/me/settings')} style={{ color: c('accent-600') }}>
              {T.manage}
            </Link>
          </Text>
        </>,
        { label: T.action, href: s(data.searchUrl, url('/search')) },
      );
    }
    case 'account.inactive-notice': {
      const T = L.inactive;
      return mail(T.subject, T.preview, T.title, <P>{T.body(day(data.deleteOn))}</P>, {
        label: T.action,
        href: url('/sign-in'),
      });
    }
    case 'ward.stale': {
      const T = L.wardStale;
      return mail(
        T.subject(s(data.wardName)),
        T.preview,
        T.title,
        <P>{T.body(s(data.wardName), s(data.daysLeft))}</P>,
        { label: T.action, href: url(`/employer/wards/${s(data.wardId)}`) },
      );
    }
    case 'plan.expiring': {
      const T = L.planExpiring;
      return mail(
        T.subject(day(data.validUntil)),
        T.preview,
        T.title,
        <P>{T.body(s(data.planLabel), s(data.orgName), s(data.daysLeft))}</P>,
        { label: T.action, href: url('/employer/billing') },
      );
    }
    case 'plan.payment-failed': {
      const T = L.paymentFailed;
      return mail(T.subject, T.preview, T.title, <P>{T.body(s(data.orgName))}</P>, {
        label: T.action,
        href: url('/employer/billing'),
      });
    }
    case 'offer.withdrawn': {
      const T = L.offerWithdrawn;
      return mail(
        T.subject(s(data.orgName)),
        T.preview,
        T.title,
        <P>{T.body(s(data.orgName), s(data.jobTitle))}</P>,
        { label: T.action, href: url('/me/marketplace') },
      );
    }
    case 'offer.expired': {
      const T = L.offerExpired;
      return audience === 'employer'
        ? mail(
            T.subjectEmployer(s(data.jobTitle)),
            T.previewEmployer,
            T.title,
            <P>{T.bodyEmployer(s(data.jobTitle))}</P>,
            { label: T.actionEmployer, href: url('/employer/marketplace') },
          )
        : mail(
            T.subjectCandidate(s(data.orgName)),
            T.previewCandidate,
            T.title,
            <P>{T.bodyCandidate(s(data.orgName), s(data.jobTitle))}</P>,
            {
              label: T.actionCandidate,
              href: url('/me/marketplace'),
            },
          );
    }
    case 'credential.expired': {
      const T = L.credentialExpired;
      return mail(
        T.subject(s(data.title)),
        T.preview,
        T.title,
        <P>{T.body(s(data.title), day(data.validUntil))}</P>,
        { label: T.action, href: url('/me/pass') },
      );
    }
    case 'ops.cost-alarm': {
      const T = L.costAlarm;
      const usd = Number(data.costUsd ?? 0).toFixed(2);
      return mail(T.subject(usd), T.preview, T.title, <P>{T.body(usd, s(data.limitUsd, '25'))}</P>);
    }
  }
}

export async function renderEmail(
  template: TemplateName,
  data: Record<string, unknown>,
  audience: Audience = 'any',
  locale: EmailLocale = 'de',
): Promise<RenderedEmail> {
  const built = buildEmail(template, data, audience, locale);
  const [html, text] = await Promise.all([
    render(built.element),
    render(built.element, { plainText: true }),
  ]);
  return { subject: built.subject, html, text };
}

export function isTemplate(name: string): name is TemplateName {
  return (TEMPLATES as readonly string[]).includes(name);
}
