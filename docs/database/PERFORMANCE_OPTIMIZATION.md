# PostgreSQL Database Performance Optimization Guide

## Performance Optimization Checklist

### 1. **Index Strategy**

- [x] **Primary Lookups**
  - Email (unique, most frequent lookup)
  - IC Number (resident identifier)
  - Phone Number (contact lookup)
  - OAuth provider IDs (login optimization)

- [x] **Filtering & Status Queries**
  - `status` - For user state filtering
  - `verification_status` - For verification workflows
  - `is_verified` - Boolean filter optimization
  - `is_active` - Activity filtering
  
- [x] **Range Queries**
  - `created_at` - For date range queries
  - `updated_at` - For change tracking
  - `expires_at` (tokens) - For token expiration cleanup
  
- [x] **Composite Indexes**
  - `(user_id, action, created_at)` - Audit log queries
  - `(resource_type, resource_id, created_at)` - Resource audits
  - `(provider, provider_user_id)` - OAuth lookups
  
- [x] **Partial Indexes** (for common filtered queries)
  - Active + verified users (10% of total users typically)
  - Locked accounts (< 1% of total users)
  - Pending verification (initial user flow)
  - Failed audit logs (< 1% of audit entries)

### 2. **Query Optimization**

**Use Parameterized Queries**
```python
# Good - Prevents SQL injection
query = "SELECT * FROM users WHERE email = %s"
db.execute(query, (email,))

# Bad - SQL injection vulnerability
query = f"SELECT * FROM users WHERE email = '{email}'"
```

**Limit Result Sets**
- Use `LIMIT` and `OFFSET` for pagination
- Default page size: 20-50 records
- Max page size: 1000 records

**Avoid SELECT * Queries**
```sql
-- Bad: Returns all columns
SELECT * FROM users WHERE email = 'test@example.com'

-- Good: Select only needed columns
SELECT id, email, full_name, status FROM users WHERE email = 'test@example.com'
```

**Use Index-Only Scans**
```sql
-- Index-only scan (fast)
SELECT id, email FROM users WHERE status = 'active' AND created_at > '2024-01-01'

-- Table scan (slower)
SELECT * FROM users WHERE status = 'active' AND created_at > '2024-01-01'
```

### 3. **Connection Pooling**

**Current Implementation:**
- SQLAlchemy with `NullPool` for development
- **Production Recommendation:** Use `QueuePool` with connection pooling

```python
# Production connection pooling
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,              # Base connections
    max_overflow=40,           # Additional connections under load
    pool_pre_ping=True,        # Test connections before use
    pool_recycle=3600,         # Recycle connections after 1 hour
)
```

### 4. **Query Caching Strategy**

**Cache Layer (Redis Recommended)**
- User session data (15 min TTL)
- OAuth token data (until expiration)
- Active user lists (5 min TTL)
- Frequently accessed profiles (10 min TTL)

```python
# Cache user data on login
cache.set(f"user:{user_id}", user_data, ttl=900)

# Check cache before DB query
user = cache.get(f"user:{user_id}")
if not user:
    user = db.query(User).filter(User.id == user_id).first()
    cache.set(f"user:{user_id}", user, ttl=900)
```

### 5. **Audit Log Performance**

**Partition Strategy** (Optional for high-volume systems)
```sql
-- Create partitions by month
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE audit_logs_2024_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

**Archival Strategy**
- Keep last 90 days in `audit_logs` table
- Archive older logs to `audit_logs_archive` table
- Query archive only when needed

### 6. **Database Maintenance**

**Regular Maintenance Tasks**

```sql
-- VACUUM: Removes dead rows and optimizes table space
VACUUM ANALYZE users;
VACUUM ANALYZE audit_logs;

-- REINDEX: Rebuild indexes (if fragmented)
REINDEX TABLE users;
REINDEX TABLE audit_logs;

-- ANALYZE: Update table statistics for query planner
ANALYZE users;
ANALYZE audit_logs;
```

**Scheduled Jobs (Cron/APScheduler)**
```python
# Run daily at 2 AM
@schedule_job('0 2 * * *')
def maintenance_tasks():
    db.execute("VACUUM ANALYZE users")
    db.execute("VACUUM ANALYZE audit_logs")
    db.execute("ANALYZE")
    
    # Clean up expired tokens
    db.execute("""
        DELETE FROM password_reset_tokens 
        WHERE expires_at < NOW() - INTERVAL '7 days' 
        AND used_at IS NOT NULL
    """)
```

### 7. **Monitoring & Alerts**

**PostgreSQL Monitoring**

```sql
-- Check slow queries (queries taking > 5 seconds)
SELECT 
    query,
    mean_exec_time,
    calls,
    total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 5000
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Check unused indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check connection count
SELECT 
    datname as database,
    count(*) as connections
