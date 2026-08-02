#!/usr/bin/env bash
# ==============================================================================
# Let's Encrypt SSL Auto-Renewal Script — RA Community Management System
# ==============================================================================
# Renews expiring ACME SSL certificates and reloads Nginx.
# Add to crontab:
#   0 3 * * * /path/to/infra/scripts/certbot_renew.sh >> /var/log/certbot_renew.log 2>&1
# ==============================================================================

set -e

WEBROOT="/var/www/certbot"
SSL_DIR="/etc/nginx/ssl"

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Checking for Let's Encrypt certificate renewal..."

# Run certbot renew using webroot hook
certbot renew --webroot -w "$WEBROOT" --quiet --deploy-hook "
  echo 'Certificate renewed! Copying to Nginx SSL directory...'
  cp /etc/letsencrypt/live/*/fullchain.pem $SSL_DIR/fullchain.pem 2>/dev/null || true
  cp /etc/letsencrypt/live/*/privkey.pem $SSL_DIR/privkey.pem 2>/dev/null || true
  nginx -s reload || true
"

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Certbot renewal check completed."
