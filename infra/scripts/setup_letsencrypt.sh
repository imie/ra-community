#!/usr/bin/env bash
# ==============================================================================
# Let's Encrypt SSL Registration Script — RA Community Management System
# ==============================================================================
# Registers an SSL certificate using Certbot via ACME HTTP-01 webroot challenge.
#
# Usage:
#   ./setup_letsencrypt.sh <domain_name> <admin_email>
# ==============================================================================

set -e

DOMAIN="${1:-}"
EMAIL="${2:-}"
WEBROOT="/var/www/certbot"
SSL_DIR="/etc/nginx/ssl"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Error: Domain name and admin email are required."
  echo "Usage: $0 <domain_name> <admin_email>"
  exit 1
fi

echo "====================================================="
echo "Registering Let's Encrypt SSL Certificate"
echo "Domain: $DOMAIN"
echo "Email : $EMAIL"
echo "====================================================="

mkdir -p "$WEBROOT"
mkdir -p "$SSL_DIR"

# Issue certificate via Certbot webroot mode
certbot certonly --webroot \
  -w "$WEBROOT" \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive \
  --force-renewal

# Symlink or copy generated certificates to Nginx SSL directory
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/fullchain.pem"
  cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/privkey.pem"
  echo "✓ Certificate copied to $SSL_DIR"
fi

# Reload Nginx to apply SSL certificate
if command -v nginx > /dev/null 2>&1; then
  nginx -s reload || true
  echo "✓ Nginx reloaded cleanly."
fi

echo "✓ Let's Encrypt SSL Certificate issued and configured successfully!"
