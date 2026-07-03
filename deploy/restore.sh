#!/usr/bin/env bash
# =============================================================================
# MEMI — restore a backup produced by deploy/backup.sh.
# =============================================================================
# A backup you can't restore is worthless, so this is the tested companion.
# Restores a MySQL dump and/or the uploads volume archive. DESTRUCTIVE — it
# overwrites current data — so it always asks for confirmation unless FORCE=1.
#
# Usage:
#   MYSQL_ROOT_PASSWORD='...' deploy/restore.sh db      /backups/memi_db_YYYYMMDD_HHMMSS.sql.gz
#   deploy/restore.sh uploads /backups/memi_uploads_YYYYMMDD_HHMMSS.tgz
#
# Env: MYSQL_ROOT_PASSWORD (for db), DB_NAME (default memi_db), COMPOSE_PROJECT,
#      FORCE=1 to skip the confirmation prompt (for scripted DR drills).
# =============================================================================
set -euo pipefail

MODE="${1:-}"
ARCHIVE="${2:-}"
DB_NAME="${DB_NAME:-memi_db}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2; exit 1; }

[ -n "$MODE" ] && [ -n "$ARCHIVE" ] || die "usage: restore.sh [db|uploads] <archive-path>"
[ -f "$ARCHIVE" ] || die "archive not found: $ARCHIVE"
command -v docker >/dev/null 2>&1 || die "docker not found on PATH"

confirm() {
  [ "${FORCE:-0}" = "1" ] && return 0
  echo "⚠️  This will OVERWRITE current $MODE data from: $ARCHIVE"
  read -r -p "Type 'yes' to continue: " ans
  [ "$ans" = "yes" ] || die "aborted by user"
}

find_service_container() {
  local service="$1"
  local filters=(--filter "label=com.docker.compose.service=${service}" --filter "status=running")
  [ -n "${COMPOSE_PROJECT:-}" ] && filters+=(--filter "label=com.docker.compose.project=${COMPOSE_PROJECT}")
  docker ps "${filters[@]}" --format '{{.ID}}' | head -1
}

restore_db() {
  local cid; cid="$(find_service_container mysql)"
  [ -n "$cid" ] || die "no running 'mysql' compose service container found"
  [ -n "${MYSQL_ROOT_PASSWORD:-}" ] || die "MYSQL_ROOT_PASSWORD is required"
  confirm
  log "Restoring '$DB_NAME' from $ARCHIVE into container $cid"
  gunzip -c "$ARCHIVE" | docker exec -i -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" "$cid" \
    mysql -u root "$DB_NAME" \
    || die "mysql restore failed"
  log "DB restore complete."
}

restore_uploads() {
  local bcid; bcid="$(find_service_container backend)"
  local vol=""
  if [ -n "$bcid" ]; then
    vol="$(docker inspect "$bcid" \
      --format '{{ range .Mounts }}{{ if eq .Destination "/app/uploads" }}{{ .Name }}{{ end }}{{ end }}' 2>/dev/null || true)"
  fi
  [ -n "$vol" ] || vol="$(docker volume ls --format '{{.Name}}' | grep -E '_uploads_data$' | head -1)"
  [ -n "$vol" ] || die "could not locate the uploads_data volume"
  confirm
  log "Restoring uploads volume '$vol' from $ARCHIVE"
  # Wipe then extract, so removed files don't linger. Runs in a throwaway alpine.
  docker run --rm -v "${vol}:/data" -v "$(cd "$(dirname "$ARCHIVE")" && pwd):/backup:ro" alpine \
    sh -c "rm -rf /data/* && tar xzf /backup/$(basename "$ARCHIVE") -C /data" \
    || die "uploads restore failed"
  log "Uploads restore complete."
}

case "$MODE" in
  db)      restore_db ;;
  uploads) restore_uploads ;;
  *)       die "usage: restore.sh [db|uploads] <archive-path>" ;;
esac