FROM pg_stat_activity
GROUP BY datname
ORDER BY connections DESC;
```

### 8. **Write Optimization**

**Batch Inserts**
```python
# Bad: Multiple single inserts
for user_data in users:
    db.add(User(**user_data))
    db.commit()

# Good: Batch insert
db.bulk_insert_mappings(User, users)
db.commit()
```

**Bulk Updates**
```python
# Good: Bulk update with CASE
from sqlalchemy import case, update

stmt = update(User).values(
    is_verified=case(
        (User.verification_status == 'verified', True),
        else_=False
    )
)
db.execute(stmt)
```

### 9. **Data Type Optimization**

| Field | Type | Rationale |
|-------|------|-----------|
| IDs | UUID | Distributed systems, no sequential guessing |
| Emails | VARCHAR(255) | RFC 5321 max email length |
| Passwords | VARCHAR(255) | Argon2 hashes are ~120 chars |
| Phone | VARCHAR(20) | International numbers with formatting |
| IC Number | VARCHAR(50) | Different formats across countries |
| Enums | PostgreSQL ENUM | Smaller than VARCHAR, faster comparison |
| Timestamps | TIMESTAMP | Standard datetime format, timezone-aware |
| JSON | JSONB | Better performance than JSON, indexed queries |

### 10. **Production Checklist**

- [ ] Enable SSL/TLS for database connections
- [ ] Set `application_name` in connection string for monitoring
- [ ] Configure `shared_buffers` (25% of RAM)
- [ ] Configure `effective_cache_size` (50-75% of RAM)
- [ ] Configure `maintenance_work_mem` (1GB+ for large tables)
- [ ] Configure `work_mem` (256MB for analytics queries)
- [ ] Set `random_page_cost` for SSD storage (1.1 vs 4.0 for HDD)
- [ ] Enable `log_min_duration_statement` (1000ms) for slow query logs
- [ ] Configure WAL archiving for backups
- [ ] Set up replication for high availability
- [ ] Configure point-in-time recovery (PITR)
- [ ] Monitor `pg_stat_activity` for idle connections
- [ ] Set up alerting for:
  - High CPU usage (> 80%)
  - High memory usage (> 90%)
  - Slow queries (> 5 seconds)
  - Connection count (> 80% of max)
  - Replication lag (> 1 second)

## Performance Testing

### Load Test Query Performance

```python
import time
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

engine = create_engine(DATABASE_URL)

# Test 1: Simple lookup
start = time.time()
with Session(engine) as session:
    for i in range(1000):
        user = session.query(User).filter(User.id == user_ids[i]).first()
elapsed = time.time() - start
print(f"1000 simple lookups: {elapsed:.2f}s ({1000/elapsed:.0f} ops/sec)")

# Test 2: Complex query with joins
start = time.time()
with Session(engine) as session:
    for i in range(100):
        results = session.query(User).join(OAuthCredential).filter(
            User.status == 'active',
            OAuthCredential.provider == 'google'
        ).limit(50).all()
elapsed = time.time() - start
print(f"100 complex queries: {elapsed:.2f}s")

# Test 3: Audit log queries
start = time.time()
with Session(engine) as session:
    for i in range(100):
        logs = session.query(AuditLog).filter(
            AuditLog.created_at > datetime.now() - timedelta(days=7)
        ).limit(1000).all()
elapsed = time.time() - start
print(f"100 audit log queries: {elapsed:.2f}s")
```

### Expected Performance Targets

| Operation | Expected Time | Notes |
|-----------|----------------|-------|
| User login lookup | < 10ms | Indexed by email |
| Profile fetch | < 20ms | With relationships |
| List 50 users | < 50ms | With pagination |
| Audit log query | < 100ms | 90-day range with index |
| OAuth token check | < 5ms | Indexed by provider ID |

## Horizontal Scaling Strategy

### Read Replicas
```yaml
# PostgreSQL streaming replication setup
Primary: ra-db-01 (write)
Replica: ra-db-02 (read-only)
Replica: ra-db-03 (read-only)

# Connection routing:
- Write queries → Primary
- Read queries → Round-robin to replicas
```

### Sharding Strategy (for future growth)
```python
# Shard by taman_name (housing complex)
taman_shards = {
    'Taman A': 'db-01',
    'Taman B': 'db-02',
    'Taman C': 'db-03',
}

# Route queries to correct shard
shard_db = taman_shards[user.taman_name]
db_connection = get_db_connection(shard_db)
```

## Backup & Disaster Recovery

See [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) for complete procedures.

---
**Last Updated:** 2026-06-10  
**Document Version:** 1.0
