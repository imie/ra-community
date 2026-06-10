# RA Community Management System - Database Schema Documentation

## Quick Reference

### Table Overview

| Table | Purpose | Key Fields | Row Count (est.) |
|-------|---------|-----------|------------------|
| `users` | Resident accounts | email, ic_number, full_name, status | 100K+ |
| `password_reset_tokens` | Secure password recovery | user_id, token, expires_at | 1K |
| `email_verification_tokens` | Email verification | user_id, token, expires_at | 1K |
| `oauth_credentials` | OAuth provider integration | user_id, provider, access_token | 50K |
| `audit_logs` | Compliance & security | user_id, action, created_at | 1M+ |

### 18 Resident Data Fields

1. **Email** - Unique identifier for login
2. **Full Name** - Resident's full legal name
3. **IC Number** - Identity Card / Passport number
4. **Date of Birth** - Birth date for age verification
5. **Place of Birth** - Birth location
6. **Age** - Calculated from date of birth
7. **Sex** - Gender (M/F/Other)
8. **Race** - Ethnicity/Race for demographic tracking
9. **Marital Status** - Single/Married/Divorced/Widowed
10. **Number of Dependents** - Family size indicator
11. **Taman Name** - Housing complex name
12. **House Number** - Residential unit number
13. **Street Address** - Jalan Aman Serenia (street address)
14. **Phone Number** - Contact number
15. **Job Title** - Employment position
16. **Employer Name** - Company/Organization
17. **Employer Address** - Company location
18. **Employer Phone** - Company contact number

## Entity Relationship Diagram

