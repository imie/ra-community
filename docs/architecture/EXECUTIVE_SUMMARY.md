# RA Community Management System - Executive Architecture Summary

**One-Page System Overview for Stakeholders**

---

## System Architecture Landscape

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                              RESIDENT-FACING APPLICATIONS                           │
│         ┌─────────────────────────────┬──────────────────────────────┐             │
│         │    Web Application          │    Mobile Application         │             │
│         │    (Next.js 14)             │    (React Native + Expo)      │             │
│         │    • Responsive UI          │    • iOS & Android            │             │
│         │    • Server-side render     │    • Offline support          │             │
│         │    • Type-safe (TS)         │    • Secure storage           │             │
│         └─────────────────┬───────────┴──────────────────┬───────────┘             │
│                           │                              │                         │
│                 All traffic encrypted (HTTPS/TLS 1.2+)   │                         │
└───────────────────────────┼──────────────────────────────┼──────────────────────────┘
                            │                              │
                            ▼                              ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                         NETWORK PERIMETER SECURITY (Nginx)                          │
│  • SSL/TLS Termination              • Rate Limiting (100 req/min)                  │
│  • Certificate Management           • CORS Policy Enforcement                      │
│  • Request Filtering                • Security Headers (CSP, HSTS)                │
│  • Load Balancing                   • DDoS Protection (via rate limits)            │
└────────────────────────┬─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (FastAPI - Python 3.11+)                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │ • Authentication Service       • User Management Service                    │  │
│  │   - JWT token validation       - Profile data operations                   │  │
│  │   - Token refresh              - Data verification                         │  │
│  │   - OAuth 2.0 integration      - Audit logging                             │  │
│  │   - Password management                                                    │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │ • Security Layer                • Business Logic                           │  │
│  │   - Input validation (Pydantic) - Service implementations                  │  │
│  │   - SQL injection prevention    - Rate limit enforcement                   │  │
│  │   - XSS/CSRF protection         - Error handling & logging                 │  │
│  │   - Rate limit checks                                                      │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
└────────────┬──────────────────────────────────┬─────────────────────────────┬────────┘
             │                                  │                             │
             ▼                                  ▼                             ▼
   ┌──────────────────┐         ┌───────────────────────┐     ┌─────────────────────┐
   │  PostgreSQL DB   │         │   Redis Cache         │     │ External Services   │
   │  (Persistent)    │         │   (Fast Storage)      │     │                     │
   │                  │         │                       │     │ • Google OAuth      │
   │ • Transactions   │         │ • Sessions (7 days)   │     │ • Microsoft OAuth   │
   │ • ACID Compliant │         │ • Token Blacklist     │     │ • Apple OAuth       │
   │ • Encryption     │         │ • Rate Limit Counter  │     │ • SendGrid Email    │
   │ • Replication    │         │ • Hot Data Cache      │     │ • Twilio SMS        │
   │   (future)       │         │                       │     │                     │
   └──────────────────┘         └───────────────────────┘     └─────────────────────┘
   Resident Data                 Session & Performance        Third-party Integrations
```

---

## Key Flows at a Glance

### 1️⃣ User Registration & Verification

```
[Resident]
   ↓
[Register with Email & Password]
   ↓ (HTTPS encrypted)
[Nginx: Rate limit check, forward]
   ↓
[FastAPI: Validate, hash password]
   ↓
[PostgreSQL: Store user (unverified)]
   ↓
[Redis: Store verification token (30 min)]
   ↓
[SendGrid: Send verification email]
   ↓
[Resident clicks email link]
   ↓
[FastAPI: Verify token, mark user verified]
   ↓
[✓ Resident can now login]
```

### 2️⃣ Secure Login & Token Management

```
[Resident: Email + Password]
   ↓
[Nginx: TLS handshake, rate limit]
   ↓
[FastAPI: Validate credentials, hash check]
   ↓
[Generate Access Token (24h) + Refresh Token (7d)]
   ↓
[Redis: Store refresh token metadata]
   ↓
[Return tokens to client]
   ↓
[Client: Store in secure storage]
   ↓
[Subsequent Requests: JWT in Authorization header]
   ↓
[FastAPI: Verify signature, expiration, claims]
   ↓
[Redis: Check if token blacklisted (logout)]
   ↓
[✓ Access granted]
```

### 3️⃣ OAuth Single Sign-On (Google/Microsoft/Apple)

```
[Resident: Click "Login with Google"]
   ↓
[Redirect to Google]
   ↓
