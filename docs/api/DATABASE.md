# Database Schema & Migrations

## PostgreSQL Database Design

### Overview

The database is designed for:
- **Security**: Encrypted sensitive data, strong typing
- **Scalability**: Indices for common queries, normalized schema
- **Audit**: Timestamps and audit logs for compliance
- **Performance**: Optimized for typical queries and reporting

### Current Tables

#### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profile Information
    ic_number VARCHAR(50) UNIQUE,
    date_of_birth TIMESTAMP WITH TIME ZONE,
    place_of_birth VARCHAR(255),
    age INTEGER,
    sex VARCHAR(10),
    race VARCHAR(50),
    marital_status VARCHAR(50),
    
    -- Address
    taman_name VARCHAR(255),
    house_number VARCHAR(50),
    jalan_aman_serenia VARCHAR(255),
    
    -- Employment
    job_title VARCHAR(255),
    employer_name VARCHAR(255),
    
    -- Account Status
    is_active BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Indices
    INDEX idx_email (email),
    INDEX idx_ic_number (ic_number),
    INDEX idx_created_at (created_at)
);
```

### Planned Tables (Future)

- **audit_logs**: Track user actions
- **committees**: Committee members and roles
- **announcements**: Resident communications
- **events**: Community events
- **payments**: Maintenance fees, utilities
- **documents**: Resident documents
- **votes**: Community voting/polls

## Migrations with Alembic

### Current Migration Status

Run migrations:
```bash
# Check migration status
docker-compose exec backend alembic current

# Create new migration (after model changes)
docker-compose exec backend alembic revision --autogenerate -m "Add new table"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback to previous
docker-compose exec backend alembic downgrade -1
```

### Migration Workflow

1. Update model in `app/models/`
2. Create migration: `alembic revision --autogenerate -m "description"`
3. Review generated migration file
4. Test: `alembic upgrade head`
5. Commit migration file to version control

## Backup & Recovery

### Backup Procedure

```bash
# Create backup
docker-compose exec postgres pg_dump -U ra_user ra_db > backup_$(date +%Y%m%d).sql

# Compressed backup
docker-compose exec postgres pg_dump -U ra_user ra_db | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore from Backup

```bash
# Create clean database
docker-compose exec postgres dropdb -U ra_user ra_db
docker-compose exec postgres createdb -U ra_user ra_db

# Restore from backup
gunzip < backup_20240115.sql.gz | docker-compose exec -T postgres psql -U ra_user ra_db
```

## Query Optimization

### Common Queries

```sql
-- Get user by email
SELECT * FROM users WHERE email = 'resident@example.com';

-- Get users registered in date range
SELECT * FROM users 
WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31'
ORDER BY created_at DESC;

-- Count verified residents
SELECT COUNT(*) FROM users WHERE is_verified = true;
```

### Performance Monitoring

```bash
# Enable slow query log
docker-compose exec postgres psql -U ra_user ra_db -c "
  ALTER SYSTEM SET log_min_duration_statement = 1000;
  SELECT pg_reload_conf();
"

# Check indices
docker-compose exec postgres psql -U ra_user ra_db -c "
  SELECT schemaname, tablename, indexname 
  FROM pg_indexes 
  WHERE schemaname = 'public';
"
```

## Data Privacy & GDPR Compliance

### Sensitive Data Handling

- IC numbers encrypted in transit (HTTPS/TLS)
- Passwords hashed with bcrypt (not reversible)
- Personal data access logged via audit tables
- Data retention policies defined per table

### Right to Deletion

```sql
-- Anonymize instead of deleting (preserves referential integrity)
UPDATE users 
SET 
  full_name = 'DELETED_USER',
  email = CONCAT('deleted_', id, '@deleted.local'),
  phone_number = NULL,
  ic_number = NULL,
  date_of_birth = NULL,
  place_of_birth = NULL,
  job_title = NULL,
  employer_name = NULL,
  is_active = FALSE,
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'user-id-to-delete';
```

## Connection Pooling

### PostgreSQL Configuration

```env
# In docker-compose.yml
DATABASE_URL=postgresql://ra_user:password@postgres:5432/ra_db?connect_timeout=10&application_name=ra_backend
```

### Connection Pool Settings (SQLAlchemy)

```python
from sqlalchemy import create_engine

engine = create_engine(
    DATABASE_URL,
    pool_size=10,           # Number of connections to keep in pool
    max_overflow=20,        # Additional connections when needed
    pool_recycle=3600,      # Recycle connections every hour
    pool_pre_ping=True,     # Verify connections before using
)
```

## Performance Targets

- Query response time: < 100ms (95th percentile)
- Database CPU: < 70% peak usage
- Connection pool utilization: < 80%
- Replication lag (if applicable): < 1 second
