# Architectural Diagrams & Visual References

This document contains supplementary Mermaid diagrams for the RA Community Management System architecture.

## 1. Complete System Request-Response Lifecycle

```mermaid
sequenceDiagram
    participant User as User/Client
    participant Browser as Web Browser
    participant Nginx as Nginx<br/>Reverse Proxy
    participant FastAPI as FastAPI<br/>Backend
    participant DB as PostgreSQL
    participant Redis as Redis<br/>Cache
    participant Email as Email<br/>Service

    User->>Browser: Navigate to app
    Browser->>Nginx: GET / (HTTPS)
    
    Note over Nginx: SSL/TLS handshake<br/>Rate limit check<br/>CORS validation
    
    Nginx->>FastAPI: Route to backend
    FastAPI->>FastAPI: Parse JWT from header
    FastAPI->>Redis: Check token blacklist
    
    alt Token Blacklisted
        FastAPI-->>Nginx: 401 Unauthorized
        Nginx-->>Browser: Redirect to login
    else Token Valid
        FastAPI->>DB: Verify token claims
        FastAPI->>Redis: Get cached user (5 min)
        
        alt Cache Hit
            Redis-->>FastAPI: User data (cached)
        else Cache Miss
            FastAPI->>DB: Query user by ID
            DB-->>FastAPI: User data + metadata
            FastAPI->>Redis: Store in cache (5 min)
        end
        
        FastAPI->>FastAPI: Validate permissions
        FastAPI->>DB: Execute business logic
        DB-->>FastAPI: Results
        
        FastAPI->>FastAPI: Serialize response
        FastAPI-->>Nginx: JSON response (200)
        
        Nginx->>Nginx: Add security headers
        Nginx->>Nginx: Compress (gzip)
        Nginx-->>Browser: Send response
        
        Browser->>Browser: Render page
        Browser-->>User: Display content
    end
```

## 2. Data Flow: System-Wide

```mermaid
graph LR
    subgraph CLIENT["Client Applications"]
        WEB["Next.js<br/>Web Frontend"]
        MOBILE["React Native<br/>Mobile App"]
    end
    
    subgraph NETWORK["Network Layer"]
        direction LR
        HTTPS["HTTPS/TLS<br/>Encrypted"]
    end
    
    subgraph GATEWAY["API Gateway"]
        RATE["Rate Limiting<br/>100 req/min"]
        CORS["CORS<br/>Validation"]
        AUTH["Auth Check"]
    end
    
    subgraph API["API Layer"]
        REST["RESTful Endpoints<br/>CRUD operations"]
        VALIDATE["Input Validation<br/>Pydantic schemas"]
        BUSINESS["Business Logic<br/>Services"]
    end
    
    subgraph CACHE_LAYER["Caching"]
        CACHE["Redis Cache<br/>5-60 min TTL"]
    end
    
    subgraph PERSISTENCE["Data Persistence"]
        DB["PostgreSQL<br/>Primary"]
        AUDIT["Audit Logs<br/>Track changes"]
    end
    
    CLIENT -->|API Requests| HTTPS
    HTTPS -->|Forward| GATEWAY
    
    GATEWAY -->|Validated| AUTH
    AUTH -->|Check| CACHE
    
    CACHE -->|Hit| REST
    CACHE -->|Miss| REST
    
    REST -->|Validate| VALIDATE
    VALIDATE -->|Execute| BUSINESS
    
    BUSINESS -->|Read| CACHE
    BUSINESS -->|Cached| DB
    BUSINESS -->|Write| DB
    BUSINESS -->|Log| AUDIT
    
    DB -->|Cache Response| CACHE
    
    REST -->|Response| GATEWAY
    GATEWAY -->|HTTPS| CLIENT
    
    style CLIENT fill:#e3f2fd
    style NETWORK fill:#fff3e0
    style GATEWAY fill:#f3e5f5
    style API fill:#e8f5e9
    style CACHE_LAYER fill:#fce4ec
    style PERSISTENCE fill:#e0f2f1
```

## 3. Deployment Environment Layers

