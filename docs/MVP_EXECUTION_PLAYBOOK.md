# MVP Execution Playbook: Phase 1 (Weeks 1-4)

**Target Launch Date:** End of Week 4  
**Team:** 4.5 FTE (Backend, Frontend, DevOps, QA, PM)  
**Success Criteria:** Zero critical security issues, 99%+ test coverage, <200ms p50 response time

---

## Week 1: Foundation & Authentication

### Day 1-2: Project Setup & Infrastructure

**Backend Setup**
```bash
# Initialize backend project
cd apps/backend
python -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate on Windows
pip install -r requirements.txt

# Initialize database
alembic init migrations

# Create main app structure
touch app/main.py
touch app/api/__init__.py
touch app/db/database.py
touch app/utils/jwt.py
touch app/utils/password.py
```

**Frontend Setup**
```bash
# Initialize frontend project
cd apps/web
npm install
npm run dev
```

**Deliverables:**
- [ ] Backend running on localhost:8000 (health check endpoint)
- [ ] Frontend running on localhost:3000
- [ ] PostgreSQL running in docker-compose
- [ ] All team members can run `docker-compose up`
- [ ] Initial commit to main branch

---

### Day 3-5: JWT & Password Utilities

**Backend Tasks:**
- [ ] Implement JWT token generation (15min access, 7d refresh)
- [ ] Implement JWT token validation + refresh logic
- [ ] Implement Argon2id password hashing
- [ ] Implement password strength validation (12+ chars, complexity)
- [ ] Write unit tests (target: 100% coverage)
- [ ] Implement rate limiting middleware

**Unit Tests to Write:**
```python
# tests/test_jwt.py
- test_jwt_encode_valid_payload
- test_jwt_decode_valid_token
- test_jwt_decode_expired_token
- test_jwt_decode_invalid_signature
- test_jwt_refresh_token

# tests/test_password.py
- test_password_hash_creates_different_hashes
- test_password_verify_correct_password
- test_password_verify_incorrect_password
- test_password_strength_validation_min_length
- test_password_strength_validation_complexity
```

**Deliverables:**
- [ ] JWT utilities working (can encode/decode tokens)
- [ ] Password utilities working (can hash/verify)
- [ ] Rate limiting middleware active
- [ ] Unit test coverage 100% for critical utilities
- [ ] Code review passed

---

### Day 5: Database Schema (Initial)

**Create Database Migration:**
```sql
-- migrations/versions/001_initial_schema.py
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
```

**Deliverables:**
- [ ] Migration files created
- [ ] Tables created in staging database
- [ ] Migration rollback tested
- [ ] Indexes created

---

### Week 1 Exit Criteria (Go / No-Go)

**MUST HAVE (Blocking):**
- ✅ Backend runs locally
- ✅ Frontend runs locally
- ✅ JWT utilities tested + working
- ✅ Password utilities tested + working
- ✅ Database accessible
- ✅ Rate limiting middleware active

**NICE TO HAVE (Can defer):**
- CORS middleware tested
- Frontend auth context initialized

---

## Week 2: Registration & Email Verification

### Day 8-10: Email Verification Flow

**Backend Tasks:**
- [ ] Create email verification token generation logic
- [ ] Integrate email service (SMTP or SendGrid)
- [ ] Create email verification endpoint (POST /auth/verify-email)
- [ ] Create resend verification email endpoint
- [ ] Create migration for email_verification_tokens table
- [ ] Write integration tests

**Email Templates:**
```
Subject: Verify your email address
Body: Click here to verify: https://api.example.com/auth/verify-email?token={token}
```

**Deliverables:**
- [ ] Email sending working (test email sent)
- [ ] Verification tokens generated + validated
- [ ] Tokens expire after 24 hours
- [ ] Resend functionality working
- [ ] Integration tests passing

---

### Day 10-12: Google OAuth Integration

