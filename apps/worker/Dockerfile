# Worker-Dienst (PRD 10.2): gleicher Code-Stand wie Web, Start mit `node dist/worker.js`.
# Enthält ffmpeg (Videos), ClamAV (Virenscan) und pg_dump 18 (nächtliches Backup).
# Build-Kontext ist das Repo-Wurzelverzeichnis: docker build -f apps/worker/Dockerfile .

FROM node:22-bookworm-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=1
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @kardia/worker... \
 && DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm --filter @kardia/db generate \
 && pnpm --filter @kardia/worker build \
 && pnpm --filter @kardia/worker deploy --prod --legacy /out \
 && cp -r apps/worker/dist /out/dist

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg ffmpeg clamav-daemon clamav-freshclam \
 && install -d /usr/share/postgresql-common/pgdg \
 && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
 && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update && apt-get install -y --no-install-recommends postgresql-client-18 \
 && apt-get purge -y gnupg && apt-get autoremove -y && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /run/clamav && chown clamav:clamav /run/clamav \
 && sed -i '/^TCPSocket/d; /^TCPAddr/d' /etc/clamav/clamd.conf \
 && printf 'TCPSocket 3310\nTCPAddr 127.0.0.1\n' >> /etc/clamav/clamd.conf
# Signaturen beim Build vorladen; Fehler sind nicht fatal (Aktualisierung beim Start).
RUN freshclam --quiet || true
WORKDIR /app
COPY --from=build /out ./
COPY apps/worker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENV CLAMAV_HOST=127.0.0.1 CLAMAV_PORT=3310
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/worker.js"]
