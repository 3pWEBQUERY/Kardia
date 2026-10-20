# ADR 0001 – Architektur und Stack

Status: angenommen · Datum: 20.10.2026

## Kontext

PRD Abschnitt 10 legt den Stack fest: Next.js (App Router), Railway (Hosting, PostgreSQL,
Bucket), Claude Haiku 5.5, PWA ab Release 1, native App später.

## Entscheid

- **Monorepo** mit pnpm + Turborepo: `apps/web`, `apps/worker`, `packages/{db,core,ui,ai,config}`.
  `packages/core` ist zusätzlich zum PRD entstanden: die browser-sicheren Zod-Schemas und
  Regeln, die Web, Worker, KI und API teilen («eine Wahrheit pro Datentyp»).
- **Service-Funktionen** in `apps/web/src/server/services` werden von Server Actions und der
  REST-API v1 gleichermassen aufgerufen (API first, PRD 13.4). Jede Funktion prüft Rolle und
  Mandant serverseitig.
- **Suche** als ein SQL-Statement: Muss-Bedingungen als `WHERE` auf die effektiven Werte
  (`COALESCE(Job.overrides->>feld, Ward.feld)`), Wünsche als Score, `ts_rank` und Trigramm
  für Freitext, Pendelzeit aus `CommuteCache` per LEFT JOIN. Danach wird jeder Treffer in JS
  mit derselben Logik wie im Client geprüft (doppelte Absicherung von AK-B1).
- **Queue** pg-boss (Schema `pgboss`); die Web-App legt nur Jobs an. KI läuft im Worker, mit
  Ausnahme von KI-2 (Suchsatz) im Request-Pfad mit 1'500 ms Limit.
- **PWA** mit Serwist über `@serwist/turbopack` (Route Handler `/serwist/sw.js`), weil Next 16
  standardmässig mit Turbopack baut und `@serwist/next` ein Webpack-Plugin ist.
- **Auth** Better Auth auf der Domänentabelle `User` (Prisma-Adapter), Plugins Magic Link,
  Passkey, SSO (SAML/OIDC) und Bearer für native Clients.
- **i18n** next-intl ohne Sprachpräfix in der URL (Cookie, sonst Accept-Language), vier Locales,
  fehlende Texte fallen auf de-CH zurück. Client-Komponenten erhalten nur die Namensräume,
  die sie brauchen (JS-Budget).

## Folgen

- Seiten sind dynamisch gerendert (CSP mit Nonce pro Anfrage, PRD 14.2).
- Keine zusätzliche Infrastruktur ausser OSRM; ClamAV und ffmpeg laufen im Worker-Container.
