# Deployment Guide - RA Community Management System

## Production Environment Setup

### Prerequisites

- VPS or On-Premises Server (Ubuntu 20.04 LTS or later recommended)
- Docker 20.10+ and Docker Compose 2.0+
- SSL/TLS certificates (Let's Encrypt or commercial)
- Domain name
- SMTP credentials (for email notifications)

### Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│               Internet Users                     │
│         (Web Browsers, Mobile Apps)              │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS/TLS
┌──────────────────▼──────────────────────────────┐
│        Nginx Reverse Proxy                       │
│     (SSL Termination, Rate Limiting)            │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌────────▼────────┐
│  Next.js Web   │   │  FastAPI        │
│  Container     │   │  Backend        │
│  (Port 3000)   │   │  (Port 8000)    │
└────────────────┘   └────────┬────────┘
                              │
                   ┌──────────┴──────────┐
                   │                     │
            ┌──────▼─────────┐   ┌──────▼─────────┐
            │   PostgreSQL   │   │     Redis      │
            │  Database      │   │     Cache      │
            │  (Port 5432)   │   │  (Port 6379)   │
            └────────────────┘   └────────────────┘
```

### Step 1: Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create app directory
sudo mkdir -p /opt/ra-community
cd /opt/ra-community

# Clone repository
sudo git clone <repository-url> .
```

### Step 2: SSL/TLS Configuration

#### Option A: Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

#### Option B: Commercial Certificates

1. Obtain certificate files:
   - `cert.pem` (certificate)
   - `private.key` (private key)

2. Place in `infra/nginx/ssl/`:
   ```bash
   sudo mkdir -p /opt/ra-community/infra/nginx/ssl
   sudo cp cert.pem /opt/ra-community/infra/nginx/ssl/
   sudo cp private.key /opt/ra-community/infra/nginx/ssl/
   ```

### Step 3: Environment Configuration

```bash
# Copy and edit environment file
sudo cp .env.example .env
sudo nano .env
```

**Critical Production Settings:**

```env
# Security
BACKEND_ENV=production
BACKEND_DEBUG=False
SECRET_KEY=<generate-strong-64-char-random-string>
JWT_SECRET=<generate-strong-64-char-random-string>

# Database
DATABASE_URL=postgresql://ra_user:<strong-password>@postgres:5432/ra_db
POSTGRES_PASSWORD=<strong-password>

# Email
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=<app-specific-password>
SMTP_FROM_EMAIL=noreply@your-domain.com

# Domain
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# OAuth (Optional)
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<secret>
MICROSOFT_CLIENT_ID=<from-azure>
MICROSOFT_CLIENT_SECRET=<secret>
```

### Step 4: Update Nginx Configuration

Edit `infra/nginx/nginx.conf` with production settings:

```nginx
upstream backend {
    server backend:8000;
}

upstream web {
    server web:3000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL certificates
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/private.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    
    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    client_max_body_size 10M;
    
    # Backend API
    location /api/ {
        proxy_pass http://backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Web frontend
    location / {
        proxy_pass http://web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### Step 5: Update docker-compose.yml for Production

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:14-alpine
    restart: always
    environment:
      POSTGRES_USER: ra_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ra_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - ra-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ra_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD:-redis_password}
    volumes:
      - redis_data:/data
    networks:
      - ra-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: ra-community-backend:latest
    restart: always
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - BACKEND_ENV=production
      - BACKEND_DEBUG=False
      - SECRET_KEY=${SECRET_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - ALLOWED_HOSTS=${ALLOWED_HOSTS}
      - CORS_ORIGINS=${CORS_ORIGINS}
      - SMTP_SERVER=${SMTP_SERVER}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USERNAME=${SMTP_USERNAME}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - ra-network
    command: >
      sh -c "alembic upgrade head &&
             gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  web:
    image: ra-community-web:latest
    restart: always
    environment:
      - NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
      - NEXT_PUBLIC_APP_NAME=RA Community Management
    depends_on:
      - backend
    networks:
      - ra-network

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./infra/nginx/conf.d:/etc/nginx/conf.d:ro
      - ./infra/nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - web
    networks:
      - ra-network

networks:
  ra-network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
```

### Step 6: Build and Deploy

```bash
# Build Docker images
docker-compose build

# Run database migrations
docker-compose run --rm backend alembic upgrade head

# Start services
docker-compose up -d

# Verify services are running
docker-compose ps

# Check logs
docker-compose logs -f
```

### Step 7: Backup Strategy

#### Automated PostgreSQL Backups

```bash
# Create backup directory
mkdir -p /opt/backups/postgres

# Create backup script
cat > /opt/backups/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/postgres"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
docker-compose exec -T postgres pg_dump -U ra_user ra_db | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz
# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /opt/backups/backup.sh

# Schedule with cron (daily at 2 AM)
0 2 * * * /opt/backups/backup.sh
```

### Step 8: Monitoring & Maintenance

#### Health Checks

```bash
# Check backend health
curl -s https://your-domain.com/api/health | jq

# Check database
docker-compose exec postgres psql -U ra_user ra_db -c "SELECT 1;"

# Check Redis
docker-compose exec redis redis-cli ping
```

#### Log Management

```bash
# View logs
docker-compose logs --tail=100 backend

# Clear old logs (optional)
docker system prune --force
```

#### Security Updates

```bash
# Update images
docker-compose pull
docker-compose up -d

# Remove unused images
docker image prune -f
```

### Step 9: Troubleshooting

#### Service won't start

```bash
# Check logs
docker-compose logs <service-name>

# Restart service
docker-compose restart <service-name>

# Full restart
docker-compose down
docker-compose up -d
```

#### Database connection issues

```bash
# Test connection
docker-compose exec backend python -c "import sqlalchemy; print('OK')"

# Check database logs
docker-compose logs postgres
```

#### Out of disk space

```bash
# Check space
df -h

# Clean up Docker
docker system prune -a --volumes

# Remove old backups
find /opt/backups/postgres -mtime +60 -delete
```

## Performance Tuning

### PostgreSQL

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- Add indices for frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_ic_number ON users(ic_number);
```

### Redis Cache

- Configure appropriate TTLs
- Monitor memory usage: `redis-cli INFO memory`
- Enable persistence in production

### Nginx

- Gzip compression enabled by default
- Buffer sizes optimized for mobile/web
- Consider adding caching headers for static assets

## Security Hardening

### Additional Measures

1. **Firewall Configuration**
   ```bash
   sudo ufw allow 22/tcp      # SSH
   sudo ufw allow 80/tcp      # HTTP
   sudo ufw allow 443/tcp     # HTTPS
   sudo ufw enable
   ```

2. **Fail2Ban Installation** (protects against brute force)
   ```bash
   sudo apt install fail2ban -y
   sudo systemctl start fail2ban
   ```

3. **Regular Security Updates**
   ```bash
   sudo unattended-upgrade  # Enable automatic updates
   ```

4. **Database User Privileges**
   - Limit to minimum required permissions
   - Use separate read-only user for reports

## Monitoring Setup (Optional)

### Prometheus + Grafana

See `docs/monitoring/MONITORING.md` for detailed setup.

## Rollback Procedure

```bash
# If deployment fails, revert to previous images
docker-compose down
git checkout main
docker-compose build
docker-compose up -d
```

## Support & Escalation

For issues not covered here, contact DevOps team or open an issue on GitHub.