```mermaid
graph TB
    subgraph INFRASTRUCTURE["On-Premises Infrastructure"]
        Server["Physical/Virtual Server<br/>Ubuntu 20.04+ LTS<br/>8GB RAM, 50GB SSD (min)"]
    end
    
    subgraph RUNTIME["Runtime Layer"]
        Docker["Docker Engine 20.10+<br/>Docker Compose 2.0+"]
    end
    
    subgraph NETWORKING["Networking"]
        VLAN["Virtual Network<br/>docker network: ra-network<br/>172.20.0.0/16"]
    end
    
    subgraph SERVICES["Services"]
        N["Nginx Container<br/>Port 80, 443"]
        A["FastAPI Container<br/>Port 8000"]
        P["PostgreSQL Container<br/>Port 5432"]
        R["Redis Container<br/>Port 6379"]
        W["Next.js Container<br/>Port 3000"]
    end
    
    subgraph VOLUMES["Persistent Volumes"]
        V1["PostgreSQL Data<br/>/var/lib/postgresql"]
        V2["Redis Data<br/>/data"]
        V3["Application Logs<br/>/var/log/ra"]
        V4["SSL Certificates<br/>/etc/ssl"]
    end
    
    subgraph MONITORING["Monitoring & Observability"]
        M1["Health Checks<br/>Every 30 seconds"]
        M2["Prometheus Metrics<br/>Port 9090"]
        M3["Loki Logs<br/>Log aggregation"]
        M4["Grafana Dashboards<br/>Port 3001"]
    end
    
    INFRASTRUCTURE --> RUNTIME
    RUNTIME --> NETWORKING
    NETWORKING --> SERVICES
    SERVICES --> VOLUMES
    SERVICES --> MONITORING
    
    style INFRASTRUCTURE fill:#ffebee
    style RUNTIME fill:#f3e5f5
    style NETWORKING fill:#e3f2fd
    style SERVICES fill:#e8f5e9
    style VOLUMES fill:#fff3e0
    style MONITORING fill:#fce4ec
```

## 4. Security Zones

```mermaid
graph TB
    subgraph ZONE1["DMZ / Public Zone"]
        INT["Internet<br/>Untrusted"]
        NGINX["Nginx Reverse Proxy<br/>- SSL Termination<br/>- Rate Limiting<br/>- Request Filtering"]
    end
    
    subgraph ZONE2["Application Zone<br/>Internal Network"]
        API["FastAPI Backend<br/>- JWT Validation<br/>- Input Validation<br/>- Business Logic"]
        AUTH["Auth Service<br/>- Token Management"]
    end
    
    subgraph ZONE3["Data Zone<br/>Restricted Access"]
        DB["PostgreSQL<br/>Encrypted Connections<br/>Strong Authentication"]
        CACHE["Redis<br/>Protected Network<br/>Authentication Enabled"]
    end
    
    INT -->|HTTPS| NGINX
    NGINX -->|HTTP (internal)| API
    
    API -->|SQL Statements<br/>Parameterized| DB
    API -->|Cache Operations<br/>Authenticated| CACHE
    
    style ZONE1 fill:#ffcdd2
    style ZONE2 fill:#fff9c4
    style ZONE3 fill:#c8e6c9
```

## 5. Error Handling Flow

```mermaid
graph TD
    A["Request Received"] --> B{Valid Format?}
    
    B -->|No| C["Return 400<br/>Bad Request"]
    B -->|Yes| D{JWT Valid?}
    
    D -->|No| E["Return 401<br/>Unauthorized"]
    E --> F["Log Security Event"]
    
    D -->|Yes| G{Rate Limited?}
    
    G -->|Yes| H["Return 429<br/>Too Many Requests"]
    H --> F
    
    G -->|No| I{Input Valid?}
    
    I -->|No| J["Return 422<br/>Unprocessable Entity<br/>Include validation errors"]
    J --> K["Log Validation Failure"]
    
    I -->|Yes| L["Execute Business Logic"]
    
    L -->|Database Error| M["Return 500<br/>Internal Server Error<br/>Log stack trace"]
    L -->|Not Found| N["Return 404<br/>Not Found"]
    L -->|Permission Denied| O["Return 403<br/>Forbidden"]
    L -->|Success| P["Return 200/201<br/>Success"]
    
    P --> Q["Send Response"]
    M --> Q
    N --> Q
    O --> Q
    C --> Q
    
    style A fill:#c8e6c9
    style Q fill:#c8e6c9
    style C fill:#ffcdd2
    style E fill:#ffcdd2
    style H fill:#ffcdd2
    style J fill:#ffcdd2
    style M fill:#ffcdd2
```

