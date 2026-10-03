#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Backup database MySQL/MariaDB Barokah (dev: Docker port 3307; production: Hostinger 3306)
# Output: backups/barokah-YYYYMMDD-HHMMSS.sql.gz
#
# Kredensial diambil dari (urut): MYSQL_* env -> DATABASE_URL (.env, .env.production).

load_url() {
  local file="$1"
  [ -f "$file" ] || return 0
  local url
  url="$(grep -E '^DATABASE_URL=' "$file" | tail -1 | sed -E 's/^DATABASE_URL="?([^"]*)"?$/\1/')"
  [ -n "$url" ] || return 0
  DB_USER="$(sed -E 's#^mysql://([^:/@]+).*#\1#' <<<"$url")"
  DB_PASS="$(sed -E 's#^mysql://[^:]+:([^@]+)@.*#\1#' <<<"$url")"
  DB_HOST="$(sed -E 's#^mysql://[^@]+@([^:/]+).*#\1#' <<<"$url")"
  DB_PORT="$(sed -E 's#^mysql://[^@]+@[^:/]+:([0-9]+).*#\1#' <<<"$url")"
  DB_NAME="$(sed -E 's#^mysql://[^@]+@[^:/]+:[0-9]+/([^?]+).*#\1#' <<<"$url")"
}

DB_HOST="${MYSQL_HOST:-}"
DB_PORT="${MYSQL_PORT:-3306}"
DB_USER="${MYSQL_USER:-}"
DB_PASS="${MYSQL_PASSWORD:-}"
DB_NAME="${MYSQL_DB:-}"

if [ -z "$DB_USER" ]; then load_url .env; fi
if [ -z "$DB_USER" ]; then load_url .env.production; fi

DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-barokah}"
DB_PASS="${DB_PASS:-barokah}"
DB_NAME="${DB_NAME:-barokah}"
# "-h localhost" di klien MySQL berarti unix socket (bisa kena server lain di
# mesin ini), jadi paksa TCP lewat 127.0.0.1.
[ "$DB_HOST" = "localhost" ] && CLIENT_HOST="127.0.0.1" || CLIENT_HOST="$DB_HOST"

BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/barokah-$STAMP.sql.gz"

echo "Mengambil backup $DB_NAME@$CLIENT_HOST:$DB_PORT -> $OUT"
MYSQL_PWD="$DB_PASS" mysqldump \
  -h "$CLIENT_HOST" -P "$DB_PORT" -u "$DB_USER" \
  --single-transaction --routines --triggers --add-drop-table \
  --default-character-set=utf8mb4 "$DB_NAME" | gzip > "$OUT"

echo "Selesai. Backup terbaru:"
ls -lh "$OUT"

# Simpan 14 hari terakhir saja
find "$BACKUP_DIR" -name 'barokah-*.sql.gz' -mtime +14 -delete
echo "Backup lebih dari 14 hari dibersihkan otomatis."
