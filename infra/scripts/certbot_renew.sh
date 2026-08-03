#!/usr/bin/env bash
# ==============================================================================
# Let's Encrypt SSL Auto-Renewal Script — RA Community Management System
# ==============================================================================
# Renews expiring ACME certificates and copies them to the canonical Nginx paths.
# Triggers Nginx reload via docker exec after successful renewal.
#
# Add to crontab (runs daily at 03:00 UTC):
#   0 3 * * * /path/to/infra/scripts/certbot_renew.sh >> /var/log/certbot_renew.log 2>&1
# ==============================================================================

set -eo pipefail

# SSL-1: Canonical cert paths (same for all providers)
SSL_DIR="${NGINX_SSL_DIR:-/etc/nginx/ssl}"
NGINX_CONTAINER="${NGINX_CONTAINER_NAME:-ra_nginx}"

# SSL-7: Read the active domain from the certbot live directory listing
# Uses the first (and expected only) domain rather than a wildcard glob
DOMAIN="${LE_DOMAIN:-}"
if [ -z "$DOMAIN" ]; then
  # Auto-detect: find the first domain registered with certbot
  DOMAIN=$(ls /etc/letsencrypt/live/ 2>/dev/null | grep -v README | head -1 || true)
fi

LE_CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Checking Let's Encrypt renewal for domain: ${DOMAIN:-'(none)'}"

if [ -z "$DOMAIN" ] || [ ! -d "$LE_CERT_DIR" ]; then
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] No active Let's Encrypt domain found. Skipping renewal."
  exit 0
fi

# ── Attempt renewal ────────────────────────────────────────────────────────────
certbot renew \
  --webroot -w "/var/www/certbot" \
  --cert-name "$DOMAIN" \
  --quiet \
  --no-random-sleep-on-renew

# ── Check if cert was actually renewed (modification time changed) ─────────────
if [ "${LE_CERT_DIR}/fullchain.pem" -nt "${SSL_DIR}/fullchain.pem" ] 2>/dev/null; then
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Certificate renewed! Copying to ${SSL_DIR}/..."

  # SSL-7: Explicit domain-scoped path — not a wildcard glob
  cp "${LE_CERT_DIR}/fullchain.pem" "${SSL_DIR}/fullchain.pem"
  cp "${LE_CERT_DIR}/privkey.pem"   "${SSL_DIR}/privkey.pem"
  chmod 644 "${SSL_DIR}/fullchain.pem"
  chmod 600 "${SSL_DIR}/privkey.pem"

  # Reload Nginx via docker exec
  if command -v docker > /dev/null 2>&1; then
    docker exec "${NGINX_CONTAINER}" nginx -s reload && \
      echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] ✓ Nginx reloaded." || \
      echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] ⚠ Nginx reload failed — manual reload required."
  elif command -v nginx > /dev/null 2>&1; then
    nginx -s reload && echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] ✓ Nginx reloaded (direct)." || true
  fi

  EXPIRY=$(openssl x509 -enddate -noout -in "${SSL_DIR}/fullchain.pem" 2>/dev/null | cut -d= -f2 || echo "unknown")
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] New cert expires: ${EXPIRY}"
else
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Certificate not yet due for renewal. No action taken."
fi

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Renewal check completed."
