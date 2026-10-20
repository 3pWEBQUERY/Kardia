import { defineConfig, env } from 'prisma/config';

// Für den Pre-Deploy-Befehl in Railway: ohne dotenv, Variablen kommen aus der Umgebung.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
});