## 6. Database Connection Lifecycle

```mermaid
graph LR
    A["Application<br/>Request Pool"] -->|Request<br/>Connection| B["PgBouncer<br/>Connection<br/>Pooling"]
    
    B -->|Pool Hit| C["Reuse Connection<br/>< 1ms"]
    B -->|Pool Miss| D["Open New<br/>Connection<br/>~ 50ms"]
    
    C --> E["Execute Query"]
    D --> E
    
    E -->|Within<br/>Transaction<br/>Mode| F["PostgreSQL<br/>Primary"]
    F -->|Results| G["Return Data"]
    
    G -->|Return<br/>Connection| H["Connection<br/>Returned to Pool"]
    H -->|Keep Alive| B
    
    style A fill:#e3f2fd
    style B fill:#fff9c4
    style C fill:#c8e6c9
    style D fill:#ffccbc
    style E fill:#f3e5f5
    style F fill:#e8f5e9
    style G fill:#c8e6c9
    style H fill:#fff9c4
```

## 7. Scalability Scaling Path

```mermaid
graph LR
    subgraph PHASE1["Phase 1: Single Server<br/>Current"]
        S1["1x Nginx<br/>1x FastAPI<br/>1x PG (Primary)<br/>1x Redis<br/>~500 concurrent users"]
    end
    
    subgraph PHASE2["Phase 2: Multi-Instance<br/>Next 6 months"]
        S2["2x Nginx (LB)<br/>3x FastAPI<br/>1x PG + 1 Replica<br/>Redis Cluster<br/>~2,000 concurrent users"]
    end
    
    subgraph PHASE3["Phase 3: High Availability<br/>Next 12 months"]
        S3["3x Nginx (HA)<br/>5x FastAPI (auto-scale)<br/>PG Primary + 2 Replicas<br/>Redis Sentinel<br/>~10,000 concurrent users"]
    end
    
    subgraph PHASE4["Phase 4: Microservices<br/>Long-term"]
        S4["Separate Auth Service<br/>Separate Payment Service<br/>Message Queue (RabbitMQ)<br/>Search Service (Elasticsearch)<br/>~100,000 concurrent users"]
    end
    
    S1 -->|Add load| S2
    S2 -->|Add reliability| S3
    S3 -->|Add features| S4
    
    style PHASE1 fill:#c8e6c9
    style PHASE2 fill:#ffe0b2
    style PHASE3 fill:#ffccbc
    style PHASE4 fill:#ffcdd2
```

## 8. Token Lifecycle with Rotation

```mermaid
stateDiagram-v2
    [*] --> Generated: Login / OAuth
    
    Generated --> Active: Store securely
    
    Active --> Refreshed: Call /token/refresh
    
    Refreshed --> Active: Issue new access token
    
    Active --> Expired: 24 hours pass
    
    Expired --> ReissueRefresh: Use refresh token
    
    ReissueRefresh --> Active: New access token
    
    Active --> Blacklisted: Logout
    Active --> Blacklisted: Password reset
    Active --> Blacklisted: Account locked
    
    Blacklisted --> Invalid: Checked on every request
    
    Invalid --> Redirect: Return 401
    
    Redirect --> [*]: Redirect to login
    
    note right of Generated
        JWT Claims:
        - sub (user_id)
        - aud (audience)
        - iss (issuer)
        - exp (expiration)
        - iat (issued at)
        - jti (token ID)
    end
    
    note right of Refreshed
        Refresh token rotation:
        - Issue new refresh token
        - Invalidate old token
        - Track in Redis
    end
```

