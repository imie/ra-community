"""
Community Settings API Router — Branding, logo upload, SSL mode,
Custom SSL certs, Cloudflare Origin Certs & Let's Encrypt ACME.

Security hardening applied:
  - CVE-2:  Domain/email validated by strict regex before subprocess call.
  - CVE-3:  File upload validates extension whitelist, file size, magic bytes.
  - CVE-10: GET /settings requires authentication.
  - SSL-1:  All cert providers write to the SAME canonical Nginx path.
  - SSL-2:  PEM structure validated before writing to disk.
  - Nginx reload triggered after every cert write via docker exec.
"""
import os
import re
import subprocess
import uuid
from typing import Any, Optional
from datetime import datetime, timezone

from cryptography import x509
from cryptography.hazmat.backends import default_backend
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.community_settings import CommunitySettings
from app.models.user import User
from app.schemas.community_settings import (
    CommunitySettingsResponse,
    CommunitySettingsUpdate,
    CustomSSLUpload,
    CloudflareSSLUpload,
    LetsEncryptRequest,
)
from app.api.admin import get_admin_user
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/community", tags=["community"])

# ── Security validators (CVE-2) ────────────────────────────────────────────────
# Strict RFC-compliant hostname: only letters, digits, hyphens, dots
_DOMAIN_RE = re.compile(
    r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$"
)
_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")

# ── File upload safety (CVE-3) ─────────────────────────────────────────────────
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".svg"}
MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
_MAGIC_BYTES: dict[bytes, str] = {
    b"\x89PNG": "image/png",
    b"\xff\xd8\xff": "image/jpeg",
    b"RIFF": "image/webp",
    b"<svg": "image/svg+xml",
    b"<?xm": "image/svg+xml",
}

# ── Canonical SSL certificate paths (SSL-1) ────────────────────────────────────
# ALL providers (Let's Encrypt, Cloudflare, custom) write to these unified paths.
# Nginx always reads from these locations — no per-provider divergence.
NGINX_SSL_DIR = os.getenv("NGINX_SSL_DIR", "/etc/nginx/ssl")
NGINX_CERT_PATH = os.path.join(NGINX_SSL_DIR, "fullchain.pem")
NGINX_KEY_PATH = os.path.join(NGINX_SSL_DIR, "privkey.pem")

# Nginx container name used by docker exec for reload
NGINX_CONTAINER = os.getenv("NGINX_CONTAINER_NAME", "ra_nginx")


# ── Helper: Validate image bytes (CVE-3) ──────────────────────────────────────

def _validate_image_bytes(contents: bytes, ext: str) -> None:
    """Raise HTTPException if file contents do not match an expected image format."""
    if ext == ".svg":
        snippet = contents[:200].lower()
        if b"<svg" not in snippet and b"<?xml" not in snippet:
            raise HTTPException(status_code=400, detail="SVG file content is invalid")
        return
    for magic in _MAGIC_BYTES:
        if contents[: len(magic)] == magic:
            return
    raise HTTPException(
        status_code=400,
        detail="File content does not match an allowed image format (PNG, JPG, WebP, SVG)",
    )


# ── Helper: Validate & parse PEM certificate (SSL-2) ──────────────────────────

def _validate_and_parse_pem(fullchain_pem: str, privkey_pem: str) -> Optional[datetime]:
    """
    Validate that:
      1. fullchain_pem contains a valid PEM certificate header.
      2. privkey_pem contains a valid PEM private key header.
      3. Parse and return the certificate's expiry date (notAfter).

    Raises HTTPException(400) if either value is structurally invalid.
    Returns the cert expiry datetime (UTC-aware) or None if parsing fails.
    """
    cert_pem = fullchain_pem.strip()
    key_pem = privkey_pem.strip()

    if "-----BEGIN CERTIFICATE-----" not in cert_pem:
        raise HTTPException(
            status_code=400,
            detail="Invalid certificate: must contain '-----BEGIN CERTIFICATE-----' PEM header.",
        )
    if not any(
        marker in key_pem
        for marker in (
            "-----BEGIN PRIVATE KEY-----",
            "-----BEGIN RSA PRIVATE KEY-----",
            "-----BEGIN EC PRIVATE KEY-----",
        )
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid private key: must contain a valid PEM private key header "
                "(PRIVATE KEY, RSA PRIVATE KEY, or EC PRIVATE KEY)."
            ),
        )

    # Parse expiry date using cryptography library
    cert_expires_at: Optional[datetime] = None
    try:
        # Extract only the first cert from a chain
        first_cert_end = cert_pem.find("-----END CERTIFICATE-----")
        if first_cert_end != -1:
            single_cert_pem = cert_pem[: first_cert_end + len("-----END CERTIFICATE-----")]
            cert = x509.load_pem_x509_certificate(
                single_cert_pem.encode("utf-8"), default_backend()
            )
            cert_expires_at = cert.not_valid_after_utc
    except Exception:
        # Parsing failed but structure check passed — continue without expiry date
        pass

    return cert_expires_at


