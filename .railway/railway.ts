/**
 * Kardia auf Railway (PRD 10.2) als Infrastructure as Code.
 *
 * Stand dieser Datei = Stand des Railway-Projekts "Kardia" (EU West). Anwenden mit der
 * Railway-CLI: `npm i -D railway`, `railway link`, `railway config plan`, `railway config apply`.
 * Secrets stehen nie hier: sie liegen als Shared Variables in Railway (ctx.shared, preserve()).
 */
import { bucket, defineRailway, github, postgres, project, service } from 'railway/iac';

const REPO = '3pWEBQUERY/Kardia';
const BRANCH = 'claude/kardia-prd-implementation-mj379p';
const REGION = 'europe-west4-drams3a';

export default defineRailway((ctx) => {
  const prod = ctx.environment === 'production';

  const db = postgres('Postgres');
  const files = bucket('bucket', { region: 'ams' });

  // Bucket-Zugang per Referenz; Railway-Buckets nutzen virtual-host-URLs.
  const s3 = {
    S3_ENDPOINT: '${{bucket.ENDPOINT}}',
    S3_BUCKET: '${{bucket.BUCKET}}',
    S3_REGION: '${{bucket.REGION}}',
    S3_ACCESS_KEY_ID: '${{bucket.ACCESS_KEY_ID}}',
    S3_SECRET_ACCESS_KEY: '${{bucket.SECRET_ACCESS_KEY}}',
    S3_FORCE_PATH_STYLE: 'false',
  };

  const web = service('web', {
    source: github(REPO, { branch: BRANCH }),
    healthcheck: '/api/health',
    healthcheckTimeout: 120,
    // Migrationen und (nur in leere Datenbanken) Demo-Daten, siehe packages/db/scripts/predeploy.sh
    preDeploy: 'sh tools/db/scripts/predeploy.sh',
    replicas: { [REGION]: prod ? 2 : 1 },
    env: {
      RAILWAY_DOCKERFILE_PATH: 'apps/web/Dockerfile',
      PORT: '3000',
      DATABASE_URL: db.env.DATABASE_URL,
      APP_ORIGIN: 'https://${{RAILWAY_PUBLIC_DOMAIN}}',
      BETTER_AUTH_URL: 'https://${{RAILWAY_PUBLIC_DOMAIN}}',
      PASSKEY_RP_ID: '${{RAILWAY_PUBLIC_DOMAIN}}',
      BETTER_AUTH_SECRET: ctx.shared.BETTER_AUTH_SECRET,
      FIELD_ENCRYPTION_KEYS: ctx.shared.FIELD_ENCRYPTION_KEYS,
      VOTER_HASH_SECRET: ctx.shared.VOTER_HASH_SECRET,
      ...s3,
      S3_PUBLIC_ORIGIN: 'https://*.t3.storageapi.dev',
      // Demo-Umgebung: fiktive Daten und Ein-Klick-Anmeldung. Für den echten Betrieb entfernen.
      SEED_DEMO: '1',
      DEMO_LOGIN: 'true',
      // Sobald gesetzt, hier mit preserve() aufnehmen: ANTHROPIC_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
    },
  });

  // Auto-Pendelzeiten (PRD 10.1): Schweiz-Extrakt, nur im privaten Netz.
  const osrm = service('osrm', {
    source: github(REPO, { branch: BRANCH }),
    replicas: { [REGION]: 1 },
    env: { RAILWAY_DOCKERFILE_PATH: 'infra/osrm/Dockerfile' },
  });

  const worker = service('worker', {
    source: github(REPO, { branch: BRANCH }),
    replicas: { [REGION]: 1 },
    env: {
      RAILWAY_DOCKERFILE_PATH: 'apps/worker/Dockerfile',
      DATABASE_URL: db.env.DATABASE_URL,
      APP_ORIGIN: 'https://${{web.RAILWAY_PUBLIC_DOMAIN}}',
      FIELD_ENCRYPTION_KEYS: ctx.shared.FIELD_ENCRYPTION_KEYS,
      VOTER_HASH_SECRET: ctx.shared.VOTER_HASH_SECRET,
      BACKUP_ENCRYPTION_KEY: ctx.shared.BACKUP_ENCRYPTION_KEY,
      ...s3,
      // Bis SES oder SMTP eingerichtet ist: Mails nur protokollieren (ohne Inhalt).
      MAIL_TRANSPORT: 'log',
      OSRM_URL: 'http://${{osrm.RAILWAY_PRIVATE_DOMAIN}}:5000',
    },
  });

  return project('Kardia', { resources: [db, files, web, worker, osrm] });
});