**Backend Tasks:**
- [ ] Set up Google OAuth credentials (ClientID, ClientSecret)
- [ ] Implement OAuth authorization code flow
- [ ] Create callback endpoint (POST /auth/google-callback)
- [ ] Handle user creation / linking
- [ ] Create migration for oauth_accounts table
- [ ] Write integration tests

**Google OAuth Flow:**
1. User clicks "Sign in with Google"
2. Redirected to Google authorization endpoint
3. User grants permission
4. Google redirects to callback with authorization code
5. Backend exchanges code for access token
6. Backend fetches user info from Google
7. Create account or link to existing user
8. Issue JWT tokens to user

**Deliverables:**
- [ ] Google OAuth working end-to-end
- [ ] Duplicate email detection working
- [ ] Accounts can be linked or created
- [ ] Integration tests passing

---

### Day 12-14: Registration Endpoint & Frontend Forms

**Backend - POST /auth/register**
```python
Request:
{
  "email": "resident@example.com",
  "password": "SecurePassword123!",
  "password_confirm": "SecurePassword123!",
  "captcha_token": "h_captcha_token_here"
}

Response (201 Created):
{
  "message": "Verification email sent",
  "email": "resident@example.com",
  "next_step": "verify_email"
}

Errors:
- 400: Invalid email format
- 400: Password too weak
- 409: Email already exists
- 400: CAPTCHA invalid
- 429: Rate limited
```

**Frontend Tasks:**
- [ ] Create login form (email, password, forgot password link)
- [ ] Create signup form (email, password, password confirm, CAPTCHA)
- [ ] Add form validation (real-time error feedback)
- [ ] Integrate with backend API (POST /auth/register, /auth/login)
- [ ] Create email verification page (link or code input)
- [ ] Create password reset flow

**Frontend Components:**
```
LoginForm.tsx
├─ Email input (validation)
├─ Password input (validation)
├─ Forgot password link
├─ Submit button (loading state)
└─ Error display

SignupForm.tsx
├─ Email input (validation)
├─ Password input (strength indicator)
├─ Password confirm input
├─ hCaptcha component
├─ Terms & conditions checkbox
├─ Submit button (loading state)
└─ Error display

EmailVerification.tsx
├─ Verification code input OR
├─ Link click auto-verification
├─ Resend button
└─ Redirect to login

PasswordReset.tsx
├─ Email input
├─ Reset link sent confirmation
├─ New password input
└─ Password reset success
```

**Deliverables:**
- [ ] Registration endpoint working
- [ ] All form validations working
- [ ] API integration complete
- [ ] Error handling + user feedback
- [ ] E2E tests for full signup flow

---

### Week 2 Exit Criteria (Go / No-Go)

**MUST HAVE (Blocking):**
- ✅ Registration endpoint working
- ✅ Email verification working
- ✅ Google OAuth working
- ✅ Frontend signup form functional
- ✅ E2E signup test passing
- ✅ No auth vulnerabilities (basic security review)

**NICE TO HAVE (Can defer to Phase 2):**
- Microsoft/Apple OAuth
- 2FA

---

## Week 3: Profile Management

### Day 15-18: Profile Endpoints & IC Validation

**Backend - Profile Endpoints**

```python
# GET /api/v1/profiles/me
# Returns user's profile (requires JWT auth)

# PUT /api/v1/profiles/me
Request:
{
  "full_name": "John Doe",
  "phone": "+60123456789",
  "date_of_birth": "1990-01-15",
  "ic_number": "900115-01-1234",
  "taman_name": "Taman Aman Serenia",
  "house_no": "12A",
  "job_title": "Software Engineer",
  "employer": "Tech Company",
  "sex": "M",
  "race": "Malay",
  "marital_status": "Single",
  "dependents": 0
}

Response (200 OK):
{
  "id": 123,
  "email": "resident@example.com",
  "full_name": "John Doe",
  ...
  "updated_at": "2026-06-10T10:30:00Z"
}
```

