#!/bin/sh
# Pre-Deploy auf Railway (siehe apps/web/railway.json): Migrationen, optional Demo-Daten.
# SEED_DEMO=1 spielt die fiktiven Demo-Daten nur in eine leere Datenbank ein.
set -e
cd "$(dirname "$0")/.."
node node_modules/prisma/build/index.js migrate deploy --config prisma.deploy.config.ts
if [ "$SEED_DEMO" = "1" ]; then
  node node_modules/tsx/dist/cli.mjs src/seed/index.ts --if-empty
fi
