#!/usr/bin/env bash
# ==============================================================================
# Let's Encrypt SSL Registration Script — RA Community Management System
# ==============================================================================
# Registers an SSL certificate using Certbot via ACME HTTP-01 webroot challenge.
# After issuance, copies to the CANONICAL Nginx SSL paths (same as all providers).
#
# Usage:
#   ./setup_letsencrypt.sh <domain_name> <admin_email>
# ==============================================================================

set -eo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
WEBROOT="/var/www/certbot"
# SSL-1: Canonical path — same for LE, Cloudflare, and custom certs
SSL_DIR="${NGINX_SSL_DIR:-/etc/nginx/ssl}"
NGINX_CONTAINER="${NGINX_CONTAINER_NAME:-ra_nginx}"

# ── Input validation ───────────────────────────────────────────────────────────
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Error: Domain name and admin email are required." >&2
  echo "Usage: $0 <domain_name> <admin_email>" >&2
  exit 1
fi

# Validate domain — only RFC-compliant hostnames (CVE-2 defence-in-depth)
if ! echo "$DOMAIN" | grep -qE '^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'; then
  echo "Error: Invalid domain name '$DOMAIN'" >&2
  exit 1
fi

# Validate email — basic format check
if ! echo "$EMAIL" | grep -qE '^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'; then
  echo "Error: Invalid admin email '$EMAIL'" >&2
  exit 1
fi

echo "====================================================="
echo " Let's Encrypt SSL Registration — RA Community"
echo " Domain : $DOMAIN"
echo " Email  : $EMAIL"
echo " SSL Dir: $SSL_DIR"
echo "====================================================="

mkdir -p "$WEBROOT"
mkdir -p "$SSL_DIR"

# ── Issue certificate via Certbot webroot mode ─────────────────────────────────
certbot certonly --webroot \
  -w "$WEBROOT" \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive \
  --force-renewal

LE_CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

if [ ! -f "${LE_CERT_DIR}/fullchain.pem" ]; then
  echo "Error: Certbot did not produce ${LE_CERT_DIR}/fullchain.pem" >&2
  exit 1
fi

# ── SSL-1: Copy to CANONICAL Nginx paths (same location all providers use) ────
# SSL-7: Use explicit domain-scoped path — not a glob — to avoid wrong-domain copy
cp "${LE_CERT_DIR}/fullchain.pem" "${SSL_DIR}/fullchain.pem"
cp "${LE_CERT_DIR}/privkey.pem"   "${SSL_DIR}/privkey.pem"
chmod 644 "${SSL_DIR}/fullchain.pem"
chmod 600 "${SSL_DIR}/privkey.pem"  # Private key: owner read-only
echo "✓ Certificate copied to ${SSL_DIR}/"

# ── Reload Nginx via docker exec ───────────────────────────────────────────────
if command -v docker > /dev/null 2>&1; then
  docker exec "${NGINX_CONTAINER}" nginx -s reload && \
    echo "✓ Nginx container '${NGINX_CONTAINER}' reloaded." || \
    echo "⚠ Nginx reload failed — reload manually: docker exec ${NGINX_CONTAINER} nginx -s reload"
elif command -v nginx > /dev/null 2>&1; then
  # Fallback for non-Docker setups
  nginx -s reload && echo "✓ Nginx reloaded (direct)." || true
else
  echo "⚠ Nginx not found — reload manually after confirming containers are running."
fi

# Print expiry for audit trail
EXPIRY=$(openssl x509 -enddate -noout -in "${SSL_DIR}/fullchain.pem" 2>/dev/null | cut -d= -f2 || echo "unknown")
echo "✓ Let's Encrypt certificate issued and activated!"
echo "  Expires: ${EXPIRY}"
