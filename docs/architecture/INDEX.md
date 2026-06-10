# System Architecture Index & Quick Reference

**RA Community Management System - Complete Architecture Documentation**

---

## 📑 Architecture Documentation Structure

### Core Architecture Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Complete system design with all components, data flows, and security | Architects, Tech Leads |
| [DIAGRAMS_REFERENCE.md](./DIAGRAMS_REFERENCE.md) | Supplementary Mermaid diagrams and visual flows | All stakeholders |
| [SCALABILITY_GUIDE.md](./SCALABILITY_GUIDE.md) | Capacity planning, optimization, and scaling strategies | DevOps, Backend Engineers |
| [OPERATIONS_PLAYBOOK.md](../deployment/OPERATIONS_PLAYBOOK.md) | Deployment, monitoring, and operational procedures | DevOps Engineers, Operators |

---

## 🏗️ System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│          Web (Next.js) │ Mobile (React Native)              │
└────────────────────┬──────────────────────────────────────────┘
                     │ HTTPS/TLS
┌────────────────────▼──────────────────────────────────────────┐
│              Nginx Reverse Proxy                              │
│    SSL/TLS • Rate Limiting • CORS • Security Headers         │
└────────────────────┬──────────────────────────────────────────┘
                     │ HTTP (Internal Network)
┌────────────────────▼──────────────────────────────────────────┐
│              FastAPI Backend (Stateless)                      │
│    Authentication • Validation • Business Logic              │
└────────────────────┬──────────────────────────────────────────┘
          ┌──────────┴──────────┐
          │                     │
┌─────────▼────────┐   ┌────────▼────────┐
│  PostgreSQL DB   │   │  Redis Cache    │
│  (Persistent)    │   │  (Session/Cache)│
└──────────────────┘   └─────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Clients** | Next.js 14, React Native, Expo | Web & mobile frontends |
| **API Gateway** | Nginx 1.24+ | SSL termination, rate limiting, routing |
| **Backend** | FastAPI, Python 3.11+, Uvicorn | RESTful API, business logic |
| **Database** | PostgreSQL 14+ | Persistent data, ACID transactions |
| **Cache** | Redis 7+ | Session store, rate limit tracking |
| **Auth** | JWT (HS256/RS256), Argon2, OAuth 2.0 | Secure authentication |
| **Deployment** | Docker, Docker Compose | Containerized on-premises |

---

## 🔐 Security Architecture

### Security Layers

**Layer 1: Network (Nginx)**
- TLS 1.2+ with strong ciphers
- HSTS header for all responses
- Rate limiting (100 req/min per IP)
- CORS policy with whitelist
- Security headers (CSP, X-Frame-Options, etc.)

**Layer 2: Application (FastAPI)**
- JWT token validation on every protected endpoint
- Input validation with Pydantic schemas
- Rate limiting per user (1000 req/hour)
- Token blacklist check (Redis)
- CSRF protection via SameSite cookies

**Layer 3: Data (SQLAlchemy ORM)**
- SQL injection prevention via parameterized queries
- No string concatenation in SQL
- Input sanitization before storage
- Audit logging for sensitive operations

**Layer 4: Password Management**
- Argon2id hashing (12 rounds)
- Secure password comparison (time-constant)
- Brute-force protection (5 failed attempts → lockout)
- Password reset tokens (15 min expiry, single-use)

### Authentication Flow

```
User Login
    ↓
Validate Credentials
    ↓
Generate JWT Access Token (24h) + Refresh Token (7d)
    ↓
Store Refresh Token in Redis
    ↓
Return Tokens to Client
    ↓
Client Stores in Secure Storage
    ↓
On Protected Requests:
    - Extract JWT from Authorization header
    - Verify signature (RS256)
    - Check expiration
    - Check Redis blacklist
    - Load user from cache or DB
    - Proceed if all checks pass
```

### Token Lifecycle

- **Access Token**: 24-hour expiry, short-lived, used for API requests
- **Refresh Token**: 7-day expiry, long-lived, used to get new access tokens
- **Token Rotation**: New refresh token issued on refresh (old one invalidated)
- **Logout**: Both tokens added to Redis blacklist (7-day TTL)
- **Password Reset**: All refresh tokens invalidated, user must re-login

---

## 📊 Data Flow Diagrams

### 1. Registration Flow
→ See: [DIAGRAMS_REFERENCE.md - User Registration Flow](./DIAGRAMS_REFERENCE.md)

**Key Steps:**
1. Client validates form input (Zod)
2. POST /api/auth/register with email & password
3. Backend validates, checks email uniqueness
4. Hash password with Argon2
5. Create user in PostgreSQL (is_verified=false)
6. Store verification token in Redis (30 min expiry)
7. Send verification email via SendGrid
8. User clicks link, email verified, can now login

### 2. OAuth Authentication Flow
→ See: [DIAGRAMS_REFERENCE.md - OAuth Flow](./DIAGRAMS_REFERENCE.md)

