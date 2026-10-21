import 'server-only';

import { z } from 'zod';

/** Serverseitige Variablen, einmal validiert. Fehlende Secrets brechen den Start ab, nicht erst den Request. */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ORIGIN: z.url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  PASSKEY_RP_ID: z.string().default('localhost'),
  FIELD_ENCRYPTION_KEYS: z.string().min(10),
  VOTER_HASH_SECRET: z.string().min(8),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().default('kardia'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRAXIS: z.string().optional(),
  STRIPE_PRICE_INSTITUTION: z.string().optional(),
  STRIPE_PRICE_SPITALGRUPPE: z.string().optional(),
  STRIPE_PRICE_SINGLE_LISTING: z.string().optional(),
  BILLING_IBAN: z.string().default('CH4431999123000889012'),
  BILLING_CREDITOR_NAME: z.string().default('Kardia AG'),
  BILLING_CREDITOR_ADDRESS: z.string().default('Musterstrasse 1'),
  BILLING_CREDITOR_ZIP: z.string().default('8000'),
  BILLING_CREDITOR_CITY: z.string().default('Zürich'),
  RATE_LIMIT_DISABLED: z.stringbool().default(false),
  /** Demo-Umgebung: Ein-Klick-Anmeldung als fiktive Seed-Persona. Nie in echter Produktion. */
  DEMO_LOGIN: z.stringbool().default(false),
});

type Env = z.infer<typeof schema>;
let cached: Env | undefined;

export function env(): Env {
  cached ??= schema.parse(process.env);
  return cached;
}