## 9. Complete Deployment Checklist

```mermaid
graph TB
    subgraph PRE_DEPLOY["Pre-Deployment"]
        P1["✓ Prepare server<br/>Ubuntu 20.04+, 8GB RAM"]
        P2["✓ Install Docker & Docker Compose"]
        P3["✓ Prepare SSL certificates<br/>Nginx, domain ready"]
        P4["✓ Configure environment variables<br/>.env file created"]
        P5["✓ Prepare OAuth credentials<br/>Google, Microsoft, Apple"]
    end
    
    subgraph DEPLOY["Deployment"]
        D1["Clone repository"]
        D2["Update .env with secrets"]
        D3["docker-compose build"]
        D4["docker-compose up -d"]
        D5["Run database migrations"]
        D6["Verify health checks"]
    end
    
    subgraph POST_DEPLOY["Post-Deployment"]
        PD1["✓ Verify all services running<br/>docker-compose ps"]
        PD2["✓ Test API endpoints<br/>curl localhost:8000/health"]
        PD3["✓ Test web app<br/>https://domain"]
        PD4["✓ Check logs for errors<br/>docker-compose logs"]
        PD5["✓ Configure monitoring<br/>Prometheus, Grafana"]
        PD6["✓ Set up backups<br/>Daily snapshots"]
        PD7["✓ Document passwords<br/>Secure password manager"]
    end
    
    subgraph ONGOING["Ongoing Operations"]
        O1["Monitor logs daily"]
        O2["Review metrics in Grafana"]
        O3["Update containers monthly"]
        O4["Test backup restoration quarterly"]
        O5["Review security logs weekly"]
    end
    
    P1 --> P2 --> P3 --> P4 --> P5
    P5 --> D1 --> D2 --> D3 --> D4 --> D5 --> D6
    D6 --> PD1 --> PD2 --> PD3 --> PD4 --> PD5 --> PD6 --> PD7
    PD7 --> O1 --> O2 --> O3 --> O4 --> O5
    
    style PRE_DEPLOY fill:#c8e6c9
    style DEPLOY fill:#fff9c4
    style POST_DEPLOY fill:#ffe0b2
    style ONGOING fill:#ffccbc
```

---

## Reference: Common Network Flows

### Successful Authentication Request

```
Client → HTTPS → Nginx (Rate Limit OK) → FastAPI
FastAPI: Validate credentials → Hash check → Generate JWT
FastAPI: Store refresh token in Redis
Client ← HTTPS ← {access_token, refresh_token, expires_in}
Client: Store tokens securely (httpOnly cookie or Keychain)
```

### API Request with Valid Token

```
Client (with access_token) → HTTPS → Nginx
Nginx: Rate limit check → CORS check
Nginx → FastAPI (internal HTTP)
FastAPI: Extract JWT from header
FastAPI: Verify signature, expiration, claims
FastAPI: Check Redis blacklist (MISS = token not revoked)
FastAPI: Load user from cache (Redis) or DB
FastAPI: Execute endpoint logic
FastAPI: Return data (cached) or query DB
Client ← HTTPS ← {data, 200 OK}
```

### Token Refresh Flow

```
Client (with refresh_token) → POST /token/refresh → Nginx
Nginx → FastAPI
FastAPI: Validate refresh token in Redis
FastAPI: Check expiration (7 days)
FastAPI: Generate new access_token (24 hours)
FastAPI: Generate new refresh_token (rotate)
FastAPI: Invalidate old refresh_token in Redis
Client ← {new_access_token, new_refresh_token}
Client: Update stored tokens
```

### Logout Flow

```
Client → DELETE /auth/logout → Nginx
Nginx → FastAPI + Authorization header
FastAPI: Extract token
FastAPI: Add token to Redis blacklist (7 day expiry)
FastAPI: Remove refresh token from Redis
Client ← {200 OK}
Client: Clear local token storage
Next request → 401 Unauthorized → Redirect to login
```

---

**Last Updated:** 2026-06-10  
**Maintainer:** Architecture Team
