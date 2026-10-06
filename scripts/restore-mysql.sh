#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Restore database MySQL/MariaDB Barokah
# Usage: bash scripts/restore-mysql.sh <file.sql.gz>
#
# Dump dari mysqldump sudah menyertakan DROP TABLE, jadi tabel lama otomatis
# diganti. Kredensial diambil dari (urut): MYSQL_* env -> DATABASE_URL.

if [ $# -ne 1 ]; then
  echo "Usage: $0 <file.sql.gz>"
  exit 1
fi
FILE="$1"
if [ ! -f "$FILE" ]; then
  echo "File tidak ditemukan: $FILE"
  exit 1
fi

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
# "-h localhost" di klien MySQL berarti unix socket, jadi paksa TCP.
[ "$DB_HOST" = "localhost" ] && CLIENT_HOST="127.0.0.1" || CLIENT_HOST="$DB_HOST"

echo "Restore $FILE -> $DB_NAME@$CLIENT_HOST:$DB_PORT"
MYSQL_PWD="$DB_PASS" mysql \
  -h "$CLIENT_HOST" -P "$DB_PORT" -u "$DB_USER" \
  --default-character-set=utf8mb4 "$DB_NAME" < <(gunzip -c "$FILE")
echo "Restore selesai."
echo "Kalau skema berubah, sinkronkan dulu: pnpm db:deploy"
