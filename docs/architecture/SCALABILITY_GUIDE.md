# Scalability & Performance Guide

**Purpose:** Detailed strategies for scaling the system to handle growing resident base and increased traffic.

---

## Table of Contents

1. [Capacity Planning](#capacity-planning)
2. [Performance Optimization](#performance-optimization)
3. [Database Scaling](#database-scaling)
4. [API Scaling](#api-scaling)
5. [Caching Strategy](#caching-strategy)
6. [Load Testing](#load-testing)

---

## Capacity Planning

### Current Capacity (Single Server: 8GB RAM, 2 CPU)

| Metric | Capacity | Notes |
|--------|----------|-------|
| **Concurrent Users** | ~500-1,000 | Nginx + FastAPI on 2 CPUs |
| **API Requests/sec** | ~100-200 | At 200ms avg response time |
| **Database Connections** | 50-100 | With pgBouncer pooling |
| **Cache Size** | 2-4 GB | Redis on 8GB server |
| **Disk Space** | 30-50 GB | PostgreSQL + logs |

### Growth Projections

```
Year 1 (12 months):
├─ Residents: 500 → 2,000
├─ Daily Active Users: 100 → 400
├─ Storage: 5 GB → 20 GB
└─ Infrastructure: Single server

Year 2 (24 months):
├─ Residents: 2,000 → 10,000
├─ Daily Active Users: 400 → 1,500
├─ Storage: 20 GB → 100 GB
└─ Infrastructure: 3x API instances + 1x read replica

Year 3+ (36+ months):
├─ Residents: 10,000 → 50,000+
├─ Daily Active Users: 1,500 → 5,000+
├─ Storage: 100 GB → 500 GB+
└─ Infrastructure: Kubernetes or managed DBaaS
```

### Resource Estimation Formula

```
Concurrent Users = (Daily Active Users × Session Duration) / 1440 minutes

Example:
- 2,000 daily active users
- Average session duration: 30 minutes
- Concurrent users = (2,000 × 30) / 1440 = ~42 users

API Requests/sec = Concurrent Users × Requests per Minute / 60

Example:
- 42 concurrent users
- 20 requests per minute per user
- RPS = (42 × 20) / 60 = ~14 requests/sec
```

---

## Performance Optimization

### Query Optimization

#### 1. N+1 Query Problem

```python
# ❌ INEFFICIENT: Causes N+1 queries
users = db.query(User).all()  # 1 query
for user in users:
    print(user.audit_logs)      # N additional queries

# ✅ EFFICIENT: Single query with JOIN
from sqlalchemy.orm import joinedload

users = db.query(User).options(
    joinedload(User.audit_logs)
).all()  # 1 query with JOIN
```

#### 2. Index Optimization

```sql
-- Create indexes on frequently filtered columns
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Composite index for common query patterns
CREATE INDEX idx_audit_user_date ON audit_logs(user_id, created_at DESC);

-- Full-text search index
CREATE INDEX idx_full_name_tsvector ON users 
  USING GIN(to_tsvector('english', full_name));

-- Monitor index usage
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
```

#### 3. Query Pagination

```python
from fastapi import Query

@app.get("/api/users")
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get paginated list of users"""
    # Avoid loading entire table
    users = db.query(User)\
        .order_by(User.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    total = db.query(User).count()
    
    return {
        "items": users,
        "total": total,
        "skip": skip,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }
```

### Connection Pooling

```python
# In app/db/database.py
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

# Configure connection pooling
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,           # Min connections to keep in pool
    max_overflow=10,        # Additional connections if pool exhausted
    pool_recycle=3600,      # Recycle connections after 1 hour
    pool_pre_ping=True,     # Verify connection health before use
    echo=False              # Disable SQL logging in production
)
```

#### Monitor Connection Pool

```python
# Add diagnostic endpoint
@app.get("/debug/connections")
async def check_connections(db: Session = Depends(get_db)):
    pool = db.get_bind().pool
    return {
        "size": pool.size(),
        "checked_out": pool.checkedout(),
        "checked_in": pool.size() - pool.checkedout(),
        "overflow": pool.overflow()
    }
```

### Response Caching

```python
from fastapi_cache2 import FastAPICache2
from fastapi_cache2.backends.redis import RedisBackend
from fastapi_cache2.decorator import cache

# Cache GET requests for specific TTLs
@app.get("/api/announcements")
@cache(expire=300)  # Cache for 5 minutes
async def list_announcements():
    """Frequently accessed, can tolerate stale data"""
    return announcements

@app.get("/api/announcements/{id}")
@cache(expire=3600)  # Cache for 1 hour
async def get_announcement(id: UUID):
    """Specific item, can cache longer"""
    return announcement

# Invalidate cache on write
@app.post("/api/announcements")
async def create_announcement(data: AnnouncementCreate):
    announcement = create_announcement_db(data)
    # Clear list cache
    cache.delete("list_announcements")
    return announcement
```

### Database Query Tuning

```sql
-- ANALYZE query execution plan
EXPLAIN ANALYZE
SELECT u.id, u.full_name, COUNT(a.id) as audit_count
FROM users u
LEFT JOIN audit_logs a ON u.id = a.user_id
WHERE u.is_active = true
GROUP BY u.id
ORDER BY audit_count DESC
LIMIT 100;

-- Output will show:
-- Seq Scan on users (slow)
-- OR Hash Aggregate (fast if indexed)

-- Add indexes based on EXPLAIN output
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
```

---

## Database Scaling

### Phase 1: Optimization (Current)

**Timeline:** Months 0-6  
**Residents:** 500-2,000  
**Strategy:** Single server with tuning

```
┌─────────────────────────┐
│ PostgreSQL (Master)     │
│ - Optimized indexes     │
│ - Connection pooling    │
│ - Query optimization    │
│ - Backup: Daily full    │
└─────────────────────────┘
```

**Actions:**
- Optimize queries (remove N+1, add indexes)
- Implement caching layer (Redis)
- Regular maintenance (VACUUM, ANALYZE)
- Monitor performance with pg_stat_statements

### Phase 2: Read Replication (Months 6-12)

**Timeline:** Months 6-12  
**Residents:** 2,000-5,000  
**Strategy:** Master + read replica

```
Write Operations         Read Operations
        ↓                        ↓
┌──────────────┐         ┌──────────────┐
│ Primary DB   │ ──WAL→  │ Replica DB   │
│ (Port 5432)  │         │ (Port 5433)  │
└──────────────┘         └──────────────┘
                          (30 sec lag)
```

```yaml
# docker-compose.yml update
postgres:
  image: postgres:14-alpine
  environment:
    POSTGRES_INITDB_ARGS: -c max_wal_senders=3 -c wal_keep_size=1GB

postgres-replica:
  image: postgres:14-alpine
  depends_on:
    - postgres
  command: >
    -c hot_standby=on
    -c primary_conninfo='host=postgres port=5432 user=ra_user password=$DB_PASSWORD'
```

```python
# Update app to route reads to replica
from sqlalchemy import create_engine

master = create_engine(os.getenv("DATABASE_URL"))
replica = create_engine(os.getenv("DATABASE_REPLICA_URL"))

# Read operations use replica
def get_user(user_id: UUID):
    session = SessionLocal(bind=replica)
    return session.query(User).filter(User.id == user_id).first()

# Write operations use master
def create_user(user_data: UserCreate):
    session = SessionLocal(bind=master)
    user = User(**user_data.dict())
    session.add(user)
    session.commit()
    return user
```

### Phase 3: Database Cluster (Months 12+)

**Timeline:** Months 12+  
**Residents:** 5,000+  
**Strategy:** PostgreSQL Streaming Replication with failover

```
                    Automated Failover
        Master          (via Patroni)        Replica
┌──────────────┐          ↔          ┌──────────────┐
│ Primary DB   │ ←────WAL────→ │ Replica DB   │
│ Accepts All  │               │ Standby      │
│ Writes       │               │ Auto-promote │
└──────────────┘               │ if master ↓  │
       ↑                        └──────────────┘
       │
   Health Check
   Every 10 sec
```

**Migration Steps:**
1. Set up streaming replication on replica
2. Configure Patroni for automatic failover
3. Set up monitoring (Prometheus + Grafana)
4. Run failover tests monthly
5. Document runbooks for manual failover

---

## API Scaling

### Phase 1: Single Instance (Current)

```
┌─────────────────┐
│ Nginx           │
│ Load Balancer   │
└────────┬────────┘
         │
    ┌────▼────┐
    │ FastAPI │
    │ (1 CPU) │
    └─────────┘
    ~100-200 RPS
```

### Phase 2: Multiple Instances (Scale-out)

**Timeline:** When hitting 60% CPU consistently  
**Strategy:** Round-robin load balancing

```
┌──────────────────────┐
│ Nginx                │
│ Load Balancer        │
│ (Round-robin)        │
└────────┬─────┬─────┬─┘
         │     │     │
    ┌────▼┐ ┌──▼──┐ ┌▼────┐
    │API-1│ │API-2│ │API-3│
    │8001 │ │8002 │ │8003 │
    └─────┘ └─────┘ └─────┘
    ~300-600 RPS total
```

```nginx
# nginx.conf
upstream backend {
    least_conn;  # Load balance by least connections
    server backend1:8000 weight=1;
    server backend2:8000 weight=1;
    server backend3:8000 weight=1;
    
    keepalive 32;  # Keep connections alive
}

server {
    listen 443 ssl http2;
    
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
```

```yaml
# docker-compose.yml
backend1:
  build: ./apps/backend
  container_name: ra-backend-1
  ports: ["8001:8000"]
  environment:
    DATABASE_URL: postgresql://ra_user:${DB_PASSWORD}@postgres:5432/ra_community?pool_size=25

backend2:
  build: ./apps/backend
  container_name: ra-backend-2
  ports: ["8002:8000"]
  environment:
    DATABASE_URL: postgresql://ra_user:${DB_PASSWORD}@postgres:5432/ra_community?pool_size=25

backend3:
  build: ./apps/backend
  container_name: ra-backend-3
  ports: ["8003:8000"]
  environment:
    DATABASE_URL: postgresql://ra_user:${DB_PASSWORD}@postgres:5432/ra_community?pool_size=25
```

### Phase 3: Container Orchestration (Kubernetes)

**Timeline:** When managing 5+ instances becomes tedious  
**Strategy:** Kubernetes auto-scaling

```yaml
# k8s/fastapi-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ra-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ra-backend
  template:
    metadata:
      labels:
        app: ra-backend
    spec:
      containers:
      - name: backend
        image: ra-community/backend:latest
        ports:
        - containerPort: 8000
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1024Mi"
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 10
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ra-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ra-backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Caching Strategy

### Cache Layers

```
┌─────────────────────────────────────────┐
│ Layer 1: Client-side Cache              │
│ - Browser cache (images, CSS)           │
│ - 1-24 hours TTL                        │
├─────────────────────────────────────────┤
│ Layer 2: CDN Cache (optional)           │
│ - Cloudflare, Akamai                    │
│ - 1-7 days for static assets            │
├─────────────────────────────────────────┤
│ Layer 3: API Response Cache             │
│ - Redis                                 │
│ - 5-60 minutes for endpoints            │
├─────────────────────────────────────────┤
│ Layer 4: Database Query Cache           │
│ - Redis or application memory           │
│ - 1-5 minutes for hot queries           │
├─────────────────────────────────────────┤
│ Layer 5: Database Buffer Cache          │
│ - PostgreSQL shared_buffers             │
│ - Automatic, no configuration needed    │
└─────────────────────────────────────────┘
```

### Cache Invalidation Strategies

#### Time-based Invalidation

```python
# Automatic expiration after TTL
@app.get("/api/announcements")
@cache(expire=300)  # 5 minutes
async def list_announcements():
    return announcements
```

#### Event-based Invalidation

```python
@app.post("/api/announcements")
async def create_announcement(data: AnnouncementCreate, cache: Redis = Depends(get_redis)):
    # Create announcement
    announcement = create_announcement_db(data)
    
    # Invalidate cache
    await cache.delete("announcements:*")  # Wildcard delete
    
    return announcement
```

#### Manual Invalidation

```python
# Admin endpoint to clear cache
@app.post("/api/admin/cache/clear")
async def clear_cache(cache: Redis = Depends(get_redis)):
    await cache.flushdb()  # Clear entire cache
    return {"message": "Cache cleared"}
```

### Cache Hit Rate Target

```
Current Target: > 80% hit rate
├─ GET /api/announcements: 95% hit rate
├─ GET /api/users/{id}: 90% hit rate
├─ GET /api/events: 85% hit rate
└─ GET /api/committees: 70% hit rate

Monitor with:
redis-cli info stats | grep keyspace_hits
redis-cli info stats | grep keyspace_misses
hit_ratio = hits / (hits + misses)
```

---

## Load Testing

### Load Testing Scenarios

#### Scenario 1: Normal Load (Baseline)

```bash
# 100 concurrent users, 100 requests each
ab -n 10000 -c 100 http://localhost/api/announcements

# Results should show:
# - Response time p50: < 100ms
# - Response time p95: < 200ms
# - Error rate: 0%
```

#### Scenario 2: Peak Load (Rush hour)

```bash
# 1,000 concurrent users
ab -n 100000 -c 1000 http://localhost/api/announcements

# Expected:
# - Response time p50: < 300ms
# - Response time p95: < 1000ms
# - Error rate: < 0.1%
```

#### Scenario 3: Spike Load (Maintenance alert)

```bash
# 5,000 concurrent users for 30 seconds
# Then drop to 100 for 1 minute

# Use Apache JMeter or Locust for complex scenarios
```

### Load Testing with Locust

```python
# locustfile.py
from locust import HttpUser, task, between

class RAUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def list_announcements(self):
        self.client.get("/api/announcements")
    
    @task(1)
    def create_announcement(self):
        self.client.post(
            "/api/announcements",
            json={"title": "Test", "content": "Content"},
            headers={"Authorization": "Bearer token"}
        )
    
    def on_start(self):
        # Login before tasks
        self.client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "pwd"}
        )
```

```bash
# Run load test
locust -f locustfile.py --headless -u 1000 -r 50 -t 10m --host=http://localhost

# -u 1000: 1,000 concurrent users
# -r 50: ramp up 50 users per second
# -t 10m: run for 10 minutes
```

### Performance Benchmarks

| Load Level | Concurrent Users | API Response p95 | Error Rate | Database Connections |
|------------|------------------|------------------|------------|----------------------|
| **Normal** | 100 | < 200ms | 0% | 10-15 |
| **Peak** | 500 | < 500ms | < 0.5% | 25-40 |
| **Spike** | 1,000 | < 1000ms | < 1% | 50-75 |
| **Limit** | 2,000 | > 2000ms | > 5% | 100+ (pool exhausted) |

### Scaling Triggers

```
Monitor these metrics:
├─ CPU Usage
│  └─ Scale out when: Average > 70% for 5 min
├─ API Response Time
│  └─ Scale out when: p95 > 500ms for 5 min
├─ Database Connections
│  └─ Scale out when: Active > 80% of pool size
├─ Memory Usage
│  └─ Investigate when: > 80% on any instance
└─ Request Queue
   └─ Scale out when: Requests queued > 100
```

---

**Last Updated:** 2026-06-10  
**Maintainer:** Performance Engineering Team
