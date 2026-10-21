# Web-Dienst (PRD 10.2): Next.js standalone, min. 2 Replikas, Health-Check /api/health.
# Build-Kontext ist das Repo-Wurzelverzeichnis: docker build -f apps/web/Dockerfile .

FROM node:22-bookworm-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=1 NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo
COPY . .
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
ARG NEXT_PUBLIC_MAP_STYLE=""
ARG NEXT_PUBLIC_SENTRY_DSN=""
ARG RAILWAY_GIT_COMMIT_SHA=""
RUN pnpm install --frozen-lockfile --filter @kardia/web... --filter @kardia/db \
 && DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm --filter @kardia/db generate \
 && SKIP_ENV_VALIDATION=1 pnpm --filter @kardia/web build
# Werkzeug für den Pre-Deploy: Prisma-CLI, Migrationen und Seed als eigenständiges Paket.
RUN pnpm --filter @kardia/db deploy --legacy /tools/db \
 && cd /tools/db && DATABASE_URL=postgresql://build:build@localhost:5432/build node node_modules/prisma/build/index.js generate

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN groupadd -r kardia && useradd -r -m -g kardia kardia
COPY --from=build --chown=kardia:kardia /repo/apps/web/.next/standalone ./
COPY --from=build --chown=kardia:kardia /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=kardia:kardia /repo/apps/web/public ./apps/web/public
# Migrationen (und optional Demo-Daten) laufen als Pre-Deploy-Befehl, siehe railway.json.
COPY --from=build --chown=kardia:kardia /tools/db ./tools/db
USER kardia
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