```
┌─────────────────────────┐
│        users            │
├─────────────────────────┤
│ id (UUID)               │
│ email (unique)          │
│ password_hash           │
│ full_name               │
│ ic_number (unique)      │
│ ... (18 fields total)   │
│ status (enum)           │
│ is_verified (bool)      │
│ created_at (timestamp)  │
└─────────────────────────┘
         │     │
         │     │
    ┌────┘     └─────────┬──────────────────┬──────────────────┐
    │                    │                  │                  │
    ▼                    ▼                  ▼                  ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│password_     │ │email_        │ │oauth_        │ │audit_        │
│reset_tokens  │ │verification_ │ │credentials   │ │logs          │
│              │ │tokens        │ │              │ │              │
│ user_id (FK) │ │ user_id (FK) │ │ user_id (FK) │ │ user_id (FK) │
│ token        │ │ token        │ │ provider     │ │ action       │
│ expires_at   │ │ expires_at   │ │ access_token │ │ resource_id  │
│ used_at      │ │ verified_at  │ │ refresh_token│ │ created_at   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

## Key Design Decisions

### 1. **UUID Primary Keys**
- **Why:** Distributed system support, no sequential guessing vulnerabilities
- **Trade-off:** Larger indexes, slower than auto-increment
- **Mitigation:** Using PostgreSQL native UUID type

### 2. **PostgreSQL ENUM Types**
- **Why:** Enforce valid values at database level, better performance
- **Types:**
  - `user_role_enum`: admin, resident, guest
  - `user_status_enum`: pending, active, suspended, deactivated
  - `verification_status_enum`: not_started, pending, verified, rejected
  - `sex_enum`: M, F, Other
  - `race_enum`: Malay, Chinese, Indian, Eurasian, Kadazan, Iban, Other
  - `marital_status_enum`: single, married, divorced, widowed
  - `oauth_provider_enum`: google, microsoft, apple, github
  - `audit_action_enum`: create, update, delete, login, logout, password_reset, etc.

### 3. **Separate Token Tables**
- **Why:** Security - keeps sensitive tokens away from main user table
- **Benefit:** Can be purged independently, reduces user table size
- **Trade-off:** Additional joins for lookup

### 4. **Audit Logging**
- **Why:** Compliance, security monitoring, forensics
- **Captures:** WHO (user_id), WHAT (action), WHERE (resource), WHEN (timestamp)
- **Optional:** Before/after values in JSON for detailed change tracking

### 5. **OAuth Credentials Table**
- **Why:** Support multiple OAuth providers per user
- **Benefit:** Flexible authentication, future provider additions
- **Security:** Encrypted tokens with expiration tracking

## Index Strategy

### High-Priority Indexes (Unique Lookups)
```
idx_users_email              - Fast login lookup
idx_users_ic_number          - Duplicate detection, resident lookup
idx_users_google_id          - OAuth provider lookup
idx_users_microsoft_id       - OAuth provider lookup
```

### Medium-Priority Indexes (Filtering)
```
idx_users_status             - List pending/active users
idx_users_verification_status - Track verification workflow
idx_users_is_verified        - Filtered queries
idx_audit_logs_action        - Audit trail filtering
```

### Low-Priority Indexes (Range Queries)
```
idx_users_created_at         - Date range queries
idx_audit_logs_created_at    - Recent activity queries
idx_password_reset_tokens_expires_at - Token cleanup
```

### Partial Indexes (Selective Queries)
```
idx_users_active_verified    - Active users (10% of records)
idx_users_locked             - Locked accounts (< 1% of records)
idx_audit_logs_failures      - Failed operations (< 1% of records)
```

## Security Features

### 1. **Password Security**
- Passwords stored as **Argon2 hashes** (never plaintext)
- Track `last_password_change` for expiration policies
- Support password reset via email tokens

### 2. **Account Lockout**
- **Failed login tracking:** `failed_login_attempts` counter
- **Automatic lockout:** After 5 failed attempts
- **Lockout duration:** 30 minutes
- **Reset:** On successful login or admin unlock

### 3. **Token Security**
- **Password reset tokens:** 24-hour expiration, single-use
- **Email verification tokens:** 7-day expiration
- **OAuth tokens:** Expiration tracking, refresh token support

### 4. **Audit Logging**
- **All sensitive operations** logged to `audit_logs`
- **IP address tracking** for security analysis
- **Success/failure tracking** for incident response
- **Change tracking** (before/after values in JSON)

### 5. **Data Validation**
- Email format validation (regex)
- IC number format validation + check digit
- Phone number format validation
- Date of birth validation (not in future)
- Account status workflow enforcement

## Performance Targets

| Operation | Expected Time | Optimization |
|-----------|---------------|--------------|
| User login lookup | < 10ms | Email index |
| Profile fetch with relations | < 20ms | Foreign key indexes |
| List 50 users (pagination) | < 50ms | Composite indexes |
| Audit log query (7-day range) | < 100ms | Partial index |
| OAuth token verification | < 5ms | Provider ID index |
| Account lock check | < 5ms | Partial index on lock status |

## Scaling Considerations

### Vertical Scaling
- Increase database server RAM
- Enable query caching (Redis)
- Optimize slow queries
- Upgrade to NVMe SSD storage

### Horizontal Scaling
- Read replicas for SELECT queries
- Connection pooling (pgbouncer, pgpool)
- Audit log partitioning by month
- Archive old audit logs to separate table

### Archival Strategy
- Keep last 90 days in `audit_logs`
- Archive to `audit_logs_archive` table
- Query archive for compliance reports

## Compliance & Legal

### Data Retention
- **Active users:** Indefinite (until deactivation)
- **Deactivated users:** 7 years (legal requirement)
- **Audit logs:** 7 years (compliance)
- **Failed login logs:** 1 year (security)

### Data Privacy (PDPA Compliance)
- Encrypt sensitive data at rest
- SSL/TLS for data in transit
- PII access logging
- Right to deletion (soft delete recommended)
- Data export capability (COPY to CSV)

### Access Control
- Application user: `ra_user` with table permissions
- Database admin: Limited to production support
- Read replicas: Separate credentials
- Backup storage: Encrypted with separate keys

## Files in This Directory

- **SCHEMA_DDL.sql** - Complete SQL DDL statements
- **SAMPLE_QUERIES.sql** - Common query patterns
- **PERFORMANCE_OPTIMIZATION.md** - Tuning guide
- **BACKUP_RESTORE.md** - Disaster recovery procedures
- **DATA_VALIDATION_SECURITY.md** - Validation constraints and triggers
- **SCHEMA_REFERENCE.md** - This file

## Migration Files Location

```
apps/backend/migrations/
├── alembic.ini
├── env.py
├── script.py.mako
└── versions/
    ├── 001_initial_schema.py
    ├── 002_add_audit_logging.py
    └── 003_add_oauth_support.py
```

## Getting Started

### Local Development

```bash
# 1. Create PostgreSQL database
createdb ra_db

# 2. Install Python dependencies
pip install -r apps/backend/requirements-db.txt

# 3. Run migrations
cd apps/backend
alembic upgrade head

# 4. Verify schema
psql ra_db -c "\dt"  # List tables
```

### Docker Deployment

```bash
# 1. Start containers
docker-compose up -d

# 2. Verify migrations ran
docker-compose logs backend | grep "upgrade"

# 3. Connect to database
docker-compose exec postgres psql -U ra_user -d ra_db
```

## Support & Troubleshooting

- **Migration issues:** See `migrations/versions/` comments
- **Performance issues:** See PERFORMANCE_OPTIMIZATION.md
- **Data integrity:** See DATA_VALIDATION_SECURITY.md
- **Backup issues:** See BACKUP_RESTORE.md

---
**Last Updated:** 2026-06-10  
**Schema Version:** 003  
**PostgreSQL Version:** 14+  
**SQLAlchemy Version:** 2.0+
