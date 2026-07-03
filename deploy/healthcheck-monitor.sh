#!/usr/bin/env bash
# =============================================================================
# MEMI — health-check monitor with alerting + flap suppression.
# =============================================================================
# Polls the backend /health endpoint (which itself checks DB connectivity, so a
# green result means the app AND its database are reachable). On failure it sends
# one alert; it won't re-alert every run while still down, and it sends a single
# "recovered" note when it comes back — so a 5-minute cron doesn't spam you.
#
# Install, e.g. every 5 minutes:
#   */5 * * * * HEALTH_URL=https://api.memiabbigliamento.it/health \
#               ALERT_EMAIL=you@example.com /path/to/deploy/healthcheck-monitor.sh >> /var/log/memi-health.log 2>&1
#
# Env:
#   HEALTH_URL     endpoint to poll (default: http://localhost:3000/health)
#   ALERT_EMAIL    if set and `mail` exists, emails alerts here
#   ALERT_WEBHOOK  if set, POSTs a JSON {text:...} here (Slack/Discord-compatible)
#   STATE_FILE     where the up/down state is remembered (default: /tmp/memi-health.state)
#   TIMEOUT        curl max seconds (default: 10)
# Exit code: 0 when healthy, 1 when unhealthy (so it also works as a raw probe).
# =============================================================================
set -uo pipefail

HEALTH_URL="${HEALTH_URL:-http://localhost:3000/health}"
STATE_FILE="${STATE_FILE:-/tmp/memi-health.state}"
TIMEOUT="${TIMEOUT:-10}"
NOW="$(date '+%Y-%m-%d %H:%M:%S')"

notify() {
  local subject="$1" body="$2"
  echo "[$NOW] ALERT: $subject — $body"
  if [ -n "${ALERT_EMAIL:-}" ] && command -v mail >/dev/null 2>&1; then
    echo "$body" | mail -s "$subject" "$ALERT_EMAIL" || true
  fi
  if [ -n "${ALERT_WEBHOOK:-}" ] && command -v curl >/dev/null 2>&1; then
    curl -s -m 10 -X POST -H 'Content-Type: application/json' \
      -d "{\"text\":\"$subject — $body\"}" "$ALERT_WEBHOOK" >/dev/null 2>&1 || true
  fi
}

prev="up"
[ -f "$STATE_FILE" ] && prev="$(cat "$STATE_FILE" 2>/dev/null || echo up)"

# Healthy = HTTP 200 AND body contains "ok" (the endpoint returns 503 + "degraded"
# when the DB is unreachable, which must count as DOWN even though the process answered).
# Use a fresh body file each run (a failed curl writes nothing, so a stale file would
# otherwise show last-success content in a DOWN alert). curl's -w always prints the
# code (000 on connect failure); don't also `|| echo` it, or the code gets doubled.
BODY_FILE="$(mktemp 2>/dev/null || echo /tmp/memi-health.body.$$)"
code="$(curl -s -o "$BODY_FILE" -w '%{http_code}' -m "$TIMEOUT" "$HEALTH_URL" 2>/dev/null)"
code="${code:-000}"
body="$(cat "$BODY_FILE" 2>/dev/null || echo '')"
rm -f "$BODY_FILE" 2>/dev/null || true

if [ "$code" = "200" ] && echo "$body" | grep -q '"status":"ok"'; then
  echo "up" > "$STATE_FILE"
  if [ "$prev" = "down" ]; then
    notify "✅ MEMI API recovered" "Health OK again at $NOW ($HEALTH_URL)"
  fi
  echo "[$NOW] OK ($HEALTH_URL)"
  exit 0
else
  echo "down" > "$STATE_FILE"
  if [ "$prev" != "down" ]; then
    notify "🔴 MEMI API DOWN" "Health check failed at $NOW — HTTP $code, body: ${body:-<empty>} ($HEALTH_URL)"
  else
    echo "[$NOW] still DOWN (HTTP $code) — alert already sent"
  fi
  exit 1
fi