# ── Helper: Write cert files to unified Nginx path (SSL-1) ────────────────────

def _write_cert_to_nginx(fullchain_pem: str, privkey_pem: str) -> None:
    """
    Write the certificate and key to the canonical Nginx SSL paths.
    These are the SAME paths for all providers (Let's Encrypt, Cloudflare, custom).
    After writing, signal Nginx to reload its configuration.
    """
    os.makedirs(NGINX_SSL_DIR, exist_ok=True)

    # Write with restrictive permissions — private key must not be world-readable
    cert_tmp = NGINX_CERT_PATH + ".tmp"
    key_tmp = NGINX_KEY_PATH + ".tmp"

    try:
        with open(cert_tmp, "w", encoding="utf-8") as f:
            f.write(fullchain_pem.strip() + "\n")
        os.chmod(cert_tmp, 0o644)

        with open(key_tmp, "w", encoding="utf-8") as f:
            f.write(privkey_pem.strip() + "\n")
        os.chmod(key_tmp, 0o600)  # Private key: owner read-only

        # Atomic rename — avoids Nginx reading a half-written cert
        os.replace(cert_tmp, NGINX_CERT_PATH)
        os.replace(key_tmp, NGINX_KEY_PATH)
    except Exception as exc:
        # Clean up temp files on failure
        for tmp in (cert_tmp, key_tmp):
            try:
                os.remove(tmp)
            except FileNotFoundError:
                pass
        raise HTTPException(
            status_code=500,
            detail=f"Failed to write SSL certificate to disk: {exc}",
        )


def _reload_nginx() -> str:
    """
    Send nginx -s reload to the Nginx container via docker exec.
    Returns a status string for logging. Never raises — reload errors are non-fatal.
    """
    try:
        result = subprocess.run(
            ["docker", "exec", NGINX_CONTAINER, "nginx", "-s", "reload"],
            capture_output=True,
            text=True,
            timeout=15,
            shell=False,
        )
        if result.returncode == 0:
            return "nginx_reloaded"
        else:
            # Log but don't block the API response
            print(f"[WARN] Nginx reload returned non-zero: {result.stderr}")
            return "nginx_reload_failed"
    except Exception as exc:
        print(f"[WARN] Nginx reload exception: {exc}")
        return "nginx_reload_skipped"


# ── DB helper ──────────────────────────────────────────────────────────────────

def get_or_create_settings(db: Session) -> CommunitySettings:
    """Fetch singleton CommunitySettings or seed the default row."""
    settings = db.query(CommunitySettings).first()
    if not settings:
        settings = CommunitySettings(
            community_name="RA Community — Taman Aman Serenia",
            ssl_mode="disabled",
            ssl_status="disabled",
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/settings")
def get_community_settings(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),  # CVE-10: require authentication
) -> Any:
    """Authenticated endpoint to fetch community branding and SSL configuration."""
    settings = get_or_create_settings(db)
    return {
        "id": str(settings.id),
        "community_name": settings.community_name,
        "logo_url": settings.logo_url,
        "ssl_mode": settings.ssl_mode,
        "ssl_provider": settings.ssl_provider,
        "domain_name": settings.domain_name,
        "admin_email": settings.admin_email,
        "enforce_https": settings.enforce_https,
        "ssl_status": settings.ssl_status,
        "ssl_error_message": settings.ssl_error_message,
        "auto_renew": settings.auto_renew,
        "cert_expires_at": settings.cert_expires_at.isoformat() if settings.cert_expires_at else None,
        "last_renewed_at": settings.last_renewed_at.isoformat() if settings.last_renewed_at else None,
        "created_at": settings.created_at.isoformat() if settings.created_at else None,
        "updated_at": settings.updated_at.isoformat() if settings.updated_at else None,
    }