**Key Steps:**
1. User clicks "Login with Google/Microsoft/Apple"
2. Redirect to OAuth provider
3. Provider redirects back with authorization code
4. Exchange code for ID token with provider
5. Verify token signature with provider's public key
6. Extract user info (email, name, provider ID)
7. Check if user exists (by OAuth ID or email)
8. Create new user if first-time login
9. Generate and return JWT + refresh token

### 3. Password Reset Flow
→ See: [DIAGRAMS_REFERENCE.md - Password Reset Flow](./DIAGRAMS_REFERENCE.md)

**Key Steps:**
1. User enters email on forgot password form
2. POST /api/auth/forgot-password
3. Find user by email (don't leak user existence)
4. Generate secure reset token
5. Store hashed token in DB with 15-min expiry
6. Send reset link via email
7. User clicks link, redirected to reset form
8. User enters new password (strength checked)
9. Verify reset token, update password hash
10. Invalidate all refresh tokens (force re-login)
11. Send confirmation email

### 4. Profile Update Flow
→ See: [DIAGRAMS_REFERENCE.md - Profile Update Flow](./DIAGRAMS_REFERENCE.md)

**Key Steps:**
1. User navigates to profile page
2. GET /api/users/me with JWT
3. Load user from cache (5 min) or DB
4. Display form with current data
5. User modifies IC number, DOB, address, etc.
6. POST /api/users/me with updated data
7. Validate IC number (format, uniqueness)
8. Validate other fields (DOB, address, etc.)
9. Update user record in PostgreSQL
10. Clear user cache
11. Log change in audit_logs table
12. Return updated data

---

## 🚀 Deployment Architecture

### On-Premises Deployment (Docker Compose)

```yaml
Server (Ubuntu 20.04+)
├── Nginx Container (Port 80, 443)
│   └── SSL/TLS Certificates
├── FastAPI Container (Port 8000)
│   └── Connection Pool: pgBouncer
├── PostgreSQL Container (Port 5432)
│   └── Data Volume: /data/postgres
├── Redis Container (Port 6379)
│   └── Data Volume: /data/redis
└── Next.js Container (Port 3000)
    └── Static files
```

### Container Health Checks

| Service | Check Endpoint | Interval | Timeout |
|---------|---|---|---|
| Nginx | GET /health | 30s | 10s |
| FastAPI | GET /health | 30s | 10s |
| PostgreSQL | `pg_isready` | 10s | 5s |
| Redis | PING | 10s | 5s |

### Service Dependencies

```
1. PostgreSQL starts first (5s startup)
2. Redis starts (1s startup)
3. FastAPI waits for DB & Redis, runs migrations (10s)
4. Nginx routes to backend (2s)
5. Next.js builds static assets (15s)
6. System ready: ~25-30 seconds total
```

### Backup Strategy

- **Daily**: Full PostgreSQL backup at 1 AM UTC (encrypted, uploaded to cloud)
- **Weekly**: Full system snapshot on Sunday 2 AM UTC (config, certs, configs)
- **Retention**: 30 days daily, 1 year weekly backups
- **Recovery**: Point-in-time restore within 30 days

---

## 📈 Scalability Strategy

### Capacity by Phase

| Phase | Timeline | Residents | Concurrent Users | Infrastructure |
|-------|----------|-----------|------------------|-----------------|
| **Phase 1** | Months 0-6 | 500-2,000 | 100-400 | 1x Server |
| **Phase 2** | Months 6-12 | 2,000-5,000 | 400-1,000 | 3x API + 1 Replica |
| **Phase 3** | Months 12-24 | 5,000-10,000 | 1,000-2,000 | 5x API + HA |
| **Phase 4** | Months 24+ | 10,000+ | 2,000+ | Kubernetes |

### Optimization Priorities

1. **Query Optimization** (Quick wins)
   - Add indexes on frequently filtered columns
   - Remove N+1 queries with eager loading
   - Implement pagination for list endpoints

2. **Caching** (High ROI)
   - Cache hot data in Redis (80% of requests)
   - Implement proper invalidation strategy
   - Target > 80% cache hit rate

3. **Connection Pooling** (Essential)
   - pgBouncer for PostgreSQL
   - Max 20-50 concurrent connections from app
   - Recycle connections every 1 hour

4. **Database Replication** (When scaling reads)
   - Read-only replica for SELECT queries
   - Write operations still go to primary
   - Route API requests accordingly

5. **Horizontal Scaling** (Final option)
   - Add FastAPI instances behind load balancer
   - Nginx round-robin or least-conn
   - Stateless architecture enables this

### Performance Targets

| Metric | Target | Monitoring |
|--------|--------|-----------|
| API Response Time (p50) | < 100ms | Prometheus |
| API Response Time (p95) | < 200ms | Prometheus |
| API Response Time (p99) | < 500ms | Prometheus |
| Database Query Time (p95) | < 50ms | PostgreSQL logs |
| Cache Hit Rate | > 80% | Redis stats |
| Error Rate | < 0.1% | Application logs |
| API Availability | > 99.9% | Uptime monitoring |

---

## 🛠️ Operational Procedures

### Deployment Checklist

```bash
# Pre-deployment (see OPERATIONS_PLAYBOOK.md)
□ Server setup (Ubuntu 20.04+, 8GB RAM, 50GB SSD)
□ Docker & Docker Compose installed
□ SSL certificates obtained (Let's Encrypt)
□ Environment variables configured (.env)
□ OAuth credentials collected
□ Email service configured (SendGrid)

# Deployment steps
□ Clone repository
□ Update .env with secrets
□ docker-compose build
□ docker-compose up -d
□ Run database migrations (alembic upgrade head)
□ Verify health checks
□ Test API endpoints
□ Test web app HTTPS
□ Check logs for errors
□ Configure monitoring (Prometheus, Grafana)
□ Set up automated backups

# Post-deployment
□ Document passwords in secure location
□ Brief team on operations runbook
□ Schedule weekly monitoring review
□ Test backup restoration procedure
```

### Common Operations

```bash
# View all services
docker-compose ps

# Check logs
docker-compose logs -f backend

# Restart service
docker-compose restart backend

# View database status
docker-compose exec postgres psql -U ra_user -d ra_community -c "SELECT version();"

# Check cache
docker-compose exec redis redis-cli INFO stats

# Monitor in real-time
docker stats
```

### Troubleshooting

| Issue | Check | Solution |
|-------|-------|----------|
| Services not starting | `docker-compose logs postgres backend` | Check disk space, permissions |
| High API latency | `EXPLAIN ANALYZE` on slow queries | Add indexes, implement caching |
| Database connection errors | `docker-compose exec backend python -c "from app.db import get_db"` | Verify connection string, pool size |
| Cache not working | `docker-compose exec redis redis-cli PING` | Verify Redis connectivity |
| SSL certificate expired | `openssl x509 -enddate -in cert.pem` | Run `certbot renew` |

---

## 📚 Quick Reference Guides

### For Backend Engineers

**Essential Files:**
- `apps/backend/app/main.py` - FastAPI application entry point
- `apps/backend/app/models/user.py` - User data model
- `apps/backend/app/routes/` - API endpoints
- `apps/backend/app/services/` - Business logic
- `shared/validation/validators.py` - Input validation rules

**Common Tasks:**
- Add new API endpoint: See `apps/backend/app/routes/`
- Add database migration: `docker-compose exec backend alembic revision --autogenerate -m "description"`
- Run tests: `docker-compose run --rm backend pytest`

### For DevOps Engineers

**Essential Files:**
- `docker-compose.yml` - Service definitions
- `infra/nginx/nginx.conf` - Reverse proxy configuration
- `infra/postgres/init.sql` - Database initialization
- `.env` - Environment variables (secret)

**Common Tasks:**
- Scale API instances: Add services to `docker-compose.yml`
- Update SSL certificate: Replace files in `infra/nginx/ssl/`
- Monitor performance: Access Prometheus at `localhost:9090`
- Restore from backup: See OPERATIONS_PLAYBOOK.md

### For Security Team

**Key Policies:**
- JWT tokens expire in 24 hours (access) and 7 days (refresh)
- Passwords hashed with Argon2id (not MD5, SHA1, bcrypt)
- All API requests logged (authentication, errors, data access)
- SQL injection prevented via ORM (no raw SQL)
- XSS prevented via CSP headers and React escaping
- CSRF prevented via SameSite cookies

**Security Audits:**
- Run monthly: Check for weak SSL ciphers (`nmap --script ssl-enum-ciphers`)
- Review audit logs for suspicious patterns (failed logins, rate limits)
- Test OAuth integrations quarterly
- Verify backup encryption monthly

---

## 📞 Support & Escalation

### Architecture Questions

- **FAQ**: See SYSTEM_ARCHITECTURE.md section 7 (Architectural Decision Records)
- **Scaling**: See SCALABILITY_GUIDE.md
- **Security**: See SYSTEM_ARCHITECTURE.md section 3

### Operational Issues

- **Deployment**: See OPERATIONS_PLAYBOOK.md (Troubleshooting section)
- **Performance**: See SCALABILITY_GUIDE.md (Performance Optimization)
- **Monitoring**: See OPERATIONS_PLAYBOOK.md (Monitoring & Alerts)

### Contact

- **Architecture Lead**: [To be assigned]
- **DevOps Lead**: [To be assigned]
- **Security Lead**: [To be assigned]

---

## 🔄 Continuous Improvement

### Monthly Review

- [ ] Performance metrics within targets
- [ ] No critical security alerts
- [ ] Backup restoration tested successfully
- [ ] Database maintenance completed (VACUUM, ANALYZE)
- [ ] SSL certificate renewal checked (expires in > 1 month)

### Quarterly Review

- [ ] Capacity projection updated
- [ ] Security audit completed
- [ ] OAuth integrations working
- [ ] Disaster recovery plan tested
- [ ] Documentation updated

### Annual Review

- [ ] Architecture review (any major changes?)
- [ ] Technology stack update assessment
- [ ] Scaling strategy reassessment
- [ ] Cost optimization review
- [ ] Next year capacity planning

---

## 📄 Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-10 | Initial complete architecture design |

---

**Last Updated:** 2026-06-10  
**Document Owner:** Senior Full-Stack Engineer  
**Review Status:** Ready for Technical Review
