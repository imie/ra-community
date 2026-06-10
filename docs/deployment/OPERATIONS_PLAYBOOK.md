# Deployment & Operations Playbook

**Purpose:** Step-by-step procedures for deploying, monitoring, and operating the RA Community Management System in production.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Initial Deployment](#initial-deployment)
3. [Service Management](#service-management)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Backup & Recovery](#backup--recovery)
6. [Troubleshooting](#troubleshooting)
7. [Scaling Operations](#scaling-operations)

---

## Pre-Deployment Checklist

### Infrastructure Preparation

- [ ] **Server Setup**
  - [ ] Ubuntu 20.04 LTS or newer installed
  - [ ] Minimum 8GB RAM, 50GB SSD available
  - [ ] Network connectivity tested (ping 8.8.8.8)
  - [ ] DNS records configured (A record for domain)
  - [ ] SSH access configured (port 22, key-based auth)

- [ ] **System Security**
  - [ ] Firewall enabled (UFW)
    ```bash
    sudo ufw enable
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow 22/tcp   # SSH
    sudo ufw allow 80/tcp   # HTTP
    sudo ufw allow 443/tcp  # HTTPS
    ```
  - [ ] SSH hardened (PermitRootLogin: no)
  - [ ] Automatic security updates enabled
  - [ ] Fail2Ban configured for intrusion detection

- [ ] **Docker Environment**
  - [ ] Docker 20.10+ installed
    ```bash
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    ```
  - [ ] Docker Compose 2.0+ installed
    ```bash
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    ```
  - [ ] Docker daemon set to restart always
    ```bash
    sudo systemctl enable docker
    ```

- [ ] **SSL Certificates**
  - [ ] Obtain certificates (Let's Encrypt recommended)
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot certonly --standalone -d yourdomain.com
    ```
  - [ ] Certificates placed in `infra/nginx/ssl/`
  - [ ] Private key secured (chmod 600)
  - [ ] Auto-renewal configured (certbot renewal cron)

### Credentials & Configuration

- [ ] **Environment Variables**
  - [ ] Create `.env` file in project root
    ```bash
    # Database
    DB_PASSWORD=<strong-random-password>
    POSTGRES_PASSWORD=${DB_PASSWORD}
    
    # JWT
    JWT_SECRET=<strong-random-secret-32-chars>
    JWT_ALGORITHM=HS256
    
    # Redis
    REDIS_PASSWORD=<strong-random-password>
    
    # OAuth Providers
    OAUTH_GOOGLE_ID=<from-google-cloud-console>
    OAUTH_GOOGLE_SECRET=<from-google-cloud-console>
    OAUTH_MICROSOFT_ID=<from-azure>
    OAUTH_MICROSOFT_SECRET=<from-azure>
    OAUTH_APPLE_ID=<from-apple-developer>
    OAUTH_APPLE_SECRET=<from-apple-developer>
    
    # Email Service
    SMTP_HOST=smtp.sendgrid.net
    SMTP_PORT=587
    SMTP_USER=apikey
    SMTP_PASSWORD=<sendgrid-api-key>
    
    # Application
    ENVIRONMENT=production
    DEBUG=False
    NEXTAUTH_SECRET=<strong-random-secret>
    NEXTAUTH_URL=https://yourdomain.com
    ```
  - [ ] `.env` added to `.gitignore` (never commit secrets)
  - [ ] Backup `.env` to secure location (password manager)

- [ ] **OAuth Configuration**
  - [ ] Google OAuth credentials created in Google Cloud Console
    - Create project
    - Enable Google+ API
    - Create OAuth 2.0 credentials (authorized redirect URIs: https://yourdomain.com/api/auth/oauth/google/callback)
    - Store Client ID and Secret
  
  - [ ] Microsoft OAuth credentials created in Azure
    - Register app in Azure AD
    - Create app secret
    - Configure redirect URI: https://yourdomain.com/api/auth/oauth/microsoft/callback
    - Store Client ID and Secret
  
  - [ ] Apple OAuth configuration (if supporting iOS/macOS)
    - Create Sign in with Apple identifier
    - Configure redirect URIs
    - Store Team ID, Bundle ID, Key ID

- [ ] **Email Service**
  - [ ] SendGrid or Postmark account created
  - [ ] API key generated
  - [ ] Sender email verified
  - [ ] Email templates configured

### Code Preparation

- [ ] **Repository**
  - [ ] Code cloned to `/home/ra-app/ra-community`
  - [ ] Branch set to production release tag
  - [ ] `.env` file placed in root directory
  - [ ] File permissions correct (owned by ra-app user)

- [ ] **Database Migrations**
  - [ ] Latest migration scripts reviewed
  - [ ] Rollback scripts tested locally
  - [ ] Migration order documented

---

## Initial Deployment

### Step 1: Clone & Configure

```bash
# As ra-app user (created if needed)
sudo useradd -m -s /bin/bash ra-app
sudo usermod -aG docker ra-app

# Clone repository
cd /home/ra-app
git clone https://github.com/your-org/ra-community.git
cd ra-community

# Create environment file
cp .env.example .env
# Edit .env with production values (see Pre-Deployment Checklist)
nano .env

# Set permissions
sudo chown -R ra-app:ra-app /home/ra-app/ra-community
```

### Step 2: Build & Start Services

```bash
# Build Docker images (5-10 minutes)
docker-compose build

# Start services in background
docker-compose up -d

# Verify services started
docker-compose ps
```

Expected output:
```
NAME                COMMAND                  SERVICE      STATUS      PORTS
ra-postgres         "docker-entrypoint.s…"   postgres     Up 2 min    5432/tcp
ra-redis            "redis-server --appe…"   redis        Up 2 min    6379/tcp
ra-backend          "python -m uvicorn a…"   backend      Up 1 min    8000/tcp
ra-nginx            "nginx -g daemon off…"   nginx        Up 1 min    0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
ra-web              "npm start"              web          Up 1 min    3000/tcp
```

### Step 3: Database Setup

```bash
# Run database migrations
docker-compose exec backend python -m alembic upgrade head

# Verify migration status
docker-compose exec backend alembic current

# Seed initial data (if needed)
docker-compose exec backend python -c "from app.db import seed; seed()"
```

### Step 4: Verification

```bash
# Check API health
curl http://localhost:8000/health
# Expected: {"status":"healthy","timestamp":"2026-06-10T10:30:00Z"}

# Check web app
curl http://localhost/
# Expected: HTML response from Next.js

# Check logs for errors
docker-compose logs -f
# Should show no ERROR level logs
```

### Step 5: SSL Configuration

```bash
# Update nginx.conf with certificate paths
sudo nano infra/nginx/nginx.conf
# Ensure ssl_certificate and ssl_certificate_key point to Let's Encrypt certs

# Restart Nginx
docker-compose restart nginx

# Verify SSL
curl -I https://yourdomain.com
# Expected: HTTP/2 200
```

### Step 6: Create Systemd Service

```bash
# Create service file to auto-start on reboot
sudo tee /etc/systemd/system/ra-community.service > /dev/null <<EOF
[Unit]
Description=RA Community Management System
After=network.target docker.service
Requires=docker.service

[Service]
Type=forking
User=ra-app
WorkingDirectory=/home/ra-app/ra-community
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
Restart=always
RestartSec=10s

[Install]
WantedBy=multi-user.target
EOF

# Enable service
sudo systemctl daemon-reload
sudo systemctl enable ra-community.service
sudo systemctl start ra-community.service

# Verify
sudo systemctl status ra-community.service
```

---

## Service Management

### Start Services

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend

# Follow logs
docker-compose logs -f
```

### Stop Services

```bash
# Gracefully stop (drain connections first)
docker-compose stop

# Force stop (kill)
docker-compose kill

# Full cleanup (removes containers)
docker-compose down
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend

# Restart with service rebuild
docker-compose up -d --force-recreate backend
```

### View Logs

```bash
# All services
docker-compose logs

# Specific service with follow
docker-compose logs -f backend

# Show last 100 lines
docker-compose logs --tail=100 backend

# Since timestamp
docker-compose logs --since 2024-01-15T10:00:00 backend
```

### Check Service Health

```bash
# List all services and status
docker-compose ps

# Check database connection
docker-compose exec backend python -c "from app.db import SessionLocal; db = SessionLocal(); print('DB OK')"

# Check Redis connection
docker-compose exec backend python -c "import redis; r = redis.Redis(host='redis'); r.ping(); print('Redis OK')"

# Check API status
curl -s http://localhost:8000/health/detailed | python -m json.tool
```

### Update Services

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker-compose build

# Restart services with new images
docker-compose up -d

# Verify update applied
docker-compose logs backend | grep "Starting server"
```

---

## Monitoring & Alerts

### Health Check Endpoints

```bash
# Lightweight check (< 50ms)
curl http://localhost:8000/health

# Detailed check (~ 200ms)
curl http://localhost:8000/health/detailed

# Database check
curl http://localhost:8000/health/db

# Redis check
curl http://localhost:8000/health/redis
```

### Log Monitoring

```bash
# Monitor for errors in real-time
docker-compose logs -f | grep -E "ERROR|WARNING"

# Check authentication failures
docker-compose logs backend | grep "authentication failed"

# Check rate limit violations
docker-compose logs nginx | grep "429"

# Check slow queries (> 1 second)
docker-compose logs postgres | grep "duration:"
```

### System Metrics

```bash
# CPU and memory usage
docker stats

# Disk usage
df -h

# Docker image sizes
docker images

# Container resource limits
docker inspect ra-backend | grep -E "Memory|CpuShares"
```

### Set Up Prometheus Monitoring

```yaml
# infra/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'fastapi'
    static_configs:
      - targets: ['localhost:8000']

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
```

```bash
# Start Prometheus (add to docker-compose.yml)
docker run -d \
  -p 9090:9090 \
  -v /path/to/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

### Set Up Log Aggregation

```yaml
# infra/loki/loki-config.yml
auth_enabled: false

ingester:
  chunk_idle_period: 3m
  max_chunk_age: 1h

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
```

### Manual Alerting

```bash
# Check for warnings in last 30 minutes
docker-compose logs --since 30m backend | grep -i warning | wc -l

# Monitor for specific error patterns
watch -n 5 'docker-compose logs backend | tail -20'

# Set up email alert on critical errors
# Add to crontab:
# */5 * * * * docker-compose logs --since 5m backend | grep -i critical | mail -s "RA Alert" admin@example.com
```

---

## Backup & Recovery

### Automated Daily Backup

```bash
#!/bin/bash
# /home/ra-app/backup.sh

BACKUP_DIR="/backup/ra-community"
DATE=$(date +%Y%m%d_%H%M%S)
POSTGRES_BACKUP="$BACKUP_DIR/postgres_$DATE.sql.gz"
REDIS_BACKUP="$BACKUP_DIR/redis_$DATE.rdb"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
echo "Backing up PostgreSQL..."
docker-compose exec -T postgres pg_dump -U ra_user ra_community | gzip > "$POSTGRES_BACKUP"

# Backup Redis
echo "Backing up Redis..."
docker-compose exec -T redis redis-cli --rdb "$REDIS_BACKUP"

# Encrypt backups
echo "Encrypting backups..."
openssl enc -aes-256-cbc -salt -in "$POSTGRES_BACKUP" -out "$POSTGRES_BACKUP.enc"
rm "$POSTGRES_BACKUP"

# Upload to cloud storage
echo "Uploading to cloud..."
aws s3 cp "$BACKUP_DIR" s3://ra-backups/ --recursive

# Clean old backups (> 30 days)
find "$BACKUP_DIR" -mtime +30 -delete

echo "Backup complete!"
```

```bash
# Add to crontab for daily 1 AM backup
crontab -e
# Add: 0 1 * * * /home/ra-app/backup.sh >> /var/log/ra-backup.log 2>&1
```

### Point-in-Time Recovery (PITR)

```bash
# Restore from backup
docker-compose down

# Restore PostgreSQL
gunzip -c /backup/ra-community/postgres_20240115_010000.sql.gz | \
  docker-compose exec -T postgres psql -U ra_user -d ra_community

# Restore Redis (if needed)
docker-compose exec -T redis redis-cli --rdb /data/dump.rdb

# Start services
docker-compose up -d

# Verify restored data
curl http://localhost:8000/health
```

### Incremental Backups

```bash
# For PostgreSQL, use WAL archiving
# In postgresql.conf:
# wal_level = replica
# archive_mode = on
# archive_command = 'test ! -f /path/to/archive/%f && cp %p /path/to/archive/%f'

# List recent backups
ls -lh /backup/ra-community/ | head -10
```

---

## Troubleshooting

### Services Not Starting

```bash
# Check Docker daemon
sudo systemctl status docker

# Check service logs
docker-compose logs postgres
docker-compose logs backend

# Common causes:
# 1. Port already in use
sudo lsof -i :8000

# 2. Insufficient disk space
df -h

# 3. Permission issues
ls -la /data/
```

### Database Connection Errors

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U ra_user -d ra_community -c "SELECT 1"

# Check connection pool
docker-compose exec backend python -c "from app.db import get_pool; print(get_pool().size())"

# Increase pool size if needed (in docker-compose.yml)
# DATABASE_URL=postgresql://...?pool_size=20
```

### High API Response Times

```bash
# Check CPU usage
docker stats ra-backend

# Check slow queries
docker-compose logs postgres | grep "duration: [5-9][0-9][0-9]ms\|duration: [0-9][0-9][0-9][0-9]ms"

# Review database indexes
docker-compose exec postgres psql -U ra_user -d ra_community -c "SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0"

# Check cache hit rate
docker-compose exec redis redis-cli info stats | grep "keyspace_hits"
```

### High Memory Usage

```bash
# Check container memory limits
docker inspect ra-backend | grep Memory

# Monitor memory growth
watch -n 1 'docker stats --no-stream ra-backend'

# Check for memory leaks in FastAPI
# Add to main.py:
# @app.get("/debug/memory")
# async def memory_usage():
#     import tracemalloc
#     tracemalloc.start()
#     current, peak = tracemalloc.get_traced_memory()
#     return {"current_mb": current / 1024 / 1024, "peak_mb": peak / 1024 / 1024}

# Increase memory limit
# In docker-compose.yml:
# services:
#   backend:
#     mem_limit: 2g
```

### SSL Certificate Issues

```bash
# Check certificate expiration
openssl x509 -enddate -noout -in /etc/letsencrypt/live/yourdomain.com/cert.pem

# Renew certificate
sudo certbot renew

# Verify certificate
curl -vI https://yourdomain.com

# Check HSTS header
curl -I https://yourdomain.com | grep Strict-Transport-Security
```

### OAuth Integration Issues

```bash
# Test Google OAuth
curl -X POST http://localhost:8000/api/auth/oauth/google \
  -H "Content-Type: application/json" \
  -d '{"token": "test_token"}'

# Check OAuth logs
docker-compose logs backend | grep -i oauth

# Verify redirect URIs in OAuth provider console:
# - Google: https://yourdomain.com/api/auth/oauth/google/callback
# - Microsoft: https://yourdomain.com/api/auth/oauth/microsoft/callback
```

---

## Scaling Operations

### Horizontal Scaling (Multiple API Instances)

```yaml
# Update docker-compose.yml to run multiple backend instances
services:
  backend1:
    build: ./apps/backend
    # ...
    ports:
      - "8001:8000"
    
  backend2:
    build: ./apps/backend
    # ...
    ports:
      - "8002:8000"
    
  backend3:
    build: ./apps/backend
    # ...
    ports:
      - "8003:8000"
```

```nginx
# Update nginx.conf for load balancing
upstream backend {
    least_conn;
    server backend1:8000;
    server backend2:8000;
    server backend3:8000;
}

server {
    listen 443 ssl http2;
    
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Database Replication (Read Replicas)

```bash
# Create read replica
docker-compose exec postgres pg_basebackup -D /data/replica -Ft -z -X stream -U ra_user

# Configure replica in docker-compose.yml
postgres-replica:
  image: postgres:14-alpine
  environment:
    PGUSER: ra_user
  volumes:
    - /data/replica:/var/lib/postgresql/data
  command: >
    -c hot_standby=on
    -c primary_conninfo='host=postgres port=5432 user=ra_user'
```

### Redis Clustering

```bash
# Create Redis cluster with 3 nodes
docker-compose up -d redis-cluster-1 redis-cluster-2 redis-cluster-3

# Initialize cluster
docker-compose exec redis-cluster-1 redis-cli --cluster create \
  redis-cluster-1:6379 \
  redis-cluster-2:6379 \
  redis-cluster-3:6379 \
  --cluster-replicas 1
```

### Performance Optimization Checklist

- [ ] Database query times < 100ms (check slow query log)
- [ ] Cache hit rate > 80% (check Redis stats)
- [ ] API response times p95 < 200ms (check Prometheus)
- [ ] No N+1 queries (review ORM usage)
- [ ] Connection pooling configured (pgBouncer)
- [ ] CDN configured for static assets (optional)
- [ ] API rate limiting tuned for expected load

---

**Last Updated:** 2026-06-10  
**Maintainer:** Operations Team
