#!/bin/sh
# Signaturen aktualisieren und clamd im Hintergrund starten, dann den Worker.
set -e
freshclam --quiet || echo "freshclam fehlgeschlagen – verwende vorhandene Signaturen" >&2
freshclam -d --quiet || true
clamd &
# Warten, bis clamd auf Port 3310 antwortet (höchstens 120 s).
i=0
until node -e "require('net').connect(3310,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" || [ $i -ge 60 ]; do
  i=$((i + 1)); sleep 2
done
exec "$@"
