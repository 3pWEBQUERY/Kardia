/** Konfiguration des Workers; alle Werte kommen aus Railway-Variablen (PRD 10.2). */
function str(name: string, fallback?: string): string | undefined {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function int(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config = {
  nodeEnv: str('NODE_ENV', 'development') ?? 'development',
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  },
  databaseUrl: str('DATABASE_URL'),
  appOrigin: str('APP_ORIGIN', 'http://localhost:3000') ?? 'http://localhost:3000',
  concurrency: int('WORKER_CONCURRENCY', 4),
  s3: {
    endpoint: str('S3_ENDPOINT'),
    region: str('S3_REGION', 'auto') ?? 'auto',
    bucket: str('S3_BUCKET', 'kardia') ?? 'kardia',
    replicaBucket: str('S3_REPLICA_BUCKET'),
    replicaEndpoint: str('S3_REPLICA_ENDPOINT'),
    accessKeyId: str('S3_ACCESS_KEY_ID'),
    secretAccessKey: str('S3_SECRET_ACCESS_KEY'),
    replicaAccessKeyId: str('S3_REPLICA_ACCESS_KEY_ID'),
    replicaSecretAccessKey: str('S3_REPLICA_SECRET_ACCESS_KEY'),
  },
  clamav: { host: str('CLAMAV_HOST'), port: int('CLAMAV_PORT', 3310) },
  osrmUrl: str('OSRM_URL'),
  ojp: { url: str('OJP_URL', 'https://api.opentransportdata.swiss/ojp20') ?? '', apiKey: str('OJP_API_KEY') },
  mail: {
    region: str('SES_REGION', 'eu-central-1') ?? 'eu-central-1',
    from: str('MAIL_FROM', 'Kardia <noreply@kardia.ch>') ?? 'Kardia <noreply@kardia.ch>',
    opsEmail: str('OPS_EMAIL'),
    /** `ses` (Standard in Produktion) oder `log` (Entwicklung: nur protokollieren). */
    get sesConfigured(): boolean {
      const transport = str('MAIL_TRANSPORT', process.env.NODE_ENV === 'production' ? 'ses' : 'log');
      return transport === 'ses';
    },
  },
  vapid: { publicKey: str('VAPID_PUBLIC_KEY'), privateKey: str('VAPID_PRIVATE_KEY'), subject: str('VAPID_SUBJECT', 'mailto:support@kardia.ch') ?? '' },
  uidRegisterUrl: str('UID_REGISTER_URL'),
  secoRegistryUrl: str('SECO_REGISTRY_URL'),
  backupKey: str('BACKUP_ENCRYPTION_KEY'),
  sentryDsn: str('SENTRY_DSN'),
};