@router.put("/settings")
def update_community_settings(
    update_data: CommunitySettingsUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> Any:
    """Admin-only endpoint to update community branding and settings."""
    settings = get_or_create_settings(db)

    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)

    db.add(settings)
    db.commit()
    db.refresh(settings)
    return get_community_settings(db)


@router.post("/settings/logo")
def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> Any:
    """Upload community logo image (CVE-3: extension whitelist + magic bytes + size cap)."""
    raw_ext = os.path.splitext(file.filename or "")[1].lower()
    if raw_ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}",
        )

    settings = get_or_create_settings(db)

    contents = file.file.read(MAX_LOGO_SIZE_BYTES + 1)
    if len(contents) > MAX_LOGO_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_LOGO_SIZE_BYTES // 1024 // 1024} MB.",
        )

    _validate_image_bytes(contents, raw_ext)

    upload_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    filename = f"community_logo_{uuid.uuid4().hex}{raw_ext}"
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    settings.logo_url = f"/uploads/{filename}"
    db.add(settings)
    db.commit()

    return {"message": "Logo uploaded successfully", "logo_url": settings.logo_url}


# ── SSL Certificate Endpoints ──────────────────────────────────────────────────

@router.post("/settings/ssl/custom")
def upload_custom_ssl(
    cert_data: CustomSSLUpload,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> Any:
    """
    Upload a custom (self-managed) SSL certificate.

    SSL-1: Writes to the SAME canonical Nginx paths as Let's Encrypt and Cloudflare.
    SSL-2: PEM structure validated before writing.
    """
    # SSL-2: Validate PEM structure and parse expiry
    cert_expires_at = _validate_and_parse_pem(cert_data.fullchain_pem, cert_data.privkey_pem)

    # SSL-1: Write to unified canonical paths
    _write_cert_to_nginx(cert_data.fullchain_pem, cert_data.privkey_pem)

    settings = get_or_create_settings(db)
    settings.ssl_mode = "custom"
    settings.ssl_provider = "custom"
    settings.custom_cert_path = NGINX_CERT_PATH
    settings.custom_key_path = NGINX_KEY_PATH
    settings.cert_expires_at = cert_expires_at
    settings.ssl_status = "active"
    settings.ssl_error_message = None
    settings.last_renewed_at = datetime.now(timezone.utc)
    db.add(settings)
    db.commit()

    nginx_status = _reload_nginx()

    return {
        "message": "Custom SSL certificate uploaded and activated successfully.",
        "ssl_mode": "custom",
        "ssl_provider": "custom",
        "cert_path": NGINX_CERT_PATH,
        "cert_expires_at": cert_expires_at.isoformat() if cert_expires_at else None,
        "nginx_status": nginx_status,
        "status": "active",
    }


@router.post("/settings/ssl/cloudflare")
def upload_cloudflare_ssl(
    cert_data: CloudflareSSLUpload,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> Any:
    """
    Upload a Cloudflare Origin Certificate.

    Cloudflare Origin Certificates are issued by Cloudflare's own CA.
    They ONLY work when traffic passes through Cloudflare's proxy (orange cloud enabled).
    Set Cloudflare SSL/TLS mode to 'Full (strict)' for end-to-end encryption.

    Obtain from: Cloudflare Dashboard → SSL/TLS → Origin Server → Create Certificate

    SSL-1: Writes to the SAME canonical Nginx paths as Let's Encrypt and custom certs.
    SSL-2: PEM structure validated before writing.
    """
    # SSL-2: Validate PEM structure and parse expiry
    cert_expires_at = _validate_and_parse_pem(cert_data.fullchain_pem, cert_data.privkey_pem)

    # SSL-1: Write to unified canonical paths
    _write_cert_to_nginx(cert_data.fullchain_pem, cert_data.privkey_pem)

    settings = get_or_create_settings(db)
    settings.ssl_mode = "cloudflare"
    settings.ssl_provider = "cloudflare"
    settings.custom_cert_path = NGINX_CERT_PATH
    settings.custom_key_path = NGINX_KEY_PATH
    settings.cert_expires_at = cert_expires_at
    settings.ssl_status = "active"
    settings.ssl_error_message = None
    settings.last_renewed_at = datetime.now(timezone.utc)
    db.add(settings)
    db.commit()

    nginx_status = _reload_nginx()

    return {
        "message": "Cloudflare Origin Certificate uploaded and activated successfully.",
        "ssl_mode": "cloudflare",
        "ssl_provider": "cloudflare",
        "cert_path": NGINX_CERT_PATH,
        "cert_expires_at": cert_expires_at.isoformat() if cert_expires_at else None,
        "nginx_status": nginx_status,
        "status": "active",
        "note": (
            "Ensure Cloudflare SSL/TLS mode is set to 'Full (strict)' in your "
            "Cloudflare dashboard for end-to-end encryption."
        ),
    }


@router.post("/settings/ssl/letsencrypt")
def register_letsencrypt_ssl(
    req: LetsEncryptRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> Any:
    """
    Trigger Let's Encrypt ACME registration and issue SSL certificate.

    CVE-2: Domain/email strictly validated before subprocess execution.
    SSL-1: Certbot output is copied to the canonical Nginx paths.
    """
    # CVE-2: Validate domain and email with strict regex BEFORE any DB write or subprocess
    domain = req.domain_name.strip().lower()
    admin_email = req.admin_email.strip().lower()

    if not _DOMAIN_RE.match(domain):
        raise HTTPException(
            status_code=400,
            detail="Invalid domain name. Only alphanumeric characters, hyphens, and dots are allowed.",
        )
    if not _EMAIL_RE.match(admin_email):
        raise HTTPException(
            status_code=400,
            detail="Invalid admin email address.",
        )

    settings = get_or_create_settings(db)
    settings.domain_name = domain
    settings.admin_email = admin_email
    settings.ssl_mode = "letsencrypt"
    settings.ssl_provider = "letsencrypt"
    settings.ssl_status = "pending"
    db.add(settings)
    db.commit()

    script_path = os.path.join(os.getcwd(), "infra", "scripts", "setup_letsencrypt.sh")

    nginx_status = "nginx_reload_skipped"
    try:
        if os.path.exists(script_path):
            # CVE-2: Pass as list args; shell=False is explicit
            result = subprocess.run(
                ["bash", script_path, domain, admin_email],
                capture_output=True,
                text=True,
                timeout=120,
                shell=False,
            )
            if result.returncode == 0:
                settings.ssl_status = "active"
                settings.ssl_error_message = None
                settings.last_renewed_at = datetime.now(timezone.utc)
                # The script copies to NGINX_CERT_PATH already — just reload
                nginx_status = _reload_nginx()
            else:
                settings.ssl_status = "error"
                # Never expose raw stderr to client — log it server-side
                print(f"[ERROR] Certbot failed for {domain}: {result.stderr}")
                settings.ssl_error_message = "Certbot registration failed. Check server logs."
        else:
            # Dev environment — script not present
            settings.ssl_status = "pending"
            settings.ssl_error_message = "Setup script not found on this host — deploy to production first."
    except subprocess.TimeoutExpired:
        settings.ssl_status = "error"
        settings.ssl_error_message = "Certbot timed out after 120 seconds."
    except Exception as exc:
        settings.ssl_status = "error"
        settings.ssl_error_message = f"ACME registration error: {type(exc).__name__}"

    db.add(settings)
    db.commit()

    return {
        "message": f"Let's Encrypt ACME registration initiated for domain '{domain}'.",
        "domain_name": domain,
        "ssl_mode": "letsencrypt",
        "ssl_provider": "letsencrypt",
        "nginx_status": nginx_status,
        "status": settings.ssl_status,
    }
