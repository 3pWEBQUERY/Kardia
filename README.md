# Kardia

Stellenplattform für Gesundheitsberufe in der Schweiz, die **Arbeitsbedingungen statt
Inseratetext** vergleichbar macht: pro Station, schichtgenau, verifiziert und ohne
Personalvermittler. Gesucht wird nach Lebensmodell («80 %, keine Nächte, Dienstplan
6 Wochen im Voraus»), nicht nach Stichwort.

> Kardia zeigt dir, wie es sich auf einer Station arbeiten lässt – bevor du dich bewirbst.

Die Anforderungen stehen in [`docs/prd.md`](docs/prd.md). Dieses Repository setzt sie
als Monorepo um (Next.js 16, Prisma 7, PostgreSQL 16, pg-boss, Railway, Claude Haiku 5.5).

## Aufbau

```
apps/web        Next.js 16 (App Router): öffentliche Seiten, Fachpersonen, Arbeitgeber-Cockpit,
                Admin-Konsole, REST-API v1 + OpenAPI, PWA (Serwist), Better Auth
apps/worker     pg-boss-Jobs: Dateiprüfung (Magic Bytes, ClamAV), Pendelzeit (OSRM, OJP),
                KI-Läufe, E-Mail (SES), Web Push, Webhooks, Aufbewahrung, Benchmarks, Backups
packages/db     Prisma-Schema, Migrationen (inkl. Volltextsuche), Client, Seed-Daten
packages/core   Geteilte Domänenlogik und Zod-Schemas (Stationsprofil, Suche, Marktplatz, …)
packages/ui     Kardia UI: Tokens (Style Dictionary), Tailwind-Theme, Radix-Komponenten, Storybook
packages/ai     KI-1 bis KI-6 mit claude-haiku-5-5: striktes Tool Use, Belegpflicht, AiRun-Protokoll
packages/config TypeScript-, ESLint- und Prettier-Konfiguration
infra/osrm      OSRM-Routing-Dienst mit Schweiz-Extrakt
docs/           PRD, ADRs, Railway, Datenschutz, offene Fragen
```

## Module (PRD 6) und wo sie im Code liegen

| Modul | Kern | Code |
| --- | --- | --- |
| A Stationsprofil | Pflichtfelder (AK-A1), Quelle/Datum (AK-A2), 180-Tage-Bestätigung (AK-A3), Lohnband ≤ 40 % (AK-A4) | `packages/core/src/ward.ts`, `apps/web/src/server/services/wards.ts` |
| B Lebensmodell-Suche | Muss/Wunsch, Bedingungszeile, URL-Zustand (AK-B2), Pendelzeit, Karte | `packages/core/src/search.ts`, `apps/web/src/server/services/search.ts` |
| C Agenturfrei & Flex-Pool | UID/SECO (AK-C1), Buchung per bedingtem UPDATE (AK-C2) | `services/org.ts`, `services/pool.ts`, Worker `handlers/org.ts` |
| D Qualifikations-Pass | Freigabe pro Bewerbung (AK-D1), Status-Reset (AK-D2), SLA 2 Tage (AK-D3) | `packages/core/src/pass.ts`, `services/pass.ts`, `services/files.ts` |
| E Umgekehrter Marktplatz | Anonymität (AK-E1), Lohnband-Minimum (AK-E2), aggregierte Absagen (AK-E3) | `packages/core/src/marketplace.ts`, `services/marketplace.ts` |
| F Weiterbildung Ärzt:innen | «Was fehlt mir noch?», Kennzeichnung (AK-F1) | `packages/core/src/training.ts`, `/me/training` |
| G Team-Einblicke | ≥ 5 Stimmen (AK-G1), nur kommentieren (AK-G2), Untertitel Pflicht (AK-G3) | `packages/core/src/team.ts`, `services/team.ts` |
| H Wiedereinstieg & international | Comeback-Pfad, Anerkennungs-Tracker | `/guide/recognition`, Ward-Felder `reentry*` |
| I KI-Strukturierung | KI-1 … KI-6 | `packages/ai` |

## Loslegen

Voraussetzungen: Node 22.12+, pnpm 10, PostgreSQL 16.

```sh
pnpm install
cp packages/db/.env.example packages/db/.env
cp apps/web/.env.example apps/web/.env.local     # Secrets setzen (siehe Kommentare)
cp apps/worker/.env.example apps/worker/.env
pnpm db:migrate && pnpm db:seed                  # Schema + Demo-Daten (fiktive Zürcher Institutionen)
pnpm --filter @kardia/web dev                    # http://localhost:3000
pnpm --filter @kardia/worker dev                 # Jobs (E-Mails werden lokal nur protokolliert)
```

Anmelden lokal: E-Mail-Link anfordern; der Link erscheint im Terminal und in
`/tmp/kardia-magic-links.log`. `node apps/web/scripts/dev-login.mjs lea@example.ch`
liefert direkt ein Session-Cookie. Seed-Personas: `lea@`, `marco@`, `sara@`, `nadine@`,
`jonas@example.ch` (Fachpersonen), `leitung@seefeld-ost.example` (Owner, Spitalgruppe),
`recruiting@seefeld-ost.example` (Recruiter), `leitung@praxis-keller.example` (Praxis),
`admin@kardia.local` (Admin – braucht eine Passkey-Sitzung, lokal siehe ADR 0003).

## Qualitätsprüfungen

```sh
pnpm typecheck           # TypeScript strict, exactOptionalPropertyTypes
pnpm lint                # ESLint + Stylelint + Designregeln (keine Schatten, Verläufe, Hex, Emoji)
pnpm test                # Vitest: core, ai, worker, ui (Kontrast), web (unit)
pnpm test:integration    # gegen Postgres: AK-E1, AK-C2, AK-A1, AK-C1, AK-E2, AK-G1
pnpm test:e2e            # Playwright gegen den Produktions-Build inkl. axe und Offline
pnpm --filter @kardia/ui build-storybook && pnpm --filter @kardia/ui test:visual
```

CI führt alles bei jedem Pull Request aus (`.github/workflows/ci.yml`), dazu gitleaks
und `pnpm audit`. Das KI-1-Goldset läuft nächtlich (`goldset.yml`).

## Was ohne Zugangsdaten nicht geprüft ist

Lokal und in der CI laufen alle Dienste ohne externe Konten. Folgende Anbindungen sind
gebaut, aber erst mit echten Zugangsdaten verifizierbar:

- Claude Haiku 5.5 (KI-1 bis KI-6): ohne `ANTHROPIC_API_KEY` fällt die Suche auf die
  Stichwortsuche zurück, der Inserat-Import meldet einen Fehler und die Felder werden von
  Hand erfasst. Das Goldset hat erst 3 synthetische Inserate.
- E-Mail (SES), Web Push (VAPID), Bucket (S3) mit ClamAV, OSRM-Pendelzeiten, OJP (ÖV),
  UID-Register und SECO-Liste. Für die SECO-Liste nimmt der Worker einen JSON-Spiegel an.
- Stripe (Abo, Einzelinserat) und Sentry.
- Docker-Images (`apps/*/Dockerfile`, `infra/osrm`) sind geschrieben, aber nicht gebaut.

## Betrieb

Railway-Projekt in EU West mit den Diensten `web`, `worker`, `postgres`, `bucket` und
`osrm` – siehe [`docs/railway.md`](docs/railway.md). Kein Redis, keine separate
Suchmaschine: Postgres trägt Daten, Suche (tsvector + Trigramm) und Job-Queue.
