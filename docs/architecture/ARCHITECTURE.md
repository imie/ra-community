# Architecture & Design Decisions

## System Architecture

### Monorepo Structure with Multiple Tiers

This project uses a monorepo pattern with three separate applications sharing common code and infrastructure:

```
┌─────────────────────────────────────────────────┐
│           Client Applications                    │
├──────────────┬──────────────────┬───────────────┤
│  Web (Next)  │  Mobile (React   │  Admin Portal │
│  Frontend    │  Native + Expo)  │  (Future)     │
└──────┬───────┴─────────┬────────┴───────┬───────┘
       │                 │                │
       │ HTTP/HTTPS      │                │
       ▼                 ▼                ▼
┌─────────────────────────────────────────────────┐
│      Nginx Reverse Proxy + Load Balancer        │
│  (SSL/TLS Termination, Rate Limiting, CORS)    │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌─────────────────┐   ┌──────────────────┐
│  FastAPI        │   │  Websocket       │
│  Backend        │   │  Server (Future) │
│  (Port 8000)    │   │  (Port 8001)     │
└────────┬────────┘   └──────────────────┘
         │
    ┌────┴─────┐
    ▼          ▼
┌────────┐  ┌──────────┐
│ Postgres│  │  Redis   │
│ DB     │  │  Cache   │
└────────┘  └──────────┘
```

### API Layer Design

- **RESTful API** with clear resource hierarchy
- **JWT-based authentication** for stateless operation
- **Rate limiting** to prevent abuse (100 req/hour default)
- **CORS policy** strictly enforced
- **Request/Response validation** with Pydantic schemas
- **Error handling** with consistent error codes

### Database Design Principles

1. **Normalization**: Avoid data duplication
2. **Indexing**: Fast queries on frequently accessed columns
3. **Constraints**: Enforce data integrity at database level
4. **Timestamps**: Track all data changes for audit trails
5. **Soft Deletes**: Preserve historical data (optional via flag)

### Security Architecture

```
                    Internet
                       │
                    (HTTPS)
                       │
        ┌──────────────▼──────────────┐
        │   Nginx Reverse Proxy       │
        │ • SSL/TLS Termination       │
        │ • Rate Limiting             │
        │ • CORS Enforcement          │
        │ • Security Headers (CSP)    │
        └──────────────┬──────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   FastAPI Backend         │
         │ • JWT Validation          │
         │ • Input Validation        │
         │ • SQLAlchemy ORM          │
         │ • Bcrypt Password Hash    │
         └────────┬──────────────────┘
                  │
         ┌────────▼─────────┐
         │  PostgreSQL DB   │
         │ • Encrypted      │
         │ • Parameterized  │
         │   Queries        │
         └──────────────────┘
```

## Technology Stack Rationale

### Why Next.js 14?

- **App Router**: Modern file-based routing with layouts
- **Server Components**: Better performance and security
- **Built-in Security**: CSP headers, secure environment variables
- **TypeScript**: Type-safe frontend code
- **Tailwind CSS**: Utility-first CSS for rapid UI development
- **Zero Configuration**: Get started quickly

### Why FastAPI?

- **Type-Safe**: Built-in data validation with Pydantic
- **Fast**: High performance with async/await support
- **Automatic Docs**: Swagger UI and ReDoc auto-generated
- **Security**: Built-in rate limiting, CORS, security headers
- **Python Ecosystem**: Rich libraries for data processing

### Why PostgreSQL?

- **ACID Compliance**: Guaranteed data integrity
- **JSONB Support**: Flexible nested data structures
- **Full-Text Search**: Native search capabilities
- **Proven**: Enterprise-grade reliability
- **Open Source**: No licensing costs

### Why React Native + Expo?

- **Code Sharing**: Write once, deploy to iOS and Android
- **Over-the-Air Updates**: Expo for managed updates
- **Secure Storage**: react-native-keychain for tokens
- **Native Performance**: Direct access to device features
- **Rapid Development**: Hot reload and live updates

## Scalability Considerations