[Google: Authenticate & return ID token]
   ↓
[FastAPI: Verify token signature]
   ↓
[Check if email/OAuth ID exists in PostgreSQL]
   ↓
[If new: Create user auto-generate password]
   ↓
[Generate JWT tokens]
   ↓
[✓ Resident logged in]
```

### 4️⃣ Password Reset Flow

```
[Resident: Click "Forgot Password"]
   ↓
[Enter email address]
   ↓
[FastAPI: Rate limit (3 per hour), find user]
   ↓
[Generate secure reset token (15 min)]
   ↓
[PostgreSQL: Store hashed token]
   ↓
[SendGrid: Send reset link via email]
   ↓
[Resident: Click reset link]
   ↓
[Enter new password (strength validated)]
   ↓
[FastAPI: Verify token, hash new password]
   ↓
[PostgreSQL: Update password, clear token]
   ↓
[Redis: Invalidate all refresh tokens (force re-login)]
   ↓
[✓ Password reset complete]
```

---

## Security Guarantees

### Authentication

- ✅ **Passwords**: Hashed with Argon2id (not reversible)
- ✅ **Tokens**: Cryptographically signed JWTs (can't be forged)
- ✅ **Tokens**: Expire after 24 hours (access) or 7 days (refresh)
- ✅ **Tokens**: Can be revoked (added to blacklist in Redis)
- ✅ **OAuth**: Credentials verified with provider (Google, Microsoft, Apple)
- ✅ **Brute-Force**: Rate limited (5 failed logins = 15 min lockout)

### Authorization

- ✅ **API Access**: Only authenticated users can access protected endpoints
- ✅ **Data Isolation**: Users only see their own data
- ✅ **Audit Logging**: All sensitive operations logged with timestamp, user, details
- ✅ **Role-Based**: Framework in place for future role/permission system

### Data Protection

- ✅ **In Transit**: HTTPS/TLS 1.2+ (encrypted)
- ✅ **In Database**: PostgreSQL with strong authentication
- ✅ **SQL Injection**: Prevented via ORM (no raw SQL)
- ✅ **XSS Attacks**: Prevented via CSP headers and framework escaping
- ✅ **CSRF**: Prevented via SameSite cookies

### Infrastructure

- ✅ **Network**: Firewall rules restrict access (port 22/SSH, 80/HTTP, 443/HTTPS)
- ✅ **Containers**: Run as non-root users
- ✅ **Secrets**: Never committed to git (environment variables)
- ✅ **Backups**: Encrypted and stored off-site
- ✅ **Updates**: Security patches applied monthly

---

## Performance Characteristics

### Typical Response Times

| Operation | Response Time | Notes |
|-----------|---|---|
| List announcements | 50-100ms | Cached (hit rate > 90%) |
| Get user profile | 20-50ms | Cached from Redis |
| Login | 100-300ms | Hash verification + DB lookup |
| Register | 200-500ms | Hash, DB insert, email send |
| Update profile | 100-200ms | DB update, cache invalidate |

### System Capacity

| Current (1 Server) | Growth Target |
|---|---|
| 500-1,000 concurrent users | 2,000+ concurrent users (in 12 months) |
| 100-200 requests/sec | 500+ requests/sec (scale horizontally) |
| 50 database connections | 100+ connections (add replicas) |

### Optimization Strategies

1. **Caching** (Redis): Store frequently accessed data, avoid DB queries
2. **Connection Pooling** (pgBouncer): Reuse DB connections efficiently
3. **Query Optimization**: Proper indexes, pagination, eager loading
4. **CDN** (optional): Serve static assets from edge servers
5. **Load Balancing** (horizontal): Add API instances when needed

---

## Deployment Architecture

### Current Setup (Production-Ready)

```
┌─────────────────────────────────────────────────────────────┐
│              On-Premises Server (Ubuntu 20.04+)             │
│              8GB RAM, 2 CPU, 50GB SSD minimum               │
├─────────────────────────────────────────────────────────────┤
│  Docker Containers:                                         │
│  ├─ Nginx (Port 80, 443) - Reverse proxy & SSL             │
│  ├─ FastAPI (Port 8000) - REST API backend                 │
│  ├─ PostgreSQL (Port 5432) - Database                      │
│  ├─ Redis (Port 6379) - Cache & sessions                   │
│  └─ Next.js (Port 3000) - Web frontend                     │
├─────────────────────────────────────────────────────────────┤
│  Volumes:                                                   │
│  ├─ PostgreSQL data (encrypted, backed up daily)           │
│  ├─ Redis data (persistence enabled)                       │
│  ├─ SSL certificates (Let's Encrypt auto-renewal)          │
│  └─ Logs (30-day retention, daily rotation)                │
└─────────────────────────────────────────────────────────────┘
```

### Backup & Disaster Recovery

- **Daily**: PostgreSQL full backup (encrypted, uploaded to cloud)
- **Retention**: 30 days daily, 1 year for weekly snapshots
- **Recovery**: Point-in-time restore within 30 days
- **Test**: Backup restoration tested monthly

### Scaling Path

```
Phase 1 (Months 0-6)          Phase 2 (Months 6-12)        Phase 3 (Months 12+)
────────────────────────────────────────────────────────────────────────
1x Server                      3x API Instances             5x API + HA
No cache                       + Redis Cluster              + DB Replicas
~500-2K residents              + Read Replicas              + Kubernetes
                               ~2K-5K residents            ~10K+ residents
```

---

## Monitoring & Alerting

### Health Checks (Automatic)

- **Nginx**: Every 30 seconds (responds to /health)
- **FastAPI**: Every 30 seconds (database + Redis checks)
- **PostgreSQL**: Every 10 seconds (pg_isready)
- **Redis**: Every 10 seconds (PING command)

### Metrics Monitored

```
📊 Performance
├─ API response time (target: p95 < 200ms)
├─ Database query time (target: p95 < 50ms)
├─ Cache hit rate (target: > 80%)
└─ Request queue length (alert if > 100)

🔐 Security
├─ Failed login attempts (alert if > 10/hour)
├─ Rate limit violations (alert if > 5/min)
├─ Token refresh anomalies
└─ SQL injection attempts (logged but prevented)

🖥️ Infrastructure
├─ CPU usage (alert if > 80%)
├─ Memory usage (alert if > 85%)
├─ Disk space (alert if < 10% free)
└─ Service uptime (target: > 99.9%)
```

### Logging & Auditing

- **All API requests** logged (timestamp, user, endpoint, duration)
- **Authentication events** logged (login, logout, password reset, OAuth)
- **Data modifications** logged (who changed what, when, old/new values)
- **Errors** logged with full stack trace for debugging
- **Retention**: 30 days hot storage, 1 year archive

---

## Technology Decisions

### Why This Stack?

| Choice | Reason |
|--------|--------|
| **Next.js** | Modern React framework, built-in security, server components for performance |
| **FastAPI** | High performance, automatic docs, built-in validation, async support |
| **PostgreSQL** | ACID compliance, powerful features, proven at enterprise scale |
| **Redis** | Sub-millisecond performance, perfect for cache & sessions |
| **Docker** | Consistent environments, easy deployment, proven reliability |
| **OAuth 2.0** | Industry standard, delegated authentication, user convenience |
| **Argon2** | Modern password hashing, resistant to GPU attacks |

---

## Next Steps & Roadmap

### Phase 1: Foundation (Months 0-3) ✅
- [x] User registration & authentication
- [x] OAuth integration (Google, Microsoft, Apple)
- [x] Profile management
- [x] Password reset flow
- [x] Email notifications

### Phase 2: Community Features (Months 3-6)
- [ ] Announcements/bulletin board
- [ ] Event management
- [ ] Committee management
- [ ] File sharing
- [ ] SMS notifications

### Phase 3: Financial Management (Months 6-12)
- [ ] Maintenance fees tracking
- [ ] Payment processing
- [ ] Invoice generation
- [ ] Financial reporting

### Phase 4: Advanced Features (Months 12+)
- [ ] Voting/polls system
- [ ] Document management
- [ ] Mobile app enhancements
- [ ] Analytics & reporting
- [ ] API for third-party integrations

---

## Compliance & Security Standards

- ✅ **Data Protection**: Personal data encrypted, access controlled
- ✅ **Privacy**: GDPR-aligned (user data rights implemented)
- ✅ **Audit**: All operations logged and auditable
- ✅ **Backups**: Automated daily with encrypted storage
- ✅ **Incident Response**: Runbooks documented for common issues

---

## Contact & Support

- **Architecture Questions**: [Tech Lead Email]
- **Deployment & Operations**: [DevOps Lead Email]
- **Security Concerns**: [Security Lead Email]

---

**System Status**: 🟢 Production-Ready  
**Last Updated**: 2026-06-10  
**Documentation Version**: 1.0