**IC Number Validation (Malaysian Format)**
```python
# Format: YYMMDD-SSLLLD
# YY: Year of birth (00-99)
# MM: Month (01-12)
# DD: Day (01-31)
# SS: State code (01-16)
# LLL: Local registration code
# D: Check digit

def validate_ic_number(ic: str) -> bool:
    # Remove dash if present
    ic = ic.replace('-', '')
    
    # Must be 12 digits
    if len(ic) != 12:
        return False
    
    # Check format
    if not ic.isdigit():
        return False
    
    # Validate check digit using algorithm...
    # (Complex algorithm, see: https://en.wikipedia.org/wiki/Malaysian_identity_card#Format)
    
    return True
```

**Backend Tasks:**
- [ ] Create resident_profiles table (migration)
- [ ] Implement IC number validation
- [ ] Create GET /api/v1/dropdowns/taman (list tamans)
- [ ] Create GET /api/v1/dropdowns/districts (list districts)
- [ ] Implement profile update logic with audit logging
- [ ] Write integration tests

**Deliverables:**
- [ ] Profile endpoints working
- [ ] IC validation correct
- [ ] Dropdown data cached + served <50ms
- [ ] Audit logs recording all updates
- [ ] Integration tests passing

---

### Day 18-20: Frontend Profile Form & View

**Frontend - Profile Page**
```tsx
// pages/profile.tsx
- GET profile on page load
- Display form with all fields
- Show field validation errors (real-time)
- Show submission status (loading, success, error)
- Show last updated timestamp
- Implement save button
- Redirect to dashboard on success
```

**UI Components:**
```
ProfileForm.tsx
├─ Full Name input (required, 255 chars max)
├─ Email display (read-only)
├─ Phone input (formatted, required)
├─ Date of Birth picker (ISO 8601)
├─ IC Number input (formatted, unique)
├─ Taman dropdown (required)
├─ House Number input (required)
├─ Job Title input
├─ Employer input
├─ Sex dropdown (M/F/Other)
├─ Race dropdown (Malay/Chinese/Indian/Other)
├─ Marital Status dropdown
├─ Dependents counter input
├─ Submit button
└─ Error display
```

**Frontend Tasks:**
- [ ] Create profile form component (all fields)
- [ ] Implement form validation (client-side)
- [ ] Integrate with backend API (GET + PUT)
- [ ] Add loading/success/error states
- [ ] Create responsive design (mobile, tablet, desktop)
- [ ] Write E2E tests

**Deliverables:**
- [ ] Profile form renders correctly
- [ ] API integration working
- [ ] Form validation working
- [ ] Mobile responsive
- [ ] E2E tests passing

---

### Day 20-21: Admin Essentials

**Backend - Admin Endpoints**

```python
# Admin-only endpoints (require JWT + admin role)

# GET /api/v1/admin/users?page=1&limit=20
# List all residents (paginated)

# GET /api/v1/admin/users/{user_id}
# View user profile + audit logs

# POST /api/v1/admin/users/{user_id}/disable
# Disable user account

# POST /api/v1/admin/users/{user_id}/enable
# Re-enable user account

# GET /api/v1/admin/users/export?format=csv
# Export all users as CSV
```

**Frontend - Admin Dashboard**
```tsx
// pages/admin/dashboard.tsx
- Display total resident count
- Display new registrations (last 7 days)
- Display system health status (API, DB, cache)
- Show basic metrics
- Responsive grid layout
```

**Frontend - User Management**
```tsx
// pages/admin/users.tsx
- List all residents (paginated table)
- Search by email, name, IC number
- Filter by status (active, disabled)
- Disable/enable buttons
- Export CSV button
- View individual user profile
```

**Backend Tasks:**
- [ ] Create admin user role
- [ ] Implement role-based access control (basic)
- [ ] Create admin endpoints (list, view, disable, enable, export)
- [ ] Implement CSV export
- [ ] Write authorization tests

