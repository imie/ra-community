# RA Community Management System - Complete System Architecture

**Document Version**: 1.0  
**Last Updated**: 2026-06-10  
**Status**: Production-Ready Design

---

## Table of Contents

1. [System Architecture Diagram](#1-system-architecture-diagram)
2. [Data Flow Diagrams](#2-data-flow-diagrams)
3. [Security Architecture](#3-security-architecture)
4. [Scalability Strategy](#4-scalability-strategy)
5. [Deployment Architecture](#5-deployment-architecture-on-premises)
6. [Technology Stack Justification](#6-technology-stack-justification)
7. [Architectural Decision Records](#7-architectural-decision-records)

---

## 1. System Architecture Diagram

### 1.1 Complete System Overview

```mermaid
graph TB
    subgraph Internet["Internet/Users"]
        WEB["🌐 Web Browser<br/>Users"]
        MOBILE["📱 Mobile App<br/>iOS/Android"]
        OAUTH["OAuth Providers<br/>Google, Microsoft, Apple"]
    end
    
    subgraph DMZ["DMZ / Perimeter Security"]
        NGINX["Nginx Reverse Proxy<br/>SSL/TLS Termination<br/>Rate Limiting<br/>CORS Policy<br/>Security Headers"]
    end
    
    subgraph API_LAYER["API Gateway & Application Layer"]
        FASTAPI["FastAPI Backend<br/>- JWT Validation<br/>- Request Validation<br/>- Business Logic<br/>- Error Handling<br/>Port: 8000"]
        
        AUTH_SERVICE["Auth Service<br/>- JWT Generation<br/>- Token Refresh<br/>- OAuth Integration<br/>- Session Management"]
        
        USER_SERVICE["User Service<br/>- Profile Management<br/>- Data Verification<br/>- Audit Logging"]
        
        UTIL_LAYER["Utilities<br/>- Password Hashing<br/>- Input Validation<br/>- Error Handlers"]
    end
    
    subgraph DATA_LAYER["Data Layer"]
        PG["PostgreSQL Database<br/>- Encrypted Connections<br/>- Connection Pooling<br/>- Parameterized Queries<br/>- Audit Logs<br/>Port: 5432"]
        
        REDIS["Redis Cache<br/>- Session Cache<br/>- Token Blacklist<br/>- Rate Limit Tracking<br/>- Frequently Used Data<br/>Port: 6379"]
    end
    
    subgraph EXTERNAL_SERVICES["External Services"]
        EMAIL["Email Service<br/>SendGrid/Postmark<br/>- Verification Emails<br/>- Password Resets<br/>- Notifications"]
        
        SMS["SMS Service<br/>Twilio/Nexmo<br/>- OTP Delivery<br/>- Critical Alerts"]
    end
    
    subgraph CLIENT_APPS["Client Applications"]
        NEXTJS["Next.js Web App<br/>- Server Components<br/>- TypeScript<br/>- TailwindCSS<br/>- React Hook Form<br/>Port: 3000"]
        
        REACT_NATIVE["React Native Mobile<br/>- Expo<br/>- TypeScript<br/>- Secure Storage<br/>- Offline Support"]
    end
    
    %% Connections
    WEB -->|HTTPS| NGINX
    MOBILE -->|HTTPS| NGINX
    OAUTH -->|OAuth 2.0/OIDC| FASTAPI
    
    NGINX -->|HTTP/Internal| FASTAPI
    NGINX -->|Static Assets| NEXTJS
    
    FASTAPI --> AUTH_SERVICE
    FASTAPI --> USER_SERVICE
    FASTAPI --> UTIL_LAYER
    
    AUTH_SERVICE -->|Verify/Store| PG
    AUTH_SERVICE -->|Cache Tokens| REDIS
    
    USER_SERVICE -->|Read/Write| PG
    USER_SERVICE -->|Update Cache| REDIS
    
    FASTAPI -->|External Auth| OAUTH
    FASTAPI -->|Send Emails| EMAIL
    FASTAPI -->|Send SMS| SMS
    
    NEXTJS -->|API Calls| NGINX
    REACT_NATIVE -->|API Calls| NGINX
    
    PG -.->|Connection Pool| FASTAPI
    REDIS -.->|Cache Queries| FASTAPI
    
    style Internet fill:#e1f5ff
    style DMZ fill:#fff3e0
    style API_LAYER fill:#f3e5f5
    style DATA_LAYER fill:#e8f5e9
    style EXTERNAL_SERVICES fill:#fce4ec
    style CLIENT_APPS fill:#e0f2f1
```

### 1.2 Component Responsibilities

| Component | Responsibility | Technology |
|-----------|-----------------|------------|
| **Nginx** | SSL/TLS termination, rate limiting, CORS, reverse proxy | Nginx 1.24+ |
| **FastAPI** | REST API, business logic, authentication, validation | FastAPI 0.104+, Python 3.11+ |
| **PostgreSQL** | Persistent data storage, ACID transactions | PostgreSQL 14+ |
| **Redis** | Session cache, token blacklist, rate limiting counters | Redis 7+ |
| **Next.js** | Server-side rendering, static generation, web UI | Next.js 14+, React 18+ |
| **React Native** | Cross-platform mobile apps | React Native 0.73+, Expo 50+ |
| **External Services** | Email, SMS, OAuth providers | SendGrid/Postmark, Twilio, Google/Microsoft/Apple |

---

## 2. Data Flow Diagrams

### 2.1 User Registration Flow

```mermaid
sequenceDiagram
    actor User
    participant Web as Web Browser
    participant NGINX as Nginx
    participant API as FastAPI
    participant AUTH as Auth Service
    participant DB as PostgreSQL
    participant CACHE as Redis
    participant EMAIL as Email Service
    
    User->>Web: Fill registration form
    Web->>Web: Client-side validation (Zod)
    Web->>Web: Password strength check
    Web->>NGINX: POST /api/auth/register (HTTPS)
    
    NGINX->>API: Forward request
    API->>API: Rate limit check
    API->>API: Input validation (Pydantic)
    API->>DB: Check email uniqueness
    
    alt Email Already Exists
        DB-->>API: Error: Email exists
        API-->>NGINX: 409 Conflict
        NGINX-->>Web: Display error
        Web-->>User: Show error message
    else Email Available
        API->>API: Sanitize inputs
        API->>API: Hash password (Argon2, 12 rounds)
        API->>AUTH: Generate verification token
        AUTH->>CACHE: Store verification token (30 min expiry)
        API->>DB: Create user (is_verified=false)
        DB-->>API: Return user ID + metadata
        API->>EMAIL: Send verification email
        EMAIL-->>API: Accepted (queue/delivery)
        API-->>NGINX: 201 Created + user data
        NGINX-->>Web: Success response
        Web-->>User: Show verification prompt + resend link
    end
    
    Note over User,EMAIL: User clicks email link
    User->>EMAIL: Click verification link
    EMAIL-->>Web: Redirect to verify endpoint
    Web->>NGINX: GET /api/auth/verify?token=XXX
    NGINX->>API: Forward request
    API->>CACHE: Retrieve verification token
    CACHE-->>API: Token valid + user_id
    API->>DB: Update user (is_verified=true)
    DB-->>API: Success
    API->>CACHE: Clear verification token
    CACHE-->>API: Cleared
    API-->>NGINX: 200 OK + redirect_url
    NGINX-->>Web: Redirect to login
    Web-->>User: "Email verified! Please login"
```

### 2.2 OAuth Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant Mobile as Mobile App
    participant EXPO as Expo Auth
    participant OAUTH as OAuth Provider<br/>Google/Microsoft
    participant API as FastAPI
    participant DB as PostgreSQL
    participant CACHE as Redis
    
    User->>Mobile: Tap "Login with Google"
    Mobile->>EXPO: Trigger OAuth flow
    EXPO->>OAUTH: Request authorization
    OAUTH-->>EXPO: Authorization code + state
    EXPO->>OAUTH: Exchange code for ID token
    OAUTH-->>EXPO: ID token + access token
    EXPO-->>Mobile: Tokens received
    Mobile->>Mobile: Validate ID token signature
    Mobile->>Mobile: Extract user info (email, name, picture)
    Mobile->>API: POST /api/auth/oauth/callback
    Note over Mobile,API: Headers: Authorization: Bearer {id_token}
    
    API->>API: Verify OAuth token signature
    API->>API: Extract claims (email, provider, sub)
    
    alt User Exists (OAuth Sub Linked)
        API->>DB: Find user by oauth_id + provider
        DB-->>API: User found
        API->>API: Generate access_token (24h) + refresh_token (7d)
        API->>CACHE: Store refresh token + metadata
        API-->>Mobile: 200 OK + {access_token, refresh_token, expires_in}
    else User Exists (Email Match, New OAuth)
        API->>DB: Find user by email
        DB-->>API: User found
        API->>DB: Link OAuth provider (oauth_provider, oauth_id)
        API->>API: Generate tokens
        API->>CACHE: Store refresh token
        API-->>Mobile: 200 OK + tokens
    else First Time User
        API->>DB: Create user (email, name from OAuth, auto-generated pwd)
        DB-->>API: User created + user_id
        API->>DB: Link OAuth provider
        API->>API: Generate tokens
        API->>CACHE: Store refresh token
        API-->>Mobile: 200 OK + tokens + flags: {is_new_user: true, profile_incomplete: true}
    end
    
    Mobile->>Mobile: Store access_token in secure storage (Keychain)
    Mobile->>Mobile: Store refresh_token (Keychain, encrypted)
    Mobile->>Mobile: Redirect to home/onboarding
    User->>Mobile: User is authenticated!
```

### 2.3 Password Reset Flow

```mermaid
sequenceDiagram
    actor User
    participant Web as Web Browser
    participant NGINX as Nginx
    participant API as FastAPI
    participant DB as PostgreSQL
    participant CACHE as Redis
    participant EMAIL as Email Service
    
    User->>Web: Click "Forgot Password"
    Web->>Web: Show forgot password form
    User->>Web: Enter email address
    Web->>NGINX: POST /api/auth/forgot-password (HTTPS)
    
    NGINX->>API: Forward request
    API->>API: Rate limit check (3 attempts/hour)
    
    alt Rate Limit Exceeded
        API-->>NGINX: 429 Too Many Requests
        NGINX-->>Web: Show error
        Web-->>User: "Too many attempts. Try again in 1 hour."
    else Rate Limit OK
        API->>DB: Find user by email
        
        alt Email Not Found
            DB-->>API: User not found
            Note over API: Return success anyway (security: don't leak user existence)
            API-->>NGINX: 200 OK (generic response)
            NGINX-->>Web: "If email exists, reset link sent"
        else Email Found
            DB-->>API: User found + user_id
            API->>API: Generate reset token (cryptographically secure)
            API->>API: Hash reset token for storage
            API->>DB: Store hashed_reset_token + expiry (15 min)
            DB-->>API: Success
            API->>CACHE: Store reset_token_issued (for rate limiting)
            API->>EMAIL: Send reset email with token link
            EMAIL-->>API: Accepted
            API-->>NGINX: 200 OK
            NGINX-->>Web: "Check your email for reset link"
        end
    end
    
    Note over User,EMAIL: User receives email
    User->>EMAIL: Click reset link
    EMAIL-->>Web: Redirect to reset form with token
    Web->>Web: Extract token from URL
    Web->>Web: Show password input form
    User->>Web: Enter new password
    Web->>Web: Validate password strength (min 12 chars, complexity)
    Web->>NGINX: POST /api/auth/reset-password {token, new_password}
    
    NGINX->>API: Forward request
    API->>API: Rate limit check (5 attempts/10 min)
    API->>API: Hash token to find in DB
    API->>DB: Find reset token record
    
    alt Token Expired or Invalid
        DB-->>API: Not found or expired
        API-->>NGINX: 401 Unauthorized
        NGINX-->>Web: Error: "Link expired or invalid"
    else Token Valid
        DB-->>API: User found + reset_token valid
        API->>API: Hash new password (Argon2)
        API->>DB: Update password_hash + clear reset_token + update updated_at
        DB-->>API: Success
        API->>CACHE: Invalidate all refresh tokens for user
        API->>API: Send confirmation email
        API-->>NGINX: 200 OK
        NGINX-->>Web: Redirect to login
        Web-->>User: "Password reset successful. Login with new password."
    end
```

### 2.4 Profile Update Flow

```mermaid
sequenceDiagram
    actor User
    participant Mobile as Mobile App
    participant STORAGE as Secure Storage
    participant NGINX as Nginx
    participant API as FastAPI
    participant VALIDATION as Validation Service
    participant DB as PostgreSQL
    participant CACHE as Redis
    participant AUDIT as Audit Service
    
    User->>Mobile: Navigate to Profile
    Mobile->>STORAGE: Retrieve access_token
    STORAGE-->>Mobile: Token
    Mobile->>NGINX: GET /api/users/me (with auth header)
    Note over Mobile,NGINX: Authorization: Bearer {access_token}
    
    NGINX->>API: Forward request
    API->>API: Validate JWT token
    API->>API: Extract user_id from token
    API->>CACHE: Check token in blacklist
    
    alt Token Blacklisted
        API-->>NGINX: 401 Unauthorized
    else Token Valid
        API->>DB: Get user profile by user_id
        DB-->>API: User data
        API->>CACHE: Cache user data (5 min TTL)
        API-->>NGINX: 200 OK + user data
    end
    
    NGINX-->>Mobile: Return user profile
    Mobile->>Mobile: Display form with current data
    User->>Mobile: Update IC Number, DOB, Address
    Mobile->>Mobile: Client-side validation
    Mobile->>Mobile: Sanitize inputs
    
    User->>Mobile: Tap "Save Changes"
    Mobile->>STORAGE: Retrieve access_token
    Mobile->>NGINX: PUT /api/users/me {updated fields}
    
    NGINX->>API: Forward request
    API->>API: JWT validation
    API->>API: Extract user_id
    API->>API: Rate limit check (per-user: 50 updates/hour)
    
    alt Rate Limited
        API-->>NGINX: 429 Too Many Requests
    else Rate OK
        API->>VALIDATION: Validate IC Number (format, uniqueness)
        VALIDATION->>DB: Check IC uniqueness
        
        alt IC Already Taken
            DB-->>VALIDATION: Duplicate error
            VALIDATION-->>API: Validation error
            API-->>NGINX: 409 Conflict
        else IC Valid
            API->>VALIDATION: Validate DOB (reasonable range)
            VALIDATION->>API: Valid
            API->>VALIDATION: Sanitize address fields
            VALIDATION->>API: Valid
            
            API->>DB: Update user record
            DB-->>API: Success
            
            API->>CACHE: Clear user data cache
            CACHE-->>API: Cleared
            
            API->>AUDIT: Log profile update
            AUDIT->>DB: Create audit_log entry
            Note over AUDIT,DB: timestamp, user_id, changed_fields, old_values, new_values, ip_address
            
            API-->>NGINX: 200 OK + updated user data
        end
    end
    
    NGINX-->>Mobile: Success + updated data
    Mobile->>Mobile: Update UI
    Mobile->>User: Show "Profile saved successfully"
```

---

## 3. Security Architecture

### 3.1 Authentication & Token Management

```mermaid
graph TB
    subgraph CLIENT["Client Layer"]
        WEB_AUTH["Web: HttpOnly Cookies<br/>Secure, SameSite=Strict<br/>No JavaScript access"]
        MOBILE_AUTH["Mobile: Keychain/Secure Enclave<br/>Encrypted storage<br/>Biometric unlock support"]
    end
    
    subgraph GATEWAY["API Gateway - Nginx"]
        RATE_LIMIT["Rate Limiting<br/>- 100 req/min per IP<br/>- 1000 req/hour per user<br/>- Brute-force detection"]
        TLS["TLS/SSL Termination<br/>- TLS 1.2+ minimum<br/>- Strong ciphers only<br/>- HSTS header (1 year)"]
        CORS["CORS Policy<br/>- Whitelist domains<br/>- Credentials: include<br/>- Preflight caching"]
    end
    
    subgraph AUTH_SERVICE["Authentication Service"]
        JWT_VALIDATE["JWT Validation<br/>- Signature verification<br/>- Expiration check<br/>- Claims validation<br/>- Token blacklist check"]
        TOKEN_GEN["Token Generation<br/>- Access (24h, short-lived)<br/>- Refresh (7d, long-lived)<br/>- RS256 algorithm<br/>- Unique jti claim"]
        OAUTH_INTEG["OAuth Integration<br/>- ID token validation<br/>- Signature verification<br/>- Nonce validation<br/>- Provider key caching"]
    end
    
    subgraph PASSWORD_MGMT["Password Management"]
        HASH["Hashing<br/>- Algorithm: Argon2id<br/>- Memory: 64MB<br/>- Iterations: 3<br/>- Parallelism: 4"]
        VERIFY["Verification<br/>- Time-constant comparison<br/>- Failed attempt tracking<br/>- Account lockout (5 fails/15 min)<br/>- Exponential backoff"]
    end
    
    subgraph INPUT_VALIDATION["Input Validation & Sanitization"]
        PYDANTIC["Pydantic Schema<br/>- Type checking<br/>- Range validation<br/>- Format validation<br/>- Enum constraints"]
        SANITIZE["Data Sanitization<br/>- Remove HTML tags<br/>- Escape special chars<br/>- Trim whitespace<br/>- Normalize Unicode"]
    end
    
    subgraph DATA_PROTECTION["Data Protection"]
        SQL_PREVENT["SQL Injection Prevention<br/>- ORM (SQLAlchemy)<br/>- Parameterized queries<br/>- NO string concatenation<br/>- NO raw SQL"]
        XSS_PREVENT["XSS Prevention<br/>- CSP headers<br/>- HTML escaping<br/>- React auto-escape<br/>- No dangerouslySetInnerHTML"]
        CSRF_PROTECT["CSRF Protection<br/>- SameSite cookies<br/>- CSRF tokens for forms<br/>- Double-submit pattern<br/>- Origin validation"]
    end
    
    subgraph AUDIT["Audit & Monitoring"]
        LOG_TRACK["Audit Logging<br/>- All auth events<br/>- User modifications<br/>- Failed attempts<br/>- Data access patterns"]
        ALERT["Security Alerts<br/>- Multiple failed logins<br/>- Suspicious activity<br/>- Token anomalies<br/>- Rate limit violations"]
    end
    
    CLIENT --> GATEWAY
    GATEWAY --> AUTH_SERVICE
    AUTH_SERVICE --> PASSWORD_MGMT
    AUTH_SERVICE --> INPUT_VALIDATION
    INPUT_VALIDATION --> DATA_PROTECTION
    AUTH_SERVICE --> AUDIT
    
    style CLIENT fill:#e3f2fd
    style GATEWAY fill:#fff3e0
    style AUTH_SERVICE fill:#f3e5f5
    style PASSWORD_MGMT fill:#e8f5e9
    style INPUT_VALIDATION fill:#fce4ec
    style DATA_PROTECTION fill:#f1f8e9
    style AUDIT fill:#e0f2f1
```

### 3.2 Security Layers

#### Layer 1: Network Security (Nginx)

```
┌─────────────────────────────────────────────┐
│ SSL/TLS Termination                         │
│ • TLS 1.2+ minimum                          │
│ • Strong cipher suites (AES-GCM preferred)  │
│ • Certificate pinning support               │
│ • HSTS: max-age=31536000; includeSubDomains│
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│ Rate Limiting                               │
│ • Global: 1000 req/sec                      │
│ • Per-IP: 100 req/min                       │
│ • Per-user: 1000 req/hour                   │
│ • Endpoint-specific limits                  │
│ • Distributed rate limiting via Redis       │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│ CORS Policy                                 │
│ • Whitelist specific origins                │
│ • Allow specific methods (GET, POST, etc.)  │
│ • Expose specific headers                   │
│ • Preflight cache: 86400s                   │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│ Security Headers                            │
│ • CSP: Restrict script sources              │
│ • X-Frame-Options: DENY (prevent clickjack)│
│ • X-Content-Type-Options: nosniff           │
│ • X-XSS-Protection: 1; mode=block           │
│ • Referrer-Policy: strict-origin-when-cross│
└─────────────────────────────────────────────┘
```

#### Layer 2: Authentication (FastAPI)

```
┌─────────────────────────────────────────────┐
│ JWT Token Validation                        │
│ • Extract from Authorization header         │
│ • Verify RS256 signature                    │
│ • Check expiration                          │
│ • Validate claims (aud, iss, sub)           │
│ • Check Redis blacklist (revoked tokens)    │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│ User Identity & Permissions                 │
│ • Extract user_id from token sub claim      │
│ • Load user from DB (cached)                │
│ • Verify account status (active, verified)  │
│ • Check role-based permissions (future)     │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│ Request Context                             │
│ • Attach user info to request               │
│ • Store IP address (for audit)              │
│ • Track request ID for tracing              │
│ • Log access patterns                       │
└─────────────────────────────────────────────┘
```

#### Layer 3: Input Validation (Pydantic)

```
Request Body → Pydantic Schema
├─ Type Coercion (str → int, email format)
├─ Field Constraints (min_length, pattern, enum)
├─ Range Validation (age: 0-150, etc.)
├─ Format Validation (email, phone, IC)
├─ Custom Validators
│  ├─ Password strength (uppercase, numbers, symbols)
│  ├─ IC format (Malaysian format: YYMMDD-XXXX-XXXX)
│  ├─ Phone format (with country code)
│  └─ Address completeness
└─ Return: Validated Python object or 422 Unprocessable Entity
```

#### Layer 4: Data Access Layer (SQLAlchemy ORM)

```
All SQL queries use parameterized statements:

✓ SAFE:
    user = db.query(User).filter(User.email == email).first()
    # Generated: SELECT * FROM users WHERE email = %s; [email_value]

✗ UNSAFE (Never used):
    user = db.execute(f"SELECT * FROM users WHERE email = '{email}'")
    # Vulnerable to SQL injection
```

### 3.3 Token Lifecycle

```mermaid
graph LR
    A["User Logs In<br/>Email + Password"] -->|Valid| B["Generate Tokens"]
    B -->|Access Token<br/>24 hours<br/>Short-lived| C["Use for API Calls"]
    B -->|Refresh Token<br/>7 days<br/>Long-lived| D["Store in Secure Storage"]
    
    C -->|Token Valid| E["Request Succeeds"]
    C -->|Token Expired| F["Refresh Token Endpoint"]
    
    F -->|Refresh Token Valid| G["Issue New Access Token"]
    G -->|Success| C
    
    F -->|Refresh Token Expired| H["Redirect to Login"]
    
    D -->|User Logs Out| I["Add Token to Blacklist<br/>Redis: 7 days"]
    I -->|Any Request| J["Check Blacklist"]
    J -->|Found| K["401 Unauthorized"]
    
    style A fill:#bbdefb
    style B fill:#c5e1a5
    style C fill:#ffccbc
    style E fill:#a5d6a7
    style F fill:#ffe0b2
    style H fill:#ef9a9a
    style K fill:#ef9a9a
```

---

## 4. Scalability Strategy

### 4.1 Horizontal Scaling Architecture

```mermaid
graph TB
    subgraph LOAD_BALANCING["Load Balancing"]
        LB1["Nginx Load Balancer (Active)")
        LB2["Nginx Load Balancer (Standby)"]
        VIP["Virtual IP Address<br/>Failover: 10.0.0.1"]
    end
    
    subgraph API_INSTANCES["API Instances (Stateless)"]
        API1["FastAPI Instance 1<br/>Port: 8001"]
        API2["FastAPI Instance 2<br/>Port: 8002"]
        API3["FastAPI Instance 3<br/>Port: 8003"]
        APIX["FastAPI Instance N<br/>Port: 800N"]
    end
    
    subgraph CONNECTION_POOLING["Database Connection Pool"]
        PGBOUNCER["PgBouncer<br/>Connection Pooling<br/>- Mode: transaction<br/>- Max conn: 1000<br/>- Min pool: 50"]
    end
    
    subgraph DATA_LAYER["Data Layer"]
        PRIMARY["PostgreSQL Primary<br/>- Write operations<br/>- Master data"]
        REPLICA1["PostgreSQL Replica 1<br/>- Read-only<br/>- Reporting/Analytics"]
        REPLICA2["PostgreSQL Replica 2<br/>- Read-only<br/>- Disaster recovery"]
    end
    
    subgraph CACHE_LAYER["Cache Layer"]
        REDIS_MAIN["Redis Cluster Primary<br/>- Session store<br/>- Token cache<br/>- Rate limits"]
        REDIS_BACKUP["Redis Replica<br/>- Hot standby<br/>- Automatic failover"]
    end
    
    VIP --> LB1 & LB2
    LB1 & LB2 -->|Round-robin| API1 & API2 & API3 & APIX
    
    API1 & API2 & API3 & APIX -->|Writes| PGBOUNCER
    API1 & API2 & API3 & APIX -->|Reads| PGBOUNCER
    
    PGBOUNCER -->|Primary| PRIMARY
    PGBOUNCER -->|Replica| REPLICA1 & REPLICA2
    
    API1 & API2 & API3 & APIX -->|Cache| REDIS_MAIN
    REDIS_MAIN -->|Replicate| REDIS_BACKUP
    
    style LOAD_BALANCING fill:#e1f5fe
    style API_INSTANCES fill:#f3e5f5
    style CONNECTION_POOLING fill:#fff3e0
    style DATA_LAYER fill:#e8f5e9
    style CACHE_LAYER fill:#fce4ec
```

### 4.2 Caching Strategy

#### Level 1: Database Query Cache (5-60 min TTL)

```python
# Example: Cache user profile
@app.get("/api/users/{user_id}")
async def get_user(user_id: UUID, cache: Redis = Depends(get_redis)):
    cache_key = f"user:{user_id}"
    
    # Try cache first
    cached_user = await cache.get(cache_key)
    if cached_user:
        return json.loads(cached_user)
    
    # Cache miss: query database
    user = await db.get_user(user_id)
    
    # Store in cache (5 min expiry)
    await cache.setex(cache_key, 300, json.dumps(user.dict()))
    
    return user
```

#### Level 2: API Response Cache (1-5 min TTL)

```
GET /api/announcements (list) → Cache for 5 min
GET /api/announcements/{id} → Cache for 60 min
POST /api/announcements → Invalidate list cache

Cache invalidation strategy:
- On write operations (POST/PUT/DELETE)
- Time-based expiration (TTL)
- Manual invalidation via admin
```

#### Level 3: Session Cache (7 day TTL)

```
refresh_token_hash → {
    user_id: UUID,
    issued_at: timestamp,
    device_id: string,
    ip_address: string,
    expires_at: timestamp
}

Used for:
- Token rotation tracking
- Device session management
- Detecting suspicious activity
```

### 4.3 Database Query Optimization

#### Indexing Strategy

```sql
-- Fast lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_ic_number ON users(ic_number);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Support common queries
CREATE INDEX idx_users_is_active_created_at ON users(is_active, created_at DESC);

-- Full-text search (future)
CREATE INDEX idx_users_name_fts ON users USING GIN(to_tsvector('english', full_name));

-- Audit log queries
CREATE INDEX idx_audit_logs_user_id_created_at ON audit_logs(user_id, created_at DESC);
```

#### N+1 Query Prevention

```python
# ✗ BAD: N+1 queries
users = db.query(User).all()  # 1 query
for user in users:
    print(user.audit_logs)  # N queries (1 per user)

# ✓ GOOD: Eager loading
users = db.query(User).options(
    joinedload(User.audit_logs)
).all()  # 1 query with JOIN
```

### 4.4 Performance Targets

| Metric | Target | Monitoring |
|--------|--------|------------|
| API Response Time (p95) | < 200ms | Prometheus |
| API Response Time (p99) | < 500ms | Prometheus |
| Database Query Time (p95) | < 100ms | Slow query log |
| Cache Hit Rate | > 80% | Redis stats |
| API Availability | > 99.9% | Uptime monitoring |
| SSL Handshake | < 100ms | Browser DevTools |

---

## 5. Deployment Architecture (On-Premises)

### 5.1 Docker Compose Stack

```mermaid
graph TB
    subgraph HOST["On-Premises Server<br/>Ubuntu 20.04+ LTS"]
        subgraph DOCKER_NET["Docker Network: ra-network<br/>driver: bridge"]
            NGINX_C["Container: nginx<br/>Image: nginx:1.24-alpine<br/>Ports: 80→80, 443→443<br/>Volumes:<br/>- nginx.conf<br/>- SSL certs<br/>- Static files"]
            
            API_C["Container: backend<br/>Image: fastapi:python3.11<br/>Port: 8000<br/>Env:<br/>- DATABASE_URL<br/>- JWT_SECRET<br/>- REDIS_URL<br/>- OAuth keys<br/>Volumes:<br/>- /app code<br/>- Logs"]
            
            PG_C["Container: postgres<br/>Image: postgres:14-alpine<br/>Port: 5432<br/>Env:<br/>- POSTGRES_PASSWORD<br/>- POSTGRES_DB<br/>Volumes:<br/>- /var/lib/postgres<br/>- init.sql"]
            
            REDIS_C["Container: redis<br/>Image: redis:7-alpine<br/>Port: 6379<br/>Command: redis-server --appendonly yes<br/>Volumes:<br/>- /data"]
            
            WEB_C["Container: web<br/>Image: nextjs:node18-alpine<br/>Port: 3000<br/>Env:<br/>- NEXT_PUBLIC_API_URL<br/>- NEXTAUTH_URL<br/>Volumes:<br/>- /app code"]
        end
        
        HOST_VOLUMES["Host Volumes<br/>- /data/postgres (DB data)<br/>- /data/redis (Cache data)<br/>- /data/logs (Application logs)<br/>- /etc/ssl/certs (SSL certificates)"]
    end
    
    NGINX_C -->|Internal API| API_C
    API_C -->|TCP 5432| PG_C
    API_C -->|TCP 6379| REDIS_C
    NGINX_C -->|Static| WEB_C
    
    HOST_VOLUMES -.-> DOCKER_NET
    
    style HOST fill:#e8eaf6
    style DOCKER_NET fill:#f3e5f5
    style NGINX_C fill:#fff3e0
    style API_C fill:#e1f5fe
    style PG_C fill:#e8f5e9
    style REDIS_C fill:#fce4ec
    style WEB_C fill:#f1f8e9
```

### 5.2 Container Orchestration (docker-compose.yml)

```yaml
version: '3.8'

networks:
  ra-network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

services:
  nginx:
    image: nginx:1.24-alpine
    container_name: ra-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./infra/nginx/ssl:/etc/nginx/ssl:ro
      - ./apps/web/public:/usr/share/nginx/html:ro
    depends_on:
      - backend
      - web
    networks:
      - ra-network
    restart: always
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build:
      context: ./apps/backend
      dockerfile: Dockerfile
    container_name: ra-backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://ra_user:${DB_PASSWORD}@postgres:5432/ra_community
      - REDIS_URL=redis://redis:6379/0
      - JWT_SECRET=${JWT_SECRET}
      - JWT_ALGORITHM=HS256
      - OAUTH_GOOGLE_ID=${OAUTH_GOOGLE_ID}
      - OAUTH_GOOGLE_SECRET=${OAUTH_GOOGLE_SECRET}
      - OAUTH_MICROSOFT_ID=${OAUTH_MICROSOFT_ID}
      - OAUTH_MICROSOFT_SECRET=${OAUTH_MICROSOFT_SECRET}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
      - ENVIRONMENT=production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./apps/backend:/app
      - /data/logs:/app/logs
    networks:
      - ra-network
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    user: "app"  # Run as non-root

  postgres:
    image: postgres:14-alpine
    container_name: ra-postgres
    environment:
      - POSTGRES_DB=ra_community
      - POSTGRES_USER=ra_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=en_US.UTF-8
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - ra-network
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ra_user -d ra_community"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ra-redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - ra-network
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile.dev
      args:
        - NEXT_PUBLIC_API_URL=http://localhost:8000
    container_name: ra-web
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://localhost:8000
      - NEXTAUTH_URL=http://localhost
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    depends_on:
      - backend
    networks:
      - ra-network
    restart: always
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 5.3 Service Dependencies & Startup Order

```mermaid
graph LR
    START["Start Services"]
    
    START --> POSTGRES["PostgreSQL<br/>- Startup time: ~5s<br/>- Health check: pg_isready"]
    START --> REDIS["Redis<br/>- Startup time: ~1s<br/>- Health check: PING"]
    
    POSTGRES -->|Ready| BACKEND["FastAPI Backend<br/>- Wait for DB<br/>- Run migrations<br/>- Startup time: ~10s"]
    REDIS -->|Ready| BACKEND
    
    BACKEND -->|Ready| NGINX["Nginx Reverse Proxy<br/>- Route to backend<br/>- Serve static files<br/>- Startup time: ~2s"]
    
    START --> WEB["Next.js Web App<br/>- Build static files<br/>- Startup time: ~15s"]
    
    NGINX -->|Ready| COMPLETE["System Ready<br/>Total time: ~25-30s"]
    WEB -->|Ready| COMPLETE
    
    style START fill:#c5e1a5
    style POSTGRES fill:#b3e5fc
    style REDIS fill:#f8bbd0
    style BACKEND fill:#dcedc8
    style NGINX fill:#ffe0b2
    style WEB fill:#d1c4e9
    style COMPLETE fill:#a5d6a7
```

### 5.4 Health Checks & Monitoring

#### Health Check Endpoints

```python
# FastAPI health check
@app.get("/health")
async def health_check():
    """Lightweight health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "version": "1.0.0"
    }

@app.get("/health/detailed")
async def health_check_detailed(db: Session = Depends(get_db), redis: Redis = Depends(get_redis)):
    """Detailed health check with dependencies"""
    checks = {
        "status": "healthy",
        "database": "unknown",
        "redis": "unknown",
        "timestamp": datetime.utcnow()
    }
    
    try:
        await db.execute("SELECT 1")
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"
        checks["status"] = "unhealthy"
    
    try:
        await redis.ping()
        checks["redis"] = "healthy"
    except Exception as e:
        checks["redis"] = f"unhealthy: {str(e)}"
        checks["status"] = "unhealthy"
    
    return checks
```

#### Monitoring Points

```
┌──────────────────────────────────────────┐
│ Prometheus Metrics (port 9090)           │
├──────────────────────────────────────────┤
│ • API request rate (req/sec)             │
│ • API response times (ms)                │
│ • Error rates (4xx, 5xx)                 │
│ • Database connection pool usage         │
│ • Redis memory usage                     │
│ • PostgreSQL connection count            │
│ • Cache hit/miss rates                   │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ Loki Logs (log aggregation)              │
├──────────────────────────────────────────┤
│ • Application logs (all containers)      │
│ • Database slow queries                  │
│ • Failed authentication attempts         │
│ • Rate limit violations                  │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ Grafana Dashboards                       │
├──────────────────────────────────────────┤
│ • Real-time system overview              │
│ • Performance trends                     │
│ • Error tracking                         │
│ • Alert management                       │
└──────────────────────────────────────────┘
```

### 5.5 Backup & Disaster Recovery

```mermaid
graph LR
    subgraph DAILY["Daily (Automated)"]
        D1["PostgreSQL<br/>Full backup<br/>1 AM UTC"]
        D2["Compress &<br/>Encrypt"]
        D3["Upload to<br/>Cloud Storage<br/>30-day retention"]
    end
    
    subgraph WEEKLY["Weekly (Automated)"]
        W1["Full system<br/>snapshot<br/>Sunday 2 AM"]
        W2["Include config,<br/>certs, configs"]
        W3["Long-term<br/>storage"]
    end
    
    subgraph MONTHLY["Monthly (Manual Review)"]
        M1["Verify backup<br/>integrity"]
        M2["Test restore<br/>procedure"]
        M3["Update<br/>runbooks"]
    end
    
    D1 --> D2 --> D3
    W1 --> W2 --> W3
    D3 -.-> M1 --> M2 --> M3
    
    style DAILY fill:#c8e6c9
    style WEEKLY fill:#bbdefb
    style MONTHLY fill:#ffe0b2
```

---

## 6. Technology Stack Justification

### Frontend (Next.js 14)

**Pros:**
- ✅ App Router with layouts and server components
- ✅ Automatic code splitting and optimization
- ✅ Built-in security headers (CSP, HSTS)
- ✅ TypeScript first-class support
- ✅ Zero-config deployment

**Alternatives Considered:**
- React SPA: Slower initial load, SEO challenges
- Svelte: Smaller ecosystem, fewer enterprise libraries

### Backend (FastAPI)

**Pros:**
- ✅ Async/await for high concurrency
- ✅ Automatic API documentation (Swagger/ReDoc)
- ✅ Built-in data validation (Pydantic)
- ✅ Type hints for better DX
- ✅ High performance (competitive with Go)

**Alternatives Considered:**
- Django: Heavier, more batteries-included (unnecessary overhead)
- NodeJS: Python ecosystem better for data processing/validation

### Database (PostgreSQL)

**Pros:**
- ✅ ACID compliance for data integrity
- ✅ JSONB for semi-structured data
- ✅ Advanced features (full-text search, arrays, ranges)
- ✅ Mature, proven at scale
- ✅ Cost-effective (open source)

**Alternatives Considered:**
- MongoDB: Not suitable for regulated personal data
- MySQL: Missing advanced features (JSONB, CTEs)

### Cache (Redis)

**Pros:**
- ✅ Sub-millisecond performance
- ✅ Built-in expiration (TTL)
- ✅ Supports complex data structures
- ✅ Cluster support for high availability
- ✅ Pub/Sub for real-time features

**Alternatives Considered:**
- Memcached: No persistence, no TTL
- In-memory cache: Not distributed, loses data on restart

### Mobile (React Native + Expo)

**Pros:**
- ✅ Write once, deploy to iOS and Android
- ✅ Live updates via Expo
- ✅ Secure storage (Keychain/Secure Enclave)
- ✅ Large community and third-party libraries
- ✅ Rapid iteration cycle

**Alternatives Considered:**
- Native (Swift/Kotlin): 2x development time
- Flutter: Smaller ecosystem for business apps

---

## 7. Architectural Decision Records (ADRs)

### ADR-001: Stateless Backend with Redis Sessions

**Context:** System needs to handle thousands of concurrent users across multiple server instances.

**Decision:** Implement stateless FastAPI backend with Redis-backed session store instead of in-memory sessions.

**Rationale:**
- Enables horizontal scaling: any instance can handle any user
- Centralized session management
- Easy to implement distributed rate limiting
- Cache misses are handled gracefully

**Consequences:**
- Requires Redis infrastructure
- Additional latency for session lookups (mitigated by caching)
- Must handle Redis failures gracefully

---

### ADR-002: JWT Tokens with Redis Blacklist

**Context:** Need to support token revocation (logout, password reset, etc.) while maintaining stateless nature.

**Decision:** Use JWT tokens as primary auth mechanism with Redis blacklist for revocations.

**Rationale:**
- JWTs avoid database lookups on every request (performance)
- Redis blacklist is fast and distributed
- Token rotation strategy prevents replay attacks
- Audit trail for token lifecycle

**Consequences:**
- Blacklist check on every request (mitigated by caching)
- Token revocation is not immediate everywhere (acceptable 1-2 sec delay)

---

### ADR-003: PostgreSQL for All Persistent Data

**Context:** System handles sensitive resident data with compliance requirements.

**Decision:** Use PostgreSQL exclusively (no polyglot storage).

**Rationale:**
- ACID compliance ensures data integrity
- Supports complex queries and reporting
- Audit trail via timestamps and audit log tables
- Mature, proven at enterprise scale
- No vendor lock-in

**Consequences:**
- Slightly slower for unstructured data (acceptable)
- Must maintain schema discipline

---

### ADR-004: Nginx as Single Reverse Proxy

**Context:** Need SSL termination, rate limiting, and routing at network edge.

**Decision:** Use Nginx as the sole reverse proxy instead of application-level routing.

**Rationale:**
- Centralized security policy
- SSL termination moves cryptography outside app
- Rate limiting at network layer is more efficient
- Single point of management

**Consequences:**
- Nginx becomes critical infrastructure (mitigate with failover)
- Application complexity reduced

---

### ADR-005: Docker Compose for Development & Production

**Context:** Need standardized environments and efficient deployment.

**Decision:** Use Docker Compose (not full Kubernetes) for on-premises deployment.

**Rationale:**
- Simpler to understand and maintain for small team
- Lower operational overhead than Kubernetes
- Adequate for single-server deployment
- Easy backup and recovery
- Fast to restart services

**Consequences:**
- Single-server limitation (acceptable for current scale)
- No automatic rollouts (manual process)
- Migration path to Kubernetes if needed later

---

## Appendix: Security Checklist

- [ ] **Network**
  - [ ] SSL/TLS 1.2+ configured
  - [ ] HSTS header enabled
  - [ ] Firewall rules restrict access
  - [ ] Rate limiting configured at Nginx
  - [ ] CORS whitelist updated

- [ ] **Authentication**
  - [ ] JWT tokens use RS256 algorithm
  - [ ] Access tokens expire in 24 hours
  - [ ] Refresh tokens expire in 7 days
  - [ ] Token blacklist checked on protected endpoints
  - [ ] Password hashing uses Argon2

- [ ] **Input Validation**
  - [ ] All inputs validated with Pydantic schemas
  - [ ] SQL queries use parameterized statements only
  - [ ] HTML escaping enabled on output
  - [ ] File uploads validated (size, type)
  - [ ] XSS prevention via CSP headers

- [ ] **Data Protection**
  - [ ] Sensitive data encrypted in transit (TLS)
  - [ ] Sensitive data encrypted at rest (DB encryption)
  - [ ] Database backups encrypted
  - [ ] Audit logs retained for 90 days minimum
  - [ ] Access logs retained for 30 days

- [ ] **Deployment**
  - [ ] All containers run as non-root users
  - [ ] Secrets managed via environment variables (not in code)
  - [ ] Health checks configured for all services
  - [ ] Backup and recovery procedures tested
  - [ ] Monitoring and alerting enabled

---

**Document Author:** Senior Full-Stack Engineer  
**Review Status:** Pending Technical Review  
**Approval Status:** Pending Security Team Sign-Off