### Horizontal Scaling

1. **Stateless Backend**: No session storage on server
2. **Shared Cache**: Redis for distributed caching
3. **Load Balancing**: Nginx can be fronted with more instances
4. **Database Replication**: PostgreSQL replication ready

### Performance Optimization

1. **Connection Pooling**: pgBouncer for PostgreSQL
2. **Caching Strategy**: Redis for frequently accessed data
3. **CDN Ready**: Static assets can be served via CDN
4. **Query Optimization**: Indices on common lookups

### Future Scaling

- Message Queue (RabbitMQ/Redis) for async tasks
- Search Engine (Elasticsearch) for full-text search
- Microservices: Split by domain (auth, payments, etc.)

## Security Best Practices

### Authentication & Authorization

- JWT tokens with short expiration (24 hours access, 7 days refresh)
- Refresh token rotation to prevent token reuse
- Secure token storage (httpOnly cookies for web, keychain for mobile)
- Role-based access control (RBAC) framework in place

### Data Protection

- Bcrypt hashing with 12 rounds for passwords
- HTTPS/TLS encryption in transit
- SQL injection prevention via ORM and parameterized queries
- XSS prevention via Content Security Policy headers
- CSRF protection via SameSite cookies

### Infrastructure Security

- Network isolation via Docker networks
- Non-root users in containers
- Environment-based configuration (no secrets in code)
- Rate limiting on all endpoints
- Firewall rules (UFW recommended)

## Data Models

### User Model

Core entity for all resident accounts with comprehensive profile data:

```python
User
├── Authentication
│   ├── email (unique, indexed)
│   ├── password_hash (bcrypt)
│   └── is_verified
├── Personal Information
│   ├── full_name
│   ├── date_of_birth
│   ├── place_of_birth
│   ├── ic_number (unique, indexed)
│   ├── sex
│   ├── race
│   └── marital_status
├── Contact
│   ├── phone_number
│   └── email (verified)
├── Address
│   ├── taman_name
│   ├── house_number
│   └── jalan_aman_serenia
├── Employment
│   ├── job_title
│   └── employer_name
└── Metadata
    ├── created_at
    ├── updated_at
    └── last_login
```

### Future Models

- **Committee**: Manage committee members and roles
- **Announcement**: Community communications
- **Event**: Community events and activities
- **AuditLog**: Compliance and security auditing
- **Payment**: Maintenance fees tracking
- **Document**: Resident document storage

## API Design Pattern

All endpoints follow a consistent pattern:

```
GET    /api/v1/users                    # List all users (paginated)
POST   /api/v1/users                    # Create user
GET    /api/v1/users/{id}               # Get single user
PUT    /api/v1/users/{id}               # Update user
DELETE /api/v1/users/{id}               # Delete user (soft delete)
POST   /api/v1/auth/login               # Authenticate
POST   /api/v1/auth/register            # Register new user
POST   /api/v1/auth/refresh             # Refresh token
```

## Testing Strategy

### Unit Tests

- Test individual functions in isolation
- Mock external dependencies
- Target: >80% code coverage

### Integration Tests

- Test API endpoints end-to-end
- Use test database
- Validate authentication flows

### Security Tests

- SQL injection attempts
- CSRF token validation
- Rate limiting verification

## Deployment Strategy

### Development

- Docker Compose for local development
- Hot reload for code changes
- Debug mode enabled

### Staging

- Mirror production environment
- SSL/TLS enabled
- Database backups scheduled

### Production

- Managed certificates (Let's Encrypt)
- Automated backups (daily)
- Monitoring and alerting
- Security hardening (SELinux, UFW)

## Future Enhancements

### Phase 2
- Two-factor authentication (2FA)
- Announcement system with notifications
- Event management
- File upload and document storage

### Phase 3
- Payment processing (Stripe, PayPal)
- Advanced reporting and analytics
- SMS notifications
- Community forum/messaging

### Phase 4
- Machine learning for recommendations
- Advanced scheduling
- Integration with third-party services
- Multi-language support
