# SSL Certificate Directory

This directory (`infra/nginx/ssl/`) is mounted into the Nginx container at `/etc/nginx/ssl/`.

## Canonical Certificate Files

All SSL providers write to the **same two files**:

| File | Purpose |
|------|---------|
| `fullchain.pem` | Full certificate chain (leaf + intermediates) |
| `privkey.pem` | Private key (permissions: `600` — owner read-only) |

Nginx reads **only** these two files — there is no per-provider divergence.

---

## SSL Provider Options

### 1. Let's Encrypt (ACME / certbot)
- Set up via Admin → Community Settings → SSL → Let's Encrypt
- Script: `infra/scripts/setup_letsencrypt.sh <domain> <email>`
- Auto-renewal: `infra/scripts/certbot_renew.sh` (cron: daily at 03:00 UTC)
- Certbot issues certs to `/etc/letsencrypt/live/<domain>/` and copies them here.

### 2. Cloudflare Origin Certificate
- Set up via Admin → Community Settings → SSL → Cloudflare
- Obtain from: **Cloudflare Dashboard → your domain → SSL/TLS → Origin Server → Create Certificate**
- Paste the Origin Certificate and Private Key into the admin UI.
- **Set Cloudflare SSL/TLS mode to `Full (strict)`** for end-to-end encryption.
- Cloudflare Origin Certs are valid for up to 15 years.
- ⚠️  These certs only work when traffic passes through Cloudflare's proxy (orange cloud ☁ enabled).

### 3. Custom Certificate (any CA)
- Set up via Admin → Community Settings → SSL → Custom Certificate
- Paste your fullchain PEM and private key PEM into the admin UI.
- Works with any CA: DigiCert, Sectigo, ZeroSSL, etc.

---

## Development

For local development (no HTTPS required), place placeholder files here so Nginx starts without errors:

```bash
# Generate a self-signed cert for local dev only
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout infra/nginx/ssl/privkey.pem \
  -out infra/nginx/ssl/fullchain.pem \
  -subj "/CN=localhost"
```

> **Never commit real certificates or private keys to git.**
> This directory is in `.gitignore`.
