# Betrieb auf Railway

Ein Railway-Projekt in **EU West** (`europe-west4-drams3a`) mit fünf Diensten (PRD 10.2).
Die Konfiguration steht als Infrastructure as Code in [`.railway/railway.ts`](../.railway/railway.ts)
(`railway config plan` / `railway config apply`); `railway.json` ist bei Railway veraltet.

**Live-Demo:** https://web-production-2dbcb.up.railway.app – fiktive Demo-Daten, Ein-Klick-Anmeldung
unter `/sign-in` (`DEMO_LOGIN=true`). Für den echten Betrieb `DEMO_LOGIN` und `SEED_DEMO` entfernen
und E-Mail einrichten (`MAIL_TRANSPORT=ses` oder `smtp` mit `SMTP_URL`).



| Dienst | Quelle | Konfiguration |
| --- | --- | --- |
| `web` | `apps/web/Dockerfile` | 2 Replikas, Health-Check `/api/health`, Pre-Deploy `sh tools/db/scripts/predeploy.sh` (Migrationen, optional Demo-Seed) |
| `worker` | `apps/worker/Dockerfile` | 1 Replika, Entrypoint startet ClamAV und dann `node dist/worker.js`; ffmpeg + pg_dump 18 |
| `postgres` | Railway PostgreSQL 18 (Template) | tägliche Railway-Backups; zusätzlich nächtlicher verschlüsselter `pg_dump` in `backup/` |
| `bucket` | Railway Bucket | privat; Präfixe `pass/`, `video/`, `logo/`, `import/`, `backup/` |
| `osrm` | `infra/osrm/Dockerfile` | Schweiz-Extrakt (Geofabrik), beim Build vorbereitet; nur intern über IPv6 (`osrm.railway.internal:5000`) |

Railway Buckets haben keine automatischen Backups; der Worker repliziert `pass/` und
`backup/` nächtlich in einen zweiten Bucket (`S3_REPLICA_*`).

## Variablen

Secrets nie im Repo, nur als Railway-Variablen. Bucket-Zugangsdaten per Variablenreferenz
(`${{bucket.ACCESS_KEY_ID}}` usw.), `DATABASE_URL` per `${{postgres.DATABASE_URL}}`.

**web und worker gemeinsam:** `DATABASE_URL`, `APP_ORIGIN`, `FIELD_ENCRYPTION_KEYS`
(`kid:base64(32 Byte)`, neuer Schlüssel vorne – jährliche Rotation, der Worker verschlüsselt
nach), `VOTER_HASH_SECRET`, `S3_*`, `ANTHROPIC_API_KEY`, `SENTRY_DSN` (EU-Region).

**nur web:** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `PASSKEY_RP_ID` (Domain),
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, `BILLING_*`,
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_MAP_STYLE`, `APPLE_APP_IDS`, `ANDROID_*`.

**nur worker:** `VAPID_*`, `SES_REGION`, `MAIL_FROM`, `MAIL_TRANSPORT=ses`, `AWS_*`,
`OSRM_URL=http://osrm.railway.internal:5000`, `OJP_URL`, `OJP_API_KEY`, `UID_REGISTER_URL`,
`SECO_REGISTRY_URL`, `BACKUP_ENCRYPTION_KEY`, `S3_REPLICA_*`, `OPS_EMAIL`, `WORKER_CONCURRENCY`.

**Release-Schalter (web):** `FEATURE_MARKETPLACE` und `FEATURE_FLEXPOOL` (Standard `true`).
Für den R1-Start ohne Marktplatz und Flex-Pool auf `false` setzen: Navigation, Seiten,
Server Actions und API-Endpunkte der Funktion antworten dann mit 404. Abo-Grenzen
(`PLAN_LIMITS`) gelten zusätzlich.

**Stripe-Webhook:** Endpunkt `https://<Domain>/api/stripe/webhook` mit den Ereignissen
`checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted` und `invoice.payment_failed`. Das Kundenportal
(Zahlungsmittel, Planwechsel, Kündigung) im Stripe-Dashboard aktivieren.

## Umgebungen

`production`, `staging` und PR-Umgebungen (in den Projekteinstellungen aktivieren). Jede
PR-Umgebung erhält eine eigene Postgres-Instanz; Seed-Daten einspielen mit
`railway run --environment pr-<nr> --service web pnpm db:seed`.

## Wiederherstellung (RPO 24 h, RTO 4 h)

1. Railway-Backup der Datenbank wiederherstellen, oder den letzten `backup/`-Dump
   entschlüsseln (`BACKUP_ENCRYPTION_KEY`) und mit `pg_restore` einspielen.
2. Bucket aus dem Replika-Bucket zurückkopieren.
3. `web` und `worker` neu deployen; Migrationen laufen im Pre-Deploy.
