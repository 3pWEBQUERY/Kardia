import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from '@react-email/components';
import { render } from '@react-email/render';


import { formatChf, formatDate, formatDateTime } from '@kardia/core';

// Farben aus der einzigen Token-Quelle (PRD 13.4); E-Mail-Clients kennen keine CSS-Variablen.
import { colors } from '../../../../packages/ui/src/tokens.generated.ts';
import { config } from '../env.ts';

import type { ReactNode } from 'react';

/**
 * Transaktions-E-Mails (PRD 10.1: SES + React Email). Flach wie die UI: keine
 * Schatten, keine Verläufe, keine Emoji; Schweizer Formatierung; Link zu den
 * Einstellungen im Fuss. Inhalte enthalten nie Pass-Dokumente.
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

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Neu',
  SCREENED: 'Gesichtet',
  INTERVIEW: 'Gespräch',
  OFFER: 'Angebot',
  HIRED: 'Angestellt',
  REJECTED: 'Abgesagt',
  WITHDRAWN: 'Zurückgezogen',
};

function Layout({ preview, title, children, action }: { preview: string; title: string; children: ReactNode; action?: { label: string; href: string } }) {
  return (
    <Html lang="de-CH">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: c('surface-50'), color: c('ink-900'), fontFamily: 'Helvetica, Arial, sans-serif', margin: 0, padding: '24px 0' }}>
        <Container style={{ backgroundColor: c('surface-0'), border: `1px solid ${c('line-300')}`, borderRadius: 10, maxWidth: 560, padding: '24px 28px' }}>
          <Text style={{ color: c('accent-600'), fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>Kardia</Text>
          <Heading as="h1" style={{ fontSize: 20, lineHeight: '28px', fontWeight: 600, margin: '0 0 12px' }}>
            {title}
          </Heading>
          {children}
          {action ? (
            <Section style={{ margin: '20px 0 8px' }}>
              <Button
                href={action.href}
                style={{ backgroundColor: c('accent-600'), color: c('on-accent'), borderRadius: 6, fontSize: 14, fontWeight: 600, padding: '10px 16px', textDecoration: 'none' }}
              >
                {action.label}
              </Button>
            </Section>
          ) : null}
          <Hr style={{ borderColor: c('line-200'), margin: '24px 0 12px' }} />
          <Text style={{ color: c('ink-500'), fontSize: 12, lineHeight: '16px', margin: 0 }}>
            Sie erhalten diese Nachricht von Kardia, der Stellenplattform für Gesundheitsberufe in der Schweiz.{' '}
            <Link href={`${config.appOrigin}/me/settings`} style={{ color: c('accent-600') }}>
              Benachrichtigungen verwalten
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

function P({ children }: { children: ReactNode }) {
  return <Text style={{ fontSize: 15, lineHeight: '22px', margin: '0 0 10px', color: c('ink-700') }}>{children}</Text>;
}

const url = (path: string) => `${config.appOrigin}${path}`;
const s = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback);

interface Built {
  subject: string;
  element: ReactNode;
}

/** Inhalt je Vorlage; `audience` unterscheidet Fachperson und Arbeitgeber bei gleichen Ereignissen. */
export function buildEmail(template: TemplateName, data: Record<string, unknown>, audience: Audience): Built {
  switch (template) {
    case 'magic-link':
      return {
        subject: 'Ihr Anmeldelink für Kardia',
        element: (
          <Layout preview="Mit einem Klick anmelden" title="Anmelden bei Kardia" action={{ label: 'Jetzt anmelden', href: s(data.url) }}>
            <P>Der Link ist 15 Minuten gültig und funktioniert einmal. Haben Sie keine Anmeldung angefordert, können Sie diese E-Mail ignorieren.</P>
          </Layout>
        ),
      };
    case 'application.status': {
      const status = STATUS_LABEL[s(data.status)] ?? s(data.status);
      if (audience === 'employer') {
        return {
          subject: `Neue Bewerbung: ${s(data.jobTitle)}`,
          element: (
            <Layout preview="Eine neue Bewerbung ist eingegangen" title="Neue Bewerbung" action={{ label: 'Bewerbung ansehen', href: url(`/employer/applications/${s(data.applicationId)}`) }}>
              <P>Für die Stelle «{s(data.jobTitle)}» ist eine Bewerbung mit Qualifikations-Pass eingegangen.</P>
            </Layout>
          ),
        };
      }
      return {
        subject: `Status Ihrer Bewerbung: ${status}`,
        element: (
          <Layout preview={`Neuer Status: ${status}`} title="Ihre Bewerbung hat einen neuen Status" action={{ label: 'Bewerbung öffnen', href: url(`/me/applications/${s(data.applicationId)}`) }}>
            <P>
              Stelle «{s(data.jobTitle)}»: <strong>{status}</strong>.
            </P>
          </Layout>
        ),
      };
    }
    case 'application.message':
      return {
        subject: `Neue Nachricht zu «${s(data.jobTitle)}»`,
        element: (
          <Layout
            preview="Sie haben eine neue Nachricht"
            title="Neue Nachricht im Bewerbungs-Thread"
            action={{ label: 'Nachricht lesen', href: url(audience === 'employer' ? `/employer/applications/${s(data.applicationId)}` : `/me/applications/${s(data.applicationId)}`) }}
          >
            <P>Aus Datenschutzgründen steht der Inhalt nicht in der E-Mail. Sie lesen ihn nach der Anmeldung.</P>
          </Layout>
        ),
      };
    case 'offer.new':
      return {
        subject: `Neues Angebot von ${s(data.orgName)}`,
        element: (
          <Layout preview="Ein Arbeitgeber hat Ihnen ein Angebot gesendet" title="Sie haben ein Angebot erhalten" action={{ label: 'Angebot ansehen', href: url(`/offers/${s(data.offerId)}`) }}>
            <P>
              {s(data.orgName)} bietet Ihnen die Stelle «{s(data.jobTitle)}» an. Das Angebot ist 14 Tage gültig. Ihr Name wird erst sichtbar, wenn Sie Interesse zeigen.
            </P>
          </Layout>
        ),
      };
    case 'offer.responded': {
      const interested = data.action === 'interested';
      return {
        subject: interested ? 'Interesse an Ihrem Angebot' : 'Ein Angebot wurde abgelehnt',
        element: (
          <Layout
            preview={interested ? 'Die Fachperson möchte Sie kennenlernen' : 'Antwort auf Ihr Angebot'}
            title={interested ? 'Die Fachperson hat Interesse' : 'Angebot abgelehnt'}
            action={
              interested && data.applicationId
                ? { label: 'Zum Bewerbungs-Thread', href: url(`/employer/applications/${s(data.applicationId)}`) }
                : { label: 'Angebote ansehen', href: url('/employer/marketplace') }
            }
          >
            <P>
              {interested
                ? 'Name und Kontakt sind jetzt freigegeben. Der Chat steht im Bewerbungs-Thread bereit.'
                : 'Gründe werden nur zusammengefasst angezeigt, sobald genügend Antworten vorliegen.'}
            </P>
          </Layout>
        ),
      };
    }
    case 'shift.new':
      return {
        subject: `Neue Schicht: ${s(data.wardName)}`,
        element: (
          <Layout preview="In Ihrem Pool ist eine Schicht offen" title="Neue Schicht im Flex-Pool" action={{ label: 'Schichten ansehen', href: url('/me/shifts') }}>
            <P>
              {s(data.wardName)}, Beginn {data.startsAt ? formatDateTime(s(data.startsAt)) : ''}.
            </P>
          </Layout>
        ),
      };
    case 'shift.booked':
      if (audience === 'employer') {
        return {
          subject: data.interest ? 'Interesse an einer Schicht' : 'Schicht gebucht',
          element: (
            <Layout preview="Neuigkeit im Flex-Pool" title={data.interest ? 'Interesse an einer Schicht' : 'Eine Schicht wurde gebucht'} action={{ label: 'Flex-Pool öffnen', href: url('/employer/pool') }}>
              <P>{data.interest ? 'Eine Person aus Ihrem Pool hat Interesse angemeldet. Bitte auswählen.' : `${s(data.wardName)}, ${data.startsAt ? formatDateTime(s(data.startsAt)) : ''}.`}</P>
            </Layout>
          ),
        };
      }
      return {
        subject: 'Ihre Schicht ist bestätigt',
        element: (
          <Layout preview="Buchung bestätigt" title="Schicht bestätigt" action={{ label: 'Kalender herunterladen', href: url('/api/v1/me/shifts.ics') }}>
            <P>
              {s(data.wardName)}, {data.startsAt ? formatDateTime(s(data.startsAt)) : ''}. Sie erhalten 12 Stunden vorher eine Erinnerung.
            </P>
          </Layout>
        ),
      };
    case 'shift.cancelled':
      return {
        subject: 'Schicht abgesagt',
        element: (
          <Layout preview="Eine Schicht wurde abgesagt" title="Schicht abgesagt" action={{ label: 'Details', href: url(audience === 'employer' ? '/employer/pool' : '/me/shifts') }}>
            <P>{audience === 'employer' ? 'Eine gebuchte Schicht ist wieder offen.' : `Die Schicht vom ${data.startsAt ? formatDateTime(s(data.startsAt)) : ''} findet für Sie nicht statt.`}</P>
          </Layout>
        ),
      };
    case 'credential.reviewed': {
      const ok = data.verified === true;
      return {
        subject: ok ? 'Nachweis verifiziert' : 'Nachweis nicht verifiziert',
        element: (
          <Layout preview={s(data.title)} title={ok ? 'Ihr Nachweis ist verifiziert' : 'Ihr Nachweis konnte nicht verifiziert werden'} action={{ label: 'Qualifikations-Pass öffnen', href: url('/me/pass') }}>
            <P>«{s(data.title)}»{ok ? ' gilt ab sofort bei jeder Bewerbung als verifiziert.' : '.'}</P>
            {!ok && data.reason ? <P>Grund: {s(data.reason)}</P> : null}
          </Layout>
        ),
      };
    }
    case 'org.invite':
      if (data.verification) {
        const verified = data.verification === 'VERIFIED';
        return {
          subject: verified ? 'Ihre Organisation ist freigegeben' : 'Prüfung Ihrer Organisation',
          element: (
            <Layout preview="Ergebnis der Prüfung" title={verified ? 'Organisation freigegeben' : 'Organisation nicht freigegeben'} action={{ label: 'Zum Cockpit', href: url('/employer') }}>
              <P>{verified ? 'Sie können jetzt Stellen veröffentlichen.' : 'Bitte nehmen Sie Kontakt mit dem Kardia-Team auf, um die Angaben zu klären.'}</P>
            </Layout>
          ),
        };
      }
      return {
        subject: `Einladung zu ${s(data.orgName)} auf Kardia`,
        element: (
          <Layout preview="Sie wurden ins Team eingeladen" title={`Einladung zu ${s(data.orgName)}`} action={{ label: 'Einladung annehmen', href: s(data.url) }}>
            <P>Der Link ist 7 Tage gültig.</P>
          </Layout>
        ),
      };
    case 'employee.invite':
      return {
        subject: `${s(data.orgName)} lädt Sie zum Realitäts-Check ein`,
        element: (
          <Layout preview="Bestätigen Sie die Angaben Ihrer Station" title="Wie arbeitet es sich auf Ihrer Station?" action={{ label: 'Einladung annehmen', href: s(data.url) }}>
            <P>
              Bestätigen oder korrigieren Sie die Angaben im Stationsprofil. Ihre Antworten werden nur zusammengefasst und erst ab 5 Stimmen angezeigt; niemand sieht, wer wie geantwortet hat. Die Einladung wird als «vom Arbeitgeber eingeladen» gekennzeichnet.
            </P>
          </Layout>
        ),
      };
    case 'pool.invite':
      return {
        subject: `Einladung in den Springerpool von ${s(data.orgName)}`,
        element: (
          <Layout preview="Einzelschichten direkt buchen" title="Einladung in den Flex-Pool" action={{ label: 'Pool beitreten', href: s(data.url) }}>
            <P>Als Pool-Mitglied sehen Sie offene Schichten und buchen sie mit einem Tipp. Ihr Arbeitsvertrag läuft direkt über {s(data.orgName)}.</P>
          </Layout>
        ),
      };
    case 'search.alert': {
      const jobs = Array.isArray(data.jobs) ? (data.jobs as { title: string; orgName: string; url: string; salaryMinChf?: number }[]) : [];
      return {
        subject: `${jobs.length} neue Treffer: ${s(data.searchName)}`,
        element: (
          <Layout preview="Neue Stellen zu Ihrer gespeicherten Suche" title={`Neue Treffer für «${s(data.searchName)}»`} action={{ label: 'Alle Treffer ansehen', href: s(data.searchUrl, url('/search')) }}>
            {jobs.slice(0, 10).map((j) => (
              <Text key={j.url} style={{ fontSize: 15, lineHeight: '22px', margin: '0 0 8px' }}>
                <Link href={j.url} style={{ color: c('accent-600') }}>
                  {j.title}
                </Link>
                <br />
                <span style={{ color: c('ink-500'), fontSize: 13 }}>
                  {j.orgName}
                  {j.salaryMinChf ? ` · ab ${formatChf(j.salaryMinChf)}` : ''}
                </span>
              </Text>
            ))}
          </Layout>
        ),
      };
    }
    case 'account.inactive-notice':
      return {
        subject: 'Ihr Kardia-Konto wird bald gelöscht',
        element: (
          <Layout preview="Melden Sie sich an, um Ihr Konto zu behalten" title="Ihr Konto ist seit 24 Monaten inaktiv" action={{ label: 'Anmelden und Konto behalten', href: url('/sign-in') }}>
            <P>Wenn Sie sich bis zum {data.deleteOn ? formatDate(s(data.deleteOn)) : ''} nicht anmelden, löschen wir Ihr Konto und alle Daten.</P>
          </Layout>
        ),
      };
    case 'ward.stale':
      return {
        subject: `Bitte bestätigen: ${s(data.wardName)}`,
        element: (
          <Layout preview="Stationsprofil bestätigen" title="Ihr Stationsprofil braucht eine Bestätigung" action={{ label: 'Profil prüfen und bestätigen', href: url(`/employer/wards/${s(data.wardId)}`) }}>
            <P>
              Das Profil «{s(data.wardName)}» wird in {s(data.daysLeft)} Tagen als veraltet markiert und im Ranking zurückgestuft, wenn es nicht bestätigt wird.
            </P>
          </Layout>
        ),
      };
    case 'plan.expiring':
      return {
        subject: `Ihr Kardia-Abo endet am ${data.validUntil ? formatDate(s(data.validUntil)) : ''}`,
        element: (
          <Layout preview="Abo verlängern, damit Ihre Stellen sichtbar bleiben" title="Ihr Abo läuft bald ab" action={{ label: 'Abo verlängern', href: url('/employer/billing') }}>
            <P>
              Das Abo «{s(data.planLabel)}» von {s(data.orgName)} endet in {s(data.daysLeft)} Tagen. Danach sind Ihre veröffentlichten Stellen nicht mehr in der Suche sichtbar und
              Abo-Funktionen wie Marktplatz und Flex-Pool sind gesperrt.
            </P>
          </Layout>
        ),
      };
    case 'plan.payment-failed':
      return {
        subject: 'Zahlung für Ihr Kardia-Abo fehlgeschlagen',
        element: (
          <Layout preview="Zahlungsmittel prüfen" title="Die Zahlung ist fehlgeschlagen" action={{ label: 'Zahlungsmittel prüfen', href: url('/employer/billing') }}>
            <P>
              Stripe konnte die Rechnung für {s(data.orgName)} nicht belasten. Bitte das Zahlungsmittel im Kundenportal aktualisieren; Stripe versucht es automatisch erneut.
            </P>
          </Layout>
        ),
      };
    case 'offer.withdrawn':
      return {
        subject: `Angebot zurückgezogen: ${s(data.orgName)}`,
        element: (
          <Layout preview="Das Angebot ist nicht mehr gültig" title="Ein Angebot wurde zurückgezogen" action={{ label: 'Zum Marktplatz', href: url('/me/marketplace') }}>
            <P>
              {s(data.orgName)} hat das Angebot «{s(data.jobTitle)}» zurückgezogen. Ihr anonymes Profil bleibt unverändert sichtbar.
            </P>
          </Layout>
        ),
      };
    case 'offer.expired':
      return audience === 'employer'
        ? {
            subject: `Angebot ohne Antwort abgelaufen: ${s(data.jobTitle)}`,
            element: (
              <Layout preview="Die Fachperson hat innert 14 Tagen nicht geantwortet" title="Ein Angebot ist abgelaufen" action={{ label: 'Zur Marktplatz-Suche', href: url('/employer/marketplace') }}>
                <P>Ihr Angebot für «{s(data.jobTitle)}» wurde innert 14 Tagen nicht beantwortet und ist abgelaufen. Das Kontingent wird nicht zurückerstattet.</P>
              </Layout>
            ),
          }
        : {
            subject: `Angebot abgelaufen: ${s(data.orgName)}`,
            element: (
              <Layout preview="Das Angebot ist nicht mehr gültig" title="Ein Angebot ist abgelaufen" action={{ label: 'Zum Marktplatz', href: url('/me/marketplace') }}>
                <P>Das Angebot von {s(data.orgName)} für «{s(data.jobTitle)}» war 14 Tage gültig und ist jetzt abgelaufen. Ihr anonymes Profil bleibt sichtbar.</P>
              </Layout>
            ),
          };
    case 'credential.expired':
      return {
        subject: `Nachweis abgelaufen: ${s(data.title)}`,
        element: (
          <Layout preview="Bitte einen aktuellen Nachweis hochladen" title="Ein Nachweis ist abgelaufen" action={{ label: 'Qualifikations-Pass öffnen', href: url('/me/pass') }}>
            <P>
              «{s(data.title)}» war gültig bis {data.validUntil ? formatDate(s(data.validUntil)) : ''}. Bei Bewerbungen erscheint er jetzt als abgelaufen. Laden Sie einen aktuellen
              Nachweis hoch, damit er erneut geprüft wird.
            </P>
          </Layout>
        ),
      };
    case 'ops.cost-alarm':
      return {
        subject: `KI-Kostenalarm: USD ${Number(data.costUsd ?? 0).toFixed(2)} heute`,
        element: (
          <Layout preview="Tagesgrenze der KI-Kosten erreicht" title="KI-Tageskosten über der Grenze">
            <P>
              Heutige Kosten: USD {Number(data.costUsd ?? 0).toFixed(2)} (Grenze USD {s(data.limitUsd, '25')}). Details in der Tabelle AiRun.
            </P>
          </Layout>
        ),
      };
  }
}

export async function renderEmail(template: TemplateName, data: Record<string, unknown>, audience: Audience = 'any'): Promise<RenderedEmail> {
  const built = buildEmail(template, data, audience);
  const [html, text] = await Promise.all([render(built.element), render(built.element, { plainText: true })]);
  return { subject: built.subject, html, text };
}

export function isTemplate(name: string): name is TemplateName {
  return (TEMPLATES as readonly string[]).includes(name);
}