**Frontend Tasks:**
- [ ] Create admin dashboard
- [ ] Create user list page (paginated, searchable)
- [ ] Create disable/enable functionality
- [ ] Implement CSV download

**Deliverables:**
- [ ] Admin dashboard working
- [ ] User list functional
- [ ] CSV export working
- [ ] Role-based access control enforced
- [ ] Authorization tests passing

---

### Week 3 Exit Criteria (Go / No-Go)

**MUST HAVE (Blocking):**
- ✅ Profile endpoints working
- ✅ IC number validation working
- ✅ Profile form functional
- ✅ Admin dashboard working
- ✅ E2E profile flow test passing
- ✅ Audit logging working

---

## Week 4: Deployment & Go-Live Preparation

### Day 22-24: Containerization & Deployment

**Docker Setup:**
- [ ] Backend Dockerfile (Python, FastAPI, Uvicorn)
- [ ] Frontend Dockerfile (Node.js, Next.js, production build)
- [ ] docker-compose.yml (all services)
- [ ] nginx reverse proxy config
- [ ] PostgreSQL initialization script

**docker-compose.yml Example:**
```yaml
version: '3.9'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: ra_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: ra_community
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ra_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./apps/backend
    environment:
      DATABASE_URL: postgresql://ra_user:secure_password@postgres:5432/ra_community
      JWT_SECRET: your-secret-key-here
      JWT_ALGORITHM: HS256
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000/api
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./infra/nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend

volumes:
  postgres_data:
```

**Tasks:**
- [ ] Create Dockerfiles
- [ ] Test local docker-compose
- [ ] Create nginx config (HTTP + HTTPS)
- [ ] Create SSL certificates (self-signed for dev, CA for prod)
- [ ] Create environment variable template (.env.example)
- [ ] Create deployment scripts

**Deliverables:**
- [ ] All services run in docker-compose
- [ ] Services communicate correctly
- [ ] Health checks passing
- [ ] Can stop/restart without data loss

---

### Day 24-26: Security Hardening & Testing

**Security Checklist:**
- [ ] OWASP Top 10 review
  - A01: Broken Access Control → JWT auth, role checks
  - A02: Cryptographic Failures → Argon2id, SSL/TLS
  - A03: Injection → Parameterized queries, input validation
  - A04: Insecure Design → Security by design review
  - A05: Security Misconfiguration → Env vars, no hardcoded secrets
  - A06: Vulnerable & Outdated Components → Dependency check
  - A07: Authentication Failures → Password strength, rate limiting
  - A08: Data Integrity → Input validation, CSRF tokens
  - A09: Logging & Monitoring → Audit logs, monitoring setup
  - A10: SSRF → Rate limiting, URL validation

- [ ] Penetration Testing (Manual Focus: Auth)
  - Test brute-force login (rate limiting check)
  - Test SQL injection (parameterized queries verify)
  - Test XSS attacks (frontend input encoding)
  - Test CSRF attacks (token validation)
  - Test password reset flow (token security)
  - Test OAuth flow (state validation)

**Automated Security Scanning:**
- [ ] SAST (Static Application Security Testing)
- [ ] Dependency scanning (for vulnerable packages)
- [ ] Container scanning (docker images)

**Performance Testing:**
- [ ] Load test: 1,000 concurrent users
- [ ] Measure response times (p50, p95, p99)
- [ ] Check database connection pool
- [ ] Monitor memory + CPU usage
- [ ] Identify + fix bottlenecks

**Test Results Targets:**
- Response time p50: <100ms
- Response time p95: <500ms
- Response time p99: <1000ms
- Error rate: <0.1%
- Throughput: 1,000+ req/sec

**Tasks:**
- [ ] Run automated security scanning
- [ ] Perform manual penetration testing
- [ ] Fix all critical/high severity issues
- [ ] Run load tests
- [ ] Optimize slow endpoints

