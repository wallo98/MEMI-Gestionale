#!/usr/bin/env bash
# =============================================================================
# MEMI — production backup (MySQL dump + uploads volume) with rotation.
# =============================================================================
# Drop-in for the Hetzner box's crontab. Discovers the running containers/volumes
# by their Docker Compose SERVICE LABEL (not by a hardcoded name), so it works
# regardless of the project directory name Compose derives the prefix from.
#
# Install (as root or the docker-group user), e.g. daily 03:00 + weekly uploads:
#   crontab -e
#   0 3 * * *  MYSQL_ROOT_PASSWORD='...' BACKUP_DIR=/backups /path/to/deploy/backup.sh db      >> /var/log/memi-backup.log 2>&1
#   0 4 * * 0  BACKUP_DIR=/backups /path/to/deploy/backup.sh uploads                            >> /var/log/memi-backup.log 2>&1
# Or run `... backup.sh all` to do both in one shot.
#
# Env:
#   MYSQL_ROOT_PASSWORD   required for the db dump (same value as in the stack's env)
#   DB_NAME               database to dump (default: memi_db)
#   BACKUP_DIR            where to write archives (default: /backups)
#   RETENTION_DAYS        delete archives older than this (default: 30)
#   COMPOSE_PROJECT       optional: restrict discovery to one compose project name
# =============================================================================
set -euo pipefail

MODE="${1:-all}"                       # db | uploads | all
DB_NAME="${DB_NAME:-memi_db}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
STAMP="$(date +%Y%m%d_%H%M%S)"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "docker not found on PATH"
mkdir -p "$BACKUP_DIR" || die "cannot create BACKUP_DIR=$BACKUP_DIR"

# Find a running container for a given compose service (mysql / backend).
find_service_container() {
  local service="$1"
  local filters=(--filter "label=com.docker.compose.service=${service}" --filter "status=running")
  [ -n "${COMPOSE_PROJECT:-}" ] && filters+=(--filter "label=com.docker.compose.project=${COMPOSE_PROJECT}")
  docker ps "${filters[@]}" --format '{{.ID}}' | head -1
}

backup_db() {
  local cid; cid="$(find_service_container mysql)"
  [ -n "$cid" ] || die "no running 'mysql' compose service container found (is the stack up?)"
  [ -n "${MYSQL_ROOT_PASSWORD:-}" ] || die "MYSQL_ROOT_PASSWORD is required for the DB dump"

  local out="$BACKUP_DIR/memi_db_${STAMP}.sql.gz"
  log "Dumping database '$DB_NAME' from container $cid -> $out"
  # --single-transaction: consistent dump without locking the whole DB (InnoDB).
  # Password passed via env inside the container, never on the visible arg list.
  if docker exec -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" "$cid" \
        mysqldump --single-transaction --routines --triggers -u root "$DB_NAME" \
        | gzip > "$out"; then
    # A valid gzip of an empty/failed dump is tiny — guard against a silent 0-row backup.
    local size; size="$(stat -c%s "$out" 2>/dev/null || echo 0)"
    [ "$size" -gt 200 ] || die "DB dump looks empty ($size bytes) — check credentials/DB name; kept at $out for inspection"
    log "DB dump OK ($size bytes)"
  else
    rm -f "$out"
    die "mysqldump failed"
  fi
}

backup_uploads() {
  # Read the uploads volume straight off the backend container's mount, so we never
  # guess the project-prefixed volume name. Fall back to a name-suffix match.
  local bcid; bcid="$(find_service_container backend)"
  local vol=""
  if [ -n "$bcid" ]; then
    vol="$(docker inspect "$bcid" \
      --format '{{ range .Mounts }}{{ if eq .Destination "/app/uploads" }}{{ .Name }}{{ end }}{{ end }}' 2>/dev/null || true)"
  fi
  [ -n "$vol" ] || vol="$(docker volume ls --format '{{.Name}}' | grep -E '_uploads_data$' | head -1)"
  [ -n "$vol" ] || die "could not locate the uploads_data volume (backend running? volume present?)"

  local out="$BACKUP_DIR/memi_uploads_${STAMP}.tgz"
  log "Archiving uploads volume '$vol' -> $out"
  # Mount the named volume read-only into a throwaway alpine and tar it out.
  docker run --rm -v "${vol}:/data:ro" -v "${BACKUP_DIR}:/backup" alpine \
    tar czf "/backup/$(basename "$out")" -C /data . \
    || die "uploads archive failed"
  log "Uploads archive OK ($(stat -c%s "$out" 2>/dev/null || echo '?') bytes)"
}

rotate() {
  log "Pruning archives older than ${RETENTION_DAYS} days in $BACKUP_DIR"
  find "$BACKUP_DIR" -maxdepth 1 -name 'memi_db_*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
  find "$BACKUP_DIR" -maxdepth 1 -name 'memi_uploads_*.tgz' -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
}

case "$MODE" in
  db)      backup_db ;;
  uploads) backup_uploads ;;
  all)     backup_db; backup_uploads ;;
  *)       die "usage: backup.sh [db|uploads|all]" ;;
esac
rotate
log "Backup ($MODE) complete."
