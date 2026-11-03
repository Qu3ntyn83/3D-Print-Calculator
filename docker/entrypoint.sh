#!/bin/sh
# Startet als root, sorgt für Schreibrechte auf /data (auch bei Bind-Mounts)
# und läuft danach als unprivilegierter Benutzer "node" (bzw. PUID/PGID).
set -e
PUID="${PUID:-1000}"
PGID="${PGID:-1000}"
if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DATA_DIR"
  chown -R "$PUID:$PGID" "$DATA_DIR" 2>/dev/null || echo "Hinweis: Rechte für $DATA_DIR konnten nicht gesetzt werden"
  exec su-exec "$PUID:$PGID" "$@"
fi
exec "$@"
