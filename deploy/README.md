# MEMI — Deployment operations scripts (`deploy/`)

Installable, tested scripts for running MEMI in production on a Hetzner VPS (Docker
Compose, typically under Coolify). These replace the copy-paste cron snippets that used
to live only as text in `docs/PRODUCTION-READINESS.md` §6–7. Every script here was run
end-to-end against the live local stack — see the round-trip proofs noted below.

All scripts **discover the running containers and volumes by their Docker Compose service
label** (`com.docker.compose.service=mysql` / `=backend`), not by a hardcoded name — so
they work regardless of the project-directory prefix Compose derives (locally that's
`memigestionale_*`; on the server it'll be whatever the deploy directory is called). The
old docs hardcoded `memi_uploads_data`, which never matched the real volume name.

## Files

| Script | What it does |
|--------|--------------|
| `backup.sh` | `mysqldump --single-transaction` → gzip, and/or tar the uploads volume; prunes archives older than `RETENTION_DAYS`. Guards against a silent empty dump. |
| `restore.sh` | Restores a `backup.sh` archive (DB and/or uploads). Destructive → prompts for `yes` unless `FORCE=1`. |
| `healthcheck-monitor.sh` | Polls `/health` (which checks DB connectivity too); alerts once on down, suppresses repeats, sends one recovery note. Email (`mail`) and/or webhook (Slack/Discord). |

## Install (Hetzner box crontab)

```bash
# Copy the repo (or just deploy/) to the server, make scripts executable:
chmod +x deploy/*.sh
sudo mkdir -p /backups

crontab -e
```

```cron
# Daily DB backup at 03:00 (MYSQL_ROOT_PASSWORD must match the stack's env)
0 3 * * *  MYSQL_ROOT_PASSWORD='<root-pw>' BACKUP_DIR=/backups /opt/memi/deploy/backup.sh db      >> /var/log/memi-backup.log 2>&1

# Weekly uploads backup, Sunday 04:00
0 4 * * 0  BACKUP_DIR=/backups /opt/memi/deploy/backup.sh uploads                                  >> /var/log/memi-backup.log 2>&1

# Health monitor every 5 minutes
*/5 * * * *  HEALTH_URL=https://api.memiabbigliamento.it/health ALERT_EMAIL=you@example.com \
             /opt/memi/deploy/healthcheck-monitor.sh                                               >> /var/log/memi-health.log 2>&1
```

`RETENTION_DAYS` (default 30) controls pruning. For off-box durability, sync `/backups`
to object storage (Hetzner Storage Box / S3) with a second cron — a backup on the same
server it protects is not a disaster-recovery backup.

## Restore (disaster recovery)

```bash
# List archives
ls -lh /backups

# Restore the database (asks for confirmation)
MYSQL_ROOT_PASSWORD='<root-pw>' deploy/restore.sh db      /backups/memi_db_YYYYMMDD_HHMMSS.sql.gz

# Restore uploaded images
deploy/restore.sh uploads /backups/memi_uploads_YYYYMMDD_HHMMSS.tgz
```

Do a **restore drill** on a staging stack at least once — an untested backup is a guess.
Both round-trips were verified during Phase 6/7: DB dump → restore keeps all 23 products;
uploads tar → wipe → restore brings the WebP variants back intact.

## Notes

- The scripts are POSIX-ish bash and assume the Docker CLI is on PATH and the stack is up.
- `backup.sh` passes the DB password via `MYSQL_PWD` inside the container, so it never
  appears in `docker exec`'s visible argument list / process table.
- On a **fresh volume**, the backend now retries its first DB connection (see
  `MEMI-Backend/src/server.js` `connectWithRetry`), so `docker compose up` no longer
  reports a spurious "dependency backend failed to start" on the very first boot.