**Deliverables:**
- [ ] Security audit report (zero critical issues)
- [ ] Penetration test report
- [ ] Performance test report + optimization recommendations
- [ ] All issues resolved

---

### Day 26-27: Testing & Quality Assurance

**Test Coverage Requirements:**
- Backend: 95%+ code coverage
- Frontend: 80%+ coverage
- E2E: All critical user flows

**Test Types:**
- Unit tests (utilities, services)
- Integration tests (API endpoints, database)
- E2E tests (complete user flows)
- Security tests (auth, injection, CSRF)
- Performance tests (load, latency)

**Critical User Flows to Test (E2E):**
1. Signup → Email verification → Login
2. Forgot password → Password reset → Login
3. Google OAuth signup + login
4. Resident profile creation + update
5. Admin: List users → Disable user → Re-enable user
6. Admin: Export CSV

**Testing Checklist:**
- [ ] Unit tests: 95%+ backend, 80%+ frontend
- [ ] Integration tests: All API endpoints tested
- [ ] E2E tests: All critical flows tested
- [ ] Security tests: Auth flow penetration tests
- [ ] Performance tests: Load test + response time verification
- [ ] Browser testing: Chrome, Firefox, Safari, Edge (latest versions)
- [ ] Mobile testing: Responsive design on iPad, iPhone, Android

**Tasks:**
- [ ] Write/run unit tests
- [ ] Write/run integration tests
- [ ] Write/run E2E tests (Cypress, Playwright)
- [ ] Run security tests (manual + automated)
- [ ] Run performance tests
- [ ] Browser compatibility testing
- [ ] Fix failing tests

**Deliverables:**
- [ ] Test results report (all tests passing)
- [ ] Code coverage report
- [ ] Performance baseline metrics

---

### Day 27-28: Documentation & Deployment

**API Documentation**
- [ ] OpenAPI/Swagger schema generated
- [ ] All endpoints documented (parameters, responses, errors)
- [ ] Authentication examples provided
- [ ] Rate limiting documented
- [ ] Error codes reference

**Deployment Documentation**
- [ ] On-premises deployment guide
- [ ] Environment variables guide
- [ ] Database setup guide
- [ ] SSL/TLS setup guide
- [ ] Backup & restore procedures
- [ ] Troubleshooting guide
- [ ] Admin user manual

**Admin Documentation**
- [ ] Dashboard overview
- [ ] User management guide
- [ ] CSV export guide
- [ ] Disable/enable user procedures
- [ ] Incident response procedures

**Architecture Documentation**
- [ ] System architecture diagram
- [ ] Database schema documentation
- [ ] API architecture diagram
- [ ] Security architecture overview
- [ ] Deployment architecture

**Tasks:**
- [ ] Generate OpenAPI docs
- [ ] Write deployment guide
- [ ] Write troubleshooting guide
- [ ] Write admin manual
- [ ] Create architecture diagrams
- [ ] Document all configuration options

**Deliverables:**
- [ ] API docs complete + accessible
- [ ] Deployment guide complete + tested
- [ ] Admin manual complete
- [ ] Architecture diagrams created

---

### Day 28: Go-Live Preparation

**Pre-Launch Checklist (24 hours before launch):**

**System Checks:**
- [ ] All health checks passing (API, DB, Frontend, nginx)
- [ ] SSL/TLS certificate valid (not expired)
- [ ] Email service functional (test email sent)
- [ ] Database backups current
- [ ] Monitoring & alerting configured
- [ ] Logging aggregation working
- [ ] Rate limiting rules active

**Code Quality:**
- [ ] All tests passing (unit, integration, E2E)
- [ ] Code review completed (all PRs merged)
- [ ] No console errors/warnings
- [ ] No deprecated APIs used
- [ ] Version tags applied (e.g., v0.1.0-mvp)

**Security:**
- [ ] Secrets NOT in code (all in environment variables)
- [ ] HTTPS configured + working
- [ ] JWT secrets secure + rotated
- [ ] Database passwords strong
- [ ] API keys secured
- [ ] CORS policy correct

**Documentation:**
- [ ] Deployment documentation reviewed
- [ ] Runbook procedures tested
- [ ] Rollback procedure documented + tested
- [ ] Incident response plan in place
- [ ] Admin trained + ready

**Communications:**
- [ ] Status page created/updated
- [ ] Admin notification templates ready
- [ ] Support team trained + on-call
- [ ] Launch announcement prepared
- [ ] User onboarding guide ready

**Backup Plan:**
- [ ] Database backup successful
- [ ] Application code tagged in Git
- [ ] Rollback procedure tested (restoration from backup)
- [ ] Contact list for escalation

**Tasks:**
- [ ] Final system verification
- [ ] Backup verification
- [ ] Rollback test
- [ ] Team briefing (launch day procedures)
- [ ] Communication channels open (Slack, email, phone)

**Deliverables:**
- [ ] Go-live approved by product + tech leads
- [ ] All systems verified as ready
- [ ] Team briefed + procedures documented
- [ ] Backup + rollback tested

---

## Week 4 Exit Criteria & Go-Live Readiness

### Go / No-Go Criteria

**MUST HAVE (Blocking):**
- ✅ All tests passing (unit, integration, E2E, security)
- ✅ Zero critical security vulnerabilities
- ✅ Docker deployment working on clean Linux VM
- ✅ Database backups tested + restored successfully
- ✅ Performance tests meeting targets
- ✅ Documentation complete
- ✅ Team trained + ready
- ✅ Rollback procedure tested

**NICE TO HAVE (Can defer post-launch):**
- Extended penetration testing
- Performance optimization (Phase 2)
- Advanced monitoring (Phase 2)

---

## Launch Day Timeline

```
T-4 hours:   Final system verification, all checks passing
T-2 hours:   Team briefing, confirm rollback procedure
T-1 hour:    Traffic directed to production, monitor closely
T+0 hours:   Launch! Application live to residents
T+1 hour:    Verify user registrations working
T+4 hours:   Continue monitoring, gather feedback
T+24 hours:  Post-launch review + retrospective
```

---

## Post-Launch Activities (Week 5+)

**Immediate (24 hours):**
- Monitor for critical errors (error rate, response time)
- Verify user registrations + email verification working
- Collect user feedback via Slack/email
- Track key metrics (signup rate, login success)

**Short-term (Week 5):**
- Fix critical bugs (within 4 hours)
- Optimize slow endpoints (if needed)
- Gather more user feedback
- Plan Phase 2 features

**Medium-term (Weeks 6-8):**
- Continue monitoring + optimization
- Plan Phase 2 sprint
- Gather roadmap feedback from residents
- Prepare for Phase 2 kickoff

---

## Success Metrics (End of Week 4)

| Metric | Target | Result | Status |
|--------|--------|--------|--------|
| Uptime | 99.5% | TBD | 🔄 |
| Response Time (p95) | <500ms | TBD | 🔄 |
| Error Rate | <0.1% | TBD | 🔄 |
| Test Coverage | 95%+ | TBD | 🔄 |
| Security Issues | 0 critical | TBD | 🔄 |
| User Registrations | 50+ | TBD | 🔄 |
| Documentation | 100% | TBD | 🔄 |

---

## Contact & Escalation

**Product Manager:** [Name] - [Email] - [Phone]  
**Tech Lead:** [Name] - [Email] - [Phone]  
**Security Lead:** [Name] - [Email] - [Phone]  
**DevOps Lead:** [Name] - [Email] - [Phone]  

**Escalation Procedure:**
1. Report issue in Slack #alerts channel
2. Notify tech lead if critical (error rate >5%, downtime, security breach)
3. Invoke incident response procedure if major outage

---

*Playbook Version: 1.0*  
*Last Updated: 2026-06-10*  
*Ready for Execution: Week 1 (2026-06-10)*
